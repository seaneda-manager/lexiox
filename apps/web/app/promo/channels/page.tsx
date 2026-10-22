import { addDays, todayKST } from "@/lib/promo/dates";
import { metaConfigured } from "@/lib/promo/providers/meta";
import { googleConfigured } from "@/lib/promo/providers/google";
import type { ChannelTarget } from "@/lib/promo/types";
import { loadAutomations, loadBase } from "../_data";
import { ChannelsClient, type ConnView } from "./ChannelsClient";

export default async function ChannelsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }> | { connected?: string; error?: string };
}) {
  const sp = await searchParams;
  const { ctx, channels } = await loadBase();
  const today = todayKST();
  const [autos, { count }, { data: conns }] = await Promise.all([
    loadAutomations(ctx.org.id, ctx.supabase),
    ctx.supabase
      .from("promo_posts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.org.id)
      .eq("source", "auto")
      .gte("scheduled_on", today)
      .lte("scheduled_on", addDays(today, 6)),
    ctx.supabase.from("promo_connections").select("id, provider, account_label, status, meta").eq("org_id", ctx.org.id),
  ]);
  // 암호화된 토큰은 화면으로 보내지 않는다: 게시 대상 목록만 넘긴다
  const connections: ConnView[] = (conns ?? []).map((c) => ({
    id: c.id as string,
    provider: c.provider as "meta" | "google",
    account_label: (c.account_label as string) ?? null,
    status: c.status as string,
    targets: (((c.meta as { targets?: ChannelTarget[] })?.targets ?? []) as ChannelTarget[]),
    notes: (((c.meta as { notes?: string[] })?.notes ?? []) as string[]),
  }));
  const notice = sp.connected
    ? `${sp.connected === "meta" ? "Meta(인스타그램·페이스북)" : "Google(유튜브·비즈니스 프로필)"} 계정을 연결했어요. 채널마다 올릴 계정을 골라주세요.`
    : sp.error ?? null;
  return (
    <ChannelsClient
      channels={channels}
      autos={autos}
      upcomingAuto={count ?? 0}
      today={today}
      connections={connections}
      configured={{ meta: metaConfigured(), google: googleConfigured() }}
      notice={notice}
      noticeIsError={!!sp.error}
    />
  );
}
