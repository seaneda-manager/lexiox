"use server";

import { getServiceSupabase } from "@/lib/supabase/service";

export async function updateListeningSessionProgressAction(
  sessionId: string,
  progress: { stage: string }
) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_listening_sessions")
      .update({
        stage: progress.stage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to update listening session progress:", e);
    return { ok: false, error: e?.message };
  }
}

export async function completeListeningSessionAction(sessionId: string) {
  try {
    const supabase = getServiceSupabase();
    await supabase
      .from("jr_listening_sessions")
      .update({
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
    return { ok: true };
  } catch (e: any) {
    console.error("Failed to complete listening session:", e);
    return { ok: false, error: e?.message };
  }
}
