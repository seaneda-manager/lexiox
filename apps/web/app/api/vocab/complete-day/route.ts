export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

interface CompleteDayRequest {
  assignmentId: string;
  trackId: string;
  dayIndex: number;
  studyTimeSeconds?: number;
}

/**
 * POST /api/vocab/complete-day
 * Vocab Day 완료 → 다음 Day 자동 배정
 *
 * Request:
 * {
 *   assignmentId: string,       // Assignment ID
 *   trackId: string,            // Track ID
 *   dayIndex: number,           // 완료한 Day 번호
 *   studyTimeSeconds?: number   // 학습 시간 (선택사항)
 * }
 *
 * Response:
 * {
 *   ok: true,
 *   completed: true,
 *   nextDay?: number,           // 다음 배정된 Day
 *   nextAssignmentId?: string   // 다음 Assignment ID
 * }
 */
export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assignmentId, trackId, dayIndex, studyTimeSeconds } =
      (await req.json()) as CompleteDayRequest;

    if (!assignmentId || !trackId || !dayIndex) {
      return NextResponse.json(
        { error: "Missing required fields: assignmentId, trackId, dayIndex" },
        { status: 400 }
      );
    }

    const admin = getServiceRoleClient();

    // 1️⃣ 현재 Day Assignment 완료 표시
    const { error: updateError } = await admin
      .from("student_vocab_assignments")
      .update({
        completed_at: new Date().toISOString(),
        status: "COMPLETED",
        total_study_time: (studyTimeSeconds || 0),
      } as any)
      .eq("id", assignmentId)
      .eq("student_id", user.id);

    if (updateError) {
      console.error("[vocab complete-day] Assignment update error:", updateError);
      return NextResponse.json(
        { error: "Failed to mark assignment as completed" },
        { status: 500 }
      );
    }

    console.log(`✅ Vocab Day ${dayIndex} marked as completed for student ${user.id}`);

    // 2️⃣ 다음 Day 자동 배정
    let nextDay: number | null = null;
    let nextAssignmentId: string | null = null;

    try {
      // Plan 조회
      const { data: plan } = await admin
        .from("student_vocab_plans")
        .select("cursor_day_index")
        .eq("student_id", user.id)
        .eq("track_id", trackId)
        .maybeSingle();

      if (!plan) {
        console.warn(`[vocab complete-day] Plan not found for student ${user.id}, track ${trackId}`);
        return NextResponse.json({
          ok: true,
          completed: true,
          message: "Day completed but plan not found for auto-advance",
        });
      }

      const currentDay = plan.cursor_day_index || 1;
      nextDay = currentDay + 1;

      // 다음 Day의 vocab_sets 확인
      const { data: nextDaySet } = await admin
        .from("vocab_sets")
        .select("id")
        .eq("track_id", trackId)
        .eq("order_index", nextDay)
        .maybeSingle();

      if (!nextDaySet) {
        // 트랙의 마지막 Day까지 다 끝남
        console.log(`[vocab complete-day] All days completed for track ${trackId}`);
        return NextResponse.json({
          ok: true,
          completed: true,
          message: "All days completed!",
        });
      }

      // 다음 Day Assignment 생성
      const { data: nextAssign, error: insertError } = await admin
        .from("student_vocab_assignments")
        .insert({
          student_id: user.id,
          set_id: nextDaySet.id,
          track_id: trackId,
          day_index: nextDay,
          status: "READY",
          available_at: new Date().toISOString().split("T")[0],
        } as any)
        .select("id")
        .single();

      if (insertError) {
        console.error(`[vocab complete-day] Failed to create next assignment:`, insertError);
        return NextResponse.json({
          ok: true,
          completed: true,
          message: "Day completed but failed to auto-advance",
        });
      }

      if (nextAssign?.id) {
        nextAssignmentId = nextAssign.id;

        // cursor_day_index 업데이트
        await admin
          .from("student_vocab_plans")
          .update({ cursor_day_index: nextDay })
          .eq("student_id", user.id)
          .eq("track_id", trackId);

        console.log(`✅ Next Vocab Day ${nextDay} auto-assigned for student ${user.id}`);
      }
    } catch (advanceErr: any) {
      console.error("[vocab complete-day] Auto-advance error (non-fatal):", advanceErr);
      // Day 완료는 성공했으므로 에러는 반환하지 않음
    }

    return NextResponse.json({
      ok: true,
      completed: true,
      nextDay,
      nextAssignmentId,
    });
  } catch (err: any) {
    console.error("[vocab complete-day] ERROR:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
