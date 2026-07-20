"use server";

import { getServiceSupabase } from "@/lib/supabase/service";

export async function submitFeedbackAction({
  submissionId,
  feedback,
}: {
  submissionId: string;
  feedback: string;
}) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_speaking_writing_submissions")
      .update({
        teacher_feedback: feedback,
        feedback_submitted_at: new Date().toISOString(),
      })
      .eq("id", submissionId);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to submit feedback:", e);
    return { ok: false, error: e?.message };
  }
}
