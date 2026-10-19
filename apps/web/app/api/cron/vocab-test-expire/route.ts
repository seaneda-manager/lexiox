export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { finalizeSession } from "@/lib/vocab/test/finalize";

export const runtime = "nodejs";

/**
 * GET /api/cron/vocab-test-expire
 * 마감이 지났는데 학생이 접속하지 않아 in_progress 로 남은 단어 시험을 시간 만료로 채점 확정한다.
 * (학생이 다시 접속하면 start/answer/submit 에서도 같은 처리를 하므로, 이 크론은 선생님 화면용 결과 정리 목적)
 */
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 유예(3초)를 넘긴 마감 지난 세션
    const cutoff = new Date(Date.now() - 5000).toISOString();
    const { data: stale, error } = await admin
      .from("vocab_test_sessions")
      .select("id")
      .eq("status", "in_progress")
      .not("deadline_at", "is", null)
      .lt("deadline_at", cutoff)
      .limit(200);

    if (error) throw new Error(error.message);

    let finalized = 0;
    for (const row of stale ?? []) {
      const result = await finalizeSession(admin, row.id, "timeout");
      if (result?.finalized_now) finalized += 1;
    }

    return Response.json({
      ok: true,
      scanned: stale?.length ?? 0,
      finalized,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error("Vocab test expire cron error:", e);
    return Response.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
