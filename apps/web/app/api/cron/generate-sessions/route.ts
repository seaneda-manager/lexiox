export const dynamic = "force-dynamic";

import { getServiceRoleClient } from "@/lib/supabase/server";
import { syncUpcomingSessions } from "@/lib/classes/syncSessions";

export const runtime = "nodejs";

// 매일 한국 시간 00:00(UTC 15:00)에 앞으로 2주치 수업 회차를 보충한다. (vercel.json crons)
export async function GET(request: Request) {
  // Vercel 크론 시크릿 검증 (다른 크론과 동일). 시크릿이 비어 있으면 모든 요청을 거부한다.
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const result = await syncUpcomingSessions(getServiceRoleClient(), { days: 14 });
    return Response.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (e: any) {
    console.error("generate-sessions cron error:", e);
    return Response.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
