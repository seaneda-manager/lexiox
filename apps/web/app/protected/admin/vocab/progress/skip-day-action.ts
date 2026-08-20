"use server";

import { createClient } from "@supabase/supabase-js";

function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    throw new Error("Supabase env missing");
  }

  return createClient(url, serviceKey);
}

/**
 * Skip student's vocab days - set cursor to specific day
 */
export async function skipVocabDaysAction(
  studentId: string,
  trackId: string,
  startDayIndex: number
) {
  try {
    const supabase = createServiceRoleClient();

    // cursor_day_index는 DB 체크 제약(student_vocab_plans_cursor_gte_start_check)에 의해
    // start_day_index보다 작을 수 없다. 여기서 미리 검증해 원인을 알 수 없는 postgres
    // 에러 대신 사용자가 이해할 수 있는 메시지를 준다.
    const { data: plan, error: planError } = await supabase
      .from("student_vocab_plans")
      .select("start_day_index")
      .eq("student_id", studentId)
      .eq("track_id", trackId)
      .maybeSingle();

    if (planError) throw planError;
    if (!plan) {
      return {
        ok: false as const,
        error: "해당 학생의 배정 정보를 찾을 수 없습니다",
      };
    }

    const minDay = Number(plan.start_day_index ?? 1);
    if (startDayIndex < minDay) {
      return {
        ok: false as const,
        error: `이 학생은 Day ${minDay}부터 배정되어 그 이전으로는 이동할 수 없습니다`,
      };
    }

    // Update student_vocab_plans to start from specified day
    const { error } = await supabase
      .from("student_vocab_plans")
      .update({
        cursor_day_index: startDayIndex,
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", studentId)
      .eq("track_id", trackId);

    if (error) throw error;

    return {
      ok: true as const,
      message: `Day ${startDayIndex}부터 시작하도록 설정되었습니다`,
    };
  } catch (e: any) {
    console.error("[skipVocabDaysAction] error:", e);
    return {
      ok: false as const,
      error: e?.message ?? String(e),
    };
  }
}
