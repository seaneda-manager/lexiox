export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { getServiceSupabase } from "@/lib/supabase/service";
import { publishDue } from "@/lib/promo/publish";

// 매일 실행(Hobby 플랜은 하루 1회 제한): 예약 시간이 된 승인 게시물을 연결된 채널(인스타·페이스북·유튜브·구글)로 업로드
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const results = await publishDue(getServiceSupabase());
    return Response.json({
      ok: true,
      published: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok),
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("promo-publish cron error:", e);
    return Response.json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
