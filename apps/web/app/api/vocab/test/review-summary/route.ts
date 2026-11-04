export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { countDueReviewByTrack } from "@/lib/vocab/review/reviewItems";
import { getTotalExamStatus } from "@/lib/vocab/review/totalExam";
import { getTestConfig } from "@/lib/vocab/test/testConfig";

/**
 * GET /api/vocab/test/review-summary[?track_id=...]
 * 오늘 복습해야 할 단어 수.
 *  - track_id 있으면: { due_count }               (그 교재)
 *  - 없으면:        { due_count, by_track: {...} } (전체 합계 + 교재별)
 * 복습 테이블이 아직 없거나 오류여도 0 으로 응답한다 (화면이 깨지지 않게).
 */
export async function GET(req: NextRequest) {
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: studentRow } = await admin
      .from("academy_students")
      .select("id")
      .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id},profile_id.eq.${user.id}`)
      .maybeSingle();
    const studentId = studentRow?.id;
    if (!studentId) return NextResponse.json({ due_count: 0, by_track: {} });

    const byTrack = await countDueReviewByTrack(admin, { studentId });
    const trackId = req.nextUrl.searchParams.get("track_id");
    if (trackId) {
      // 교재별일 때는 총 시험 시기도 함께 알려 준다 (기본 30일마다, 설정으로 변경)
      let total: { due: boolean; next_due_on: string | null; interval_days: number } = {
        due: false,
        next_due_on: null,
        interval_days: 30,
      };
      try {
        const { data: membership } = await admin
          .from("academy_class_students")
          .select("class_id")
          .eq("student_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const cfg = await getTestConfig(admin, user.id, membership?.class_id ?? null);
        const st = await getTotalExamStatus(admin, {
          studentId,
          authUserId: user.id,
          trackId,
          intervalDays: cfg.total_exam_interval_days,
        });
        total = { due: st.due, next_due_on: st.nextDueOn, interval_days: st.intervalDays };
      } catch {
        /* 총 시험 집계 실패는 무시 */
      }
      return NextResponse.json({ due_count: byTrack[trackId] ?? 0, total_exam: total });
    }

    const total = Object.values(byTrack).reduce((a, b) => a + b, 0);
    return NextResponse.json({ due_count: total, by_track: byTrack });
  } catch (e) {
    console.error("review-summary error:", e);
    return NextResponse.json({ due_count: 0, by_track: {} });
  }
}
