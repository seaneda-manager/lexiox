"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export type DrillResultRow = {
  wordId: string;
  drillType: string;
  isCorrect: boolean;
  setId?: string | null;
};

export type SaveDrillResultsResult = { ok: boolean; saved: number; error?: string };

/**
 * 드릴 문항 결과를 일괄 저장.
 * 저장 실패가 학습 흐름을 막으면 안 되므로 항상 ok 로 돌려주고 로그만 남긴다.
 */
export async function saveDrillResultsAction(
  rows: DrillResultRow[],
): Promise<SaveDrillResultsResult> {
  try {
    if (!Array.isArray(rows) || rows.length === 0) return { ok: true, saved: 0 };

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, saved: 0, error: "NOT_AUTHENTICATED" };

    const payload = rows
      .filter((r) => r?.wordId && r?.drillType)
      .map((r) => ({
        student_id: user.id,
        set_id: r.setId ?? null,
        word_id: r.wordId,
        drill_type: r.drillType,
        is_correct: Boolean(r.isCorrect),
      }));

    if (payload.length === 0) return { ok: true, saved: 0 };

    const { error } = await supabase.from("vocab_drill_results").insert(payload);
    if (error) {
      console.warn("[saveDrillResultsAction] insert failed:", error.message);
      return { ok: false, saved: 0, error: error.message };
    }

    return { ok: true, saved: payload.length };
  } catch (e: any) {
    console.warn("[saveDrillResultsAction] exception:", e?.message ?? String(e));
    return { ok: false, saved: 0, error: "EXCEPTION" };
  }
}
