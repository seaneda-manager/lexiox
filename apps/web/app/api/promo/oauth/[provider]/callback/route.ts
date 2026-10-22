export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { siteUrl, verifyState } from "@/lib/promo/secure";
import { metaExchange } from "@/lib/promo/providers/meta";
import { googleExchange } from "@/lib/promo/providers/google";

// 플랫폼 로그인 후 돌아오는 곳: 토큰을 암호화해 저장하고 채널 화면으로 돌려보낸다
export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> | { provider: string } }) {
  const { provider } = await params;
  const url = new URL(req.url);
  const back = (q: string) => NextResponse.redirect(`${siteUrl()}/promo/channels?${q}`);
  try {
    if (url.searchParams.get("error")) return back(`error=${encodeURIComponent("연결을 취소했어요.")}`);
    const state = verifyState(url.searchParams.get("state"));
    const code = url.searchParams.get("code");
    if (!code) throw new Error("잘못된 요청이에요.");

    // 연결을 시작한 사람과 지금 로그인한 사람이 같은지, 그 가맹점을 운영하는지 다시 확인
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== state.userId) throw new Error("로그인 정보가 바뀌었어요. 다시 시도해주세요.");
    const { data: can } = await supabase.rpc("promo_can_manage", { p_org: state.orgId });
    if (!can) throw new Error("이 가맹점을 운영할 권한이 없어요.");

    const data =
      provider === "meta" ? await metaExchange(code) : provider === "google" ? await googleExchange(code) : null;
    if (!data) throw new Error("지원하지 않는 연결이에요.");

    const svc = getServiceSupabase();
    const { error } = await svc.from("promo_connections").upsert(
      {
        org_id: state.orgId,
        provider,
        status: "active",
        created_by: user.id,
        refresh_token_enc: null,
        ...data,
      },
      { onConflict: "org_id,provider" }
    );
    if (error) throw new Error(error.message);
    return back(`connected=${provider}`);
  } catch (e) {
    console.error("[promo/oauth/callback]", e);
    return back(`error=${encodeURIComponent(e instanceof Error ? e.message : "연결하지 못했어요.")}`);
  }
}
