"use server";

import { logActivity } from "@/lib/activityLog";
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

async function completeListeningSessionAction__impl(sessionId: string) {
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

export async function completeListeningSessionAction(...args: Parameters<typeof completeListeningSessionAction__impl>): Promise<Awaited<ReturnType<typeof completeListeningSessionAction__impl>>> {
  const result = await completeListeningSessionAction__impl(...args);
  await logActivity("jr_listening_complete");
  return result;
}
