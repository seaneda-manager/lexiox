export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requirePromoOrg } from "@/lib/promo/context";
import { signState, siteUrl } from "@/lib/promo/secure";
import { metaAuthUrl, metaConfigured } from "@/lib/promo/providers/meta";
import { googleAuthUrl, googleConfigured } from "@/lib/promo/providers/google";

// 채널·자동화 화면의 '연결' 버튼 → 각 플랫폼 로그인 화면으로 보낸다
export async function GET(_req: Request, { params }: { params: Promise<{ provider: string }> | { provider: string } }) {
  const { provider } = await params;
  const back = (msg: string) => NextResponse.redirect(`${siteUrl()}/promo/channels?error=${encodeURIComponent(msg)}`);
  try {
    const ctx = await requirePromoOrg();
    const state = signState(ctx.org.id, ctx.userId);
    if (provider === "meta") {
      if (!metaConfigured()) return back("본사에서 Meta 앱 연결 설정을 아직 하지 않았어요.");
      return NextResponse.redirect(metaAuthUrl(state));
    }
    if (provider === "google") {
      if (!googleConfigured()) return back("본사에서 Google 연결 설정을 아직 하지 않았어요.");
      return NextResponse.redirect(googleAuthUrl(state));
    }
    return back("지원하지 않는 연결이에요.");
  } catch (e) {
    return back(e instanceof Error ? e.message : "연결을 시작하지 못했어요.");
  }
}
