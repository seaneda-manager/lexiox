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

    // Update student_progress to start from specified day
    const { error } = await supabase
      .from("student_progress")
      .update({
        cursor_day_index: startDayIndex,
        updated_at: new Date().toISOString(),
      })
      .eq("student_id", studentId)
      .eq("vocab_track_id", trackId);

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
