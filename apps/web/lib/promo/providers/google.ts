import "server-only";
import { encrypt, siteUrl } from "../secure";
import type { ChannelTarget, PostMedia } from "../types";

/**
 * Google (구글 비즈니스 프로필 소식 + 유튜브 업로드)
 * 필요한 환경변수: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET
 * Google Cloud에서 Business Profile API(접근 신청 필요)와 YouTube Data API v3를 켜고,
 * OAuth 동의 화면 검수를 받아야 가맹점이 쓸 수 있다.
 */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
  "openid",
  "email",
];

export const googleRedirectUri = () => `${siteUrl()}/api/promo/oauth/google/callback`;

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
}

export function googleAuthUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type TokenRes = { access_token: string; expires_in: number; refresh_token?: string; id_token?: string; error?: string; error_description?: string };

async function tokenRequest(body: Record<string, string>): Promise<TokenRes> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
      ...body,
    }),
    cache: "no-store",
  });
  const j = (await res.json()) as TokenRes;
  if (!res.ok || j.error) throw new Error(`Google: ${j.error_description ?? j.error ?? res.statusText}`);
  return j;
}

export async function googleRefresh(refreshToken: string) {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

async function gget<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  const j = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(`Google: ${j.error?.message ?? res.statusText}`);
  return j;
}

export async function googleExchange(code: string) {
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: googleRedirectUri() });
  const targets: ChannelTarget[] = [];
  const notes: string[] = [];
  let email = "Google 계정";
  try {
    const info = await gget<{ email?: string }>("https://openidconnect.googleapis.com/v1/userinfo", t.access_token);
    email = info.email ?? email;
  } catch {}

  // 비즈니스 프로필 지점
  try {
    const accts = await gget<{ accounts?: { name: string; accountName?: string }[] }>(
      "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      t.access_token
    );
    for (const a of accts.accounts ?? []) {
      const locs = await gget<{ locations?: { name: string; title?: string }[] }>(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${a.name}/locations?readMask=name,title&pageSize=100`,
        t.access_token
      );
      for (const l of locs.locations ?? []) {
        // 소식 게시 API는 accounts/{a}/locations/{l} 형식을 쓴다
        targets.push({ id: `${a.name}/${l.name}`, name: l.title ?? l.name, type: "gbp_location" });
      }
    }
  } catch (e) {
    notes.push("비즈니스 프로필: " + (e instanceof Error ? e.message : String(e)));
  }

  // 유튜브 채널
  try {
    const ch = await gget<{ items?: { id: string; snippet?: { title?: string } }[] }>(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      t.access_token
    );
    for (const c of ch.items ?? []) targets.push({ id: c.id, name: c.snippet?.title ?? c.id, type: "yt_channel" });
  } catch (e) {
    notes.push("유튜브: " + (e instanceof Error ? e.message : String(e)));
  }

  return {
    account_label: email,
    access_token_enc: encrypt(t.access_token),
    refresh_token_enc: t.refresh_token ? encrypt(t.refresh_token) : null,
    token_expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
    meta: { targets, notes },
  };
}

export async function publishGbp(token: string, locationName: string, text: string, media: PostMedia[]) {
  const image = media.find((m) => m.type === "image");
  const res = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/localPosts`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      languageCode: "ko",
      topicType: "STANDARD",
      summary: text.slice(0, 1500),
      ...(image ? { media: [{ mediaFormat: "PHOTO", sourceUrl: image.url }] } : {}),
    }),
    cache: "no-store",
  });
  const j = (await res.json().catch(() => ({}))) as { name?: string; searchUrl?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(`Google 비즈니스 프로필: ${j.error?.message ?? res.statusText}`);
  return { externalId: j.name ?? null, externalUrl: j.searchUrl ?? null };
}

export async function publishYoutube(token: string, title: string, description: string, tags: string[], media: PostMedia[]) {
  const video = media.find((m) => m.type === "video");
  if (!video) throw new Error("유튜브는 영상 파일이 있어야 올릴 수 있어요.");
  const file = await fetch(video.url, { cache: "no-store" });
  if (!file.ok) throw new Error("첨부 영상을 불러오지 못했어요.");
  const bytes = await file.arrayBuffer();

  const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-length": String(bytes.byteLength),
      "x-upload-content-type": file.headers.get("content-type") ?? "video/mp4",
    },
    body: JSON.stringify({
      snippet: { title: title.slice(0, 100), description: description.slice(0, 5000), tags: tags.map((t) => t.replace(/^#/, "")).slice(0, 15), categoryId: "27" },
      status: { privacyStatus: "public", selfDeclaredMadeForKids: false },
    }),
    cache: "no-store",
  });
  const uploadUrl = init.headers.get("location");
  if (!init.ok || !uploadUrl) {
    const j = (await init.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(`유튜브: ${j.error?.message ?? init.statusText}`);
  }
  const up = await fetch(uploadUrl, {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": file.headers.get("content-type") ?? "video/mp4" },
    body: bytes,
    cache: "no-store",
  });
  const j = (await up.json().catch(() => ({}))) as { id?: string; error?: { message?: string } };
  if (!up.ok || !j.id) throw new Error(`유튜브 업로드 실패: ${j.error?.message ?? up.statusText}`);
  return { externalId: j.id, externalUrl: `https://www.youtube.com/watch?v=${j.id}` };
}
