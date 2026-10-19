export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { resolveAcademyStudentId } from "@/lib/vocab/academyStudent";

/**
 * GET /api/vocab/remedial
 * 내 필수 재학습 목록. 상태:
 *  - study   : 재학습 해야 함 (open / in_progress)
 *  - retest  : 재학습 완료, 복습시험 대기
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const academyId = await resolveAcademyStudentId(admin, user.id);
    if (!academyId) return NextResponse.json({ ok: true, tasks: [] });

    const { data: rows } = await admin
      .from("vocab_remedial_tasks")
      .select("id, track_id, day_index, status, word_ids, extra_terms, retest_session_id, completed_at, created_at")
      .eq("student_id", academyId)
      .in("status", ["open", "in_progress", "done"])
      .order("created_at", { ascending: true });

    // done 이어도 복습시험을 이미 끝냈으면 목록에서 제외
    const sessionIds = (rows ?? []).map((r: any) => r.retest_session_id).filter(Boolean);
    const graded = new Set<string>();
    if (sessionIds.length > 0) {
      const { data: sessions } = await admin
        .from("vocab_test_sessions")
        .select("id")
        .in("id", sessionIds)
        .eq("status", "graded");
      for (const s of sessions ?? []) graded.add(s.id);
    }

    const tasks = (rows ?? [])
      .filter((r: any) => !(r.status === "done" && r.retest_session_id && graded.has(r.retest_session_id)))
      .map((r: any) => ({
        id: r.id,
        track_id: r.track_id,
        day_index: r.day_index,
        status: r.status,
        phase: r.status === "done" ? "retest" : "study",
        word_count: (r.word_ids ?? []).length,
        extra_term_count: (r.extra_terms ?? []).length,
      }));

    return NextResponse.json({ ok: true, tasks }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("remedial list error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
