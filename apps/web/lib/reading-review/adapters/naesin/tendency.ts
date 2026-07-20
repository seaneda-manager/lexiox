import { buildStudentTendencySnapshot } from "@/lib/reading-review/core/tendency";
import type { SessionAnalysisSnapshotRow } from "@/lib/reading-review/core/types";

type SupabaseServerClient = Awaited<
  ReturnType<typeof import("@/lib/supabase/server").getServerSupabase>
>;

type ActionOk<T extends object = {}> = { ok: true } & T;
type ActionFail = { ok: false; error: string };

export async function rebuildNaesinStudentTendencySnapshot(
  supabase: SupabaseServerClient,
  studentId: string,
  windowSize: number,
): Promise<ActionOk | ActionFail> {
  const normalizedStudentId = studentId.trim();
  if (!normalizedStudentId) {
    return { ok: false, error: "Invalid studentId" };
  }

  const normalizedWindowSize = Math.max(1, Number(windowSize || 0));

  const { data, error } = await supabase
    .from("naesin_reading_session_analysis_snapshots")
    .select(
      "session_id, weak_tags, evidence_metrics, vocab_metrics, sentence_metrics, behavior_metrics, accuracy_overall, score_percent, updated_at, created_at",
    )
    .eq("student_id", normalizedStudentId)
    .order("updated_at", { ascending: false })
    .limit(normalizedWindowSize);

  if (error) return { ok: false, error: error.message };

  const rows = (data ?? []) as SessionAnalysisSnapshotRow[];
  const built = buildStudentTendencySnapshot(rows, normalizedWindowSize);

  if (!built) return { ok: true };

  const { error: upsertError } = await supabase
    .from("naesin_reading_student_tendency_snapshots")
    .upsert(
      {
        student_id: normalizedStudentId,
        window_size: normalizedWindowSize,
        basis_session_ids: built.basisSessionIds,
        weak_tags: built.weakTags,
        top_patterns: built.topPatterns,
        prescription_tags: built.prescriptionTags,
      },
      { onConflict: "student_id,window_size" },
    );

  if (upsertError) return { ok: false, error: upsertError.message };

  return { ok: true };
}
