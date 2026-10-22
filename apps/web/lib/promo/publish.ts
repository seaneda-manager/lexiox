import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHANNEL_KINDS } from "./constants";
import { todayKST } from "./dates";
import { decrypt, encrypt } from "./secure";
import { publishFacebook, publishInstagram } from "./providers/meta";
import { googleRefresh, publishGbp, publishYoutube } from "./providers/google";
import type { Channel, Post } from "./types";

const MAX_ATTEMPTS = 3;

type ConnRow = {
  id: string;
  provider: "meta" | "google";
  access_token_enc: string | null;
  refresh_token_enc: string | null;
  token_expires_at: string | null;
  status: string;
  meta: Record<string, unknown>;
};

/** 채널이 자동 업로드 대상인지 (연결 + 대상 계정 선택 완료) */
export function isAutoChannel(ch: Pick<Channel, "kind" | "connection_id" | "target"> | null | undefined): boolean {
  return !!(ch && CHANNEL_KINDS[ch.kind]?.provider && ch.connection_id && ch.target?.id);
}

async function googleAccessToken(svc: SupabaseClient, c: ConnRow): Promise<string> {
  if (c.access_token_enc && c.token_expires_at && new Date(c.token_expires_at).getTime() > Date.now() + 60_000) {
    return decrypt(c.access_token_enc);
  }
  if (!c.refresh_token_enc) throw new Error("구글 연결이 만료됐어요. 채널을 다시 연결해주세요.");
  try {
    const t = await googleRefresh(decrypt(c.refresh_token_enc));
    await svc
      .from("promo_connections")
      .update({
        access_token_enc: encrypt(t.access_token),
        token_expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
        status: "active",
      })
      .eq("id", c.id);
    return t.access_token;
  } catch (e) {
    await svc.from("promo_connections").update({ status: "expired" }).eq("id", c.id);
    throw e;
  }
}

function caption(p: Post): string {
  return [p.body, p.hashtags.join(" ")].filter(Boolean).join("\n\n");
}

/** 게시물 1개를 연결된 채널로 올린다. 결과를 promo_posts에 기록한다. service role로 호출. */
export async function publishPost(svc: SupabaseClient, post: Post, ch: Channel): Promise<{ ok: boolean; error?: string }> {
  // 다른 실행이 동시에 잡지 않도록 상태를 먼저 바꾼다
  const { data: claimed } = await svc
    .from("promo_posts")
    .update({ status: "publishing", publish_attempts: ((post as Post & { publish_attempts?: number }).publish_attempts ?? 0) + 1 })
    .eq("id", post.id)
    .in("status", ["scheduled", "failed"])
    .select("id");
  if (!claimed?.length) return { ok: false, error: "이미 처리 중이에요." };

  try {
    if (!isAutoChannel(ch)) throw new Error("자동 업로드가 연결되지 않은 채널이에요.");
    const { data: conn } = await svc.from("promo_connections").select("*").eq("id", ch.connection_id).maybeSingle();
    if (!conn || conn.status === "revoked") throw new Error("채널 연결이 해제됐어요. 다시 연결해주세요.");
    const c = conn as ConnRow;
    const target = ch.target!;
    const media = Array.isArray(post.media) ? post.media : [];

    let r: { externalId: string | null; externalUrl: string | null };
    if (ch.kind === "facebook") r = await publishFacebook(c.meta, target.id, [post.title, caption(post)].filter(Boolean).join("\n\n"), media);
    else if (ch.kind === "insta") r = await publishInstagram(c.meta, target.id, caption(post), media);
    else if (ch.kind === "gbp") r = await publishGbp(await googleAccessToken(svc, c), target.id, [post.title, post.body].filter(Boolean).join("\n\n"), media);
    else if (ch.kind === "youtube") r = await publishYoutube(await googleAccessToken(svc, c), post.title, post.body, post.hashtags, media);
    else throw new Error("자동 업로드를 지원하지 않는 채널이에요.");

    await svc
      .from("promo_posts")
      .update({
        status: "posted",
        posted_at: new Date().toISOString(),
        external_id: r.externalId,
        external_url: r.externalUrl,
        publish_error: null,
      })
      .eq("id", post.id);
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await svc.from("promo_posts").update({ status: "failed", publish_error: msg.slice(0, 500) }).eq("id", post.id);
    return { ok: false, error: msg };
  }
}

/** 예약 시간이 된 승인 게시물을 자동 업로드한다 (cron) */
export async function publishDue(svc: SupabaseClient) {
  const today = todayKST();
  const nowKst = new Date(Date.now() + 9 * 3600e3).toISOString().slice(11, 16); // HH:MM

  const { data: posts } = await svc
    .from("promo_posts")
    .select("*")
    .in("status", ["scheduled", "failed"])
    .lte("scheduled_on", today)
    .lt("publish_attempts", MAX_ATTEMPTS)
    .not("channel_id", "is", null)
    .limit(100);

  const due = ((posts ?? []) as (Post & { publish_attempts: number })[]).filter(
    (p) =>
      p.scheduled_on < today || !p.scheduled_time || p.scheduled_time.slice(0, 5) <= nowKst
  );
  // 실패 건은 수동 업로드로 바뀐 게 아니라면 다음 실행 때 재시도 (최대 3회)
  const chIds = [...new Set(due.map((p) => p.channel_id as string))];
  const { data: chans } = chIds.length ? await svc.from("promo_channels").select("*").in("id", chIds) : { data: [] };
  const byId = new Map(((chans ?? []) as Channel[]).map((c) => [c.id, c]));

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const p of due) {
    const ch = byId.get(p.channel_id as string);
    if (!isAutoChannel(ch)) continue; // 수동 채널은 '오늘' 탭에서 복사 업로드
    results.push({ id: p.id, ...(await publishPost(svc, p, ch!)) });
  }
  return results;
}
