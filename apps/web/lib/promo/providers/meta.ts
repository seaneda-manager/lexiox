import "server-only";
import { decrypt, encrypt, siteUrl } from "../secure";
import type { ChannelTarget, PostMedia } from "../types";

/**
 * Meta (페이스북 페이지 + 인스타그램 프로페셔널 계정)
 * 필요한 환경변수: META_APP_ID, META_APP_SECRET, (선택) PROMO_META_GRAPH_VERSION
 * 앱에 필요한 권한: pages_show_list, pages_read_engagement, pages_manage_posts,
 *                  instagram_basic, instagram_content_publish, business_management
 * 실제 가맹점이 쓰려면 Meta 앱 검수(Advanced Access)가 필요하다.
 */
const V = () => process.env.PROMO_META_GRAPH_VERSION || "v23.0";
const GRAPH = () => `https://graph.facebook.com/${V()}`;
export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
];

export const metaRedirectUri = () => `${siteUrl()}/api/promo/oauth/meta/callback`;

export function metaConfigured(): boolean {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

export function metaAuthUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    redirect_uri: metaRedirectUri(),
    state,
    scope: META_SCOPES.join(","),
    response_type: "code",
  });
  return `https://www.facebook.com/${V()}/dialog/oauth?${p}`;
}

async function graph<T>(path: string, init?: RequestInit & { query?: Record<string, string> }): Promise<T> {
  const url = new URL(path.startsWith("http") ? path : `${GRAPH()}${path}`);
  Object.entries(init?.query ?? {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { ...init, cache: "no-store" });
  const j = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok || j.error) throw new Error(`Meta: ${j.error?.message ?? res.statusText}`);
  return j;
}

type PageRow = { id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } };

/** OAuth code → 장기 사용자 토큰 → 페이지 토큰(만료 없음)과 연결된 인스타 계정 목록 */
export async function metaExchange(code: string) {
  const short = await graph<{ access_token: string }>("/oauth/access_token", {
    query: {
      client_id: process.env.META_APP_ID ?? "",
      client_secret: process.env.META_APP_SECRET ?? "",
      redirect_uri: metaRedirectUri(),
      code,
    },
  });
  const long = await graph<{ access_token: string; expires_in?: number }>("/oauth/access_token", {
    query: {
      grant_type: "fb_exchange_token",
      client_id: process.env.META_APP_ID ?? "",
      client_secret: process.env.META_APP_SECRET ?? "",
      fb_exchange_token: short.access_token,
    },
  });
  const me = await graph<{ name?: string }>("/me", { query: { fields: "name", access_token: long.access_token } });
  const pages = await graph<{ data: PageRow[] }>("/me/accounts", {
    query: { fields: "id,name,access_token,instagram_business_account{id,username}", access_token: long.access_token, limit: "100" },
  });

  const targets: ChannelTarget[] = [];
  const pageTokens: Record<string, string> = {};
  for (const p of pages.data ?? []) {
    pageTokens[p.id] = encrypt(p.access_token);
    targets.push({ id: p.id, name: p.name, type: "fb_page" });
    if (p.instagram_business_account?.id) {
      // 인스타 게시는 연결된 페이지 토큰으로 한다
      pageTokens[p.instagram_business_account.id] = encrypt(p.access_token);
      targets.push({
        id: p.instagram_business_account.id,
        name: `@${p.instagram_business_account.username ?? p.name}`,
        type: "ig_user",
      });
    }
  }
  return {
    account_label: me.name ?? "Meta 계정",
    access_token_enc: encrypt(long.access_token),
    token_expires_at: long.expires_in ? new Date(Date.now() + long.expires_in * 1000).toISOString() : null,
    meta: { targets, pageTokens },
  };
}

function pageToken(meta: Record<string, unknown>, targetId: string): string {
  const enc = (meta.pageTokens as Record<string, string> | undefined)?.[targetId];
  if (!enc) throw new Error("이 페이지·계정의 권한이 없어요. 채널을 다시 연결해주세요.");
  return decrypt(enc);
}

export async function publishFacebook(meta: Record<string, unknown>, pageId: string, text: string, media: PostMedia[]) {
  const token = pageToken(meta, pageId);
  const image = media.find((m) => m.type === "image");
  if (image) {
    const r = await graph<{ id: string; post_id?: string }>(`/${pageId}/photos`, {
      method: "POST",
      query: { access_token: token, url: image.url, caption: text },
    });
    const id = r.post_id ?? r.id;
    return { externalId: id, externalUrl: `https://www.facebook.com/${id}` };
  }
  const r = await graph<{ id: string }>(`/${pageId}/feed`, { method: "POST", query: { access_token: token, message: text } });
  return { externalId: r.id, externalUrl: `https://www.facebook.com/${r.id}` };
}

async function waitContainer(id: string, token: string) {
  for (let i = 0; i < 20; i++) {
    const s = await graph<{ status_code?: string }>(`/${id}`, { query: { fields: "status_code", access_token: token } });
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error("인스타그램이 미디어 처리에 실패했어요.");
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("인스타그램 미디어 처리가 오래 걸려요. 다음 실행 때 다시 시도해요.");
}

export async function publishInstagram(meta: Record<string, unknown>, igUserId: string, caption: string, media: PostMedia[]) {
  const token = pageToken(meta, igUserId);
  if (!media.length) throw new Error("인스타그램은 이미지나 영상이 있어야 올릴 수 있어요.");
  let creationId: string;
  if (media.length === 1) {
    const m = media[0];
    const q: Record<string, string> =
      m.type === "video"
        ? { media_type: "REELS", video_url: m.url, caption, access_token: token }
        : { image_url: m.url, caption, access_token: token };
    creationId = (await graph<{ id: string }>(`/${igUserId}/media`, { method: "POST", query: q })).id;
    await waitContainer(creationId, token);
  } else {
    const children: string[] = [];
    for (const m of media.slice(0, 10)) {
      const q: Record<string, string> =
        m.type === "video"
          ? { media_type: "VIDEO", video_url: m.url, is_carousel_item: "true", access_token: token }
          : { image_url: m.url, is_carousel_item: "true", access_token: token };
      const c = await graph<{ id: string }>(`/${igUserId}/media`, { method: "POST", query: q });
      await waitContainer(c.id, token);
      children.push(c.id);
    }
    creationId = (
      await graph<{ id: string }>(`/${igUserId}/media`, {
        method: "POST",
        query: { media_type: "CAROUSEL", children: children.join(","), caption, access_token: token },
      })
    ).id;
    await waitContainer(creationId, token);
  }
  const pub = await graph<{ id: string }>(`/${igUserId}/media_publish`, {
    method: "POST",
    query: { creation_id: creationId, access_token: token },
  });
  const info = await graph<{ permalink?: string }>(`/${pub.id}`, { query: { fields: "permalink", access_token: token } }).catch(
    () => ({ permalink: undefined })
  );
  return { externalId: pub.id, externalUrl: info.permalink ?? null };
}
