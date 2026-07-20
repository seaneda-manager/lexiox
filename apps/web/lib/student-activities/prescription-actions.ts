"use server";

import { getServerSupabase } from "@/lib/supabase/server";

export async function markPrescriptionInProgress(prescriptionId: string) {
  const supabase = await getServerSupabase();

  const { error } = await supabase
    .from("student_prescriptions")
    .update({
      status: "in_progress",
    })
    .eq("id", prescriptionId);

  if (error) {
    console.error("markPrescriptionInProgress error", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function markPrescriptionDone(prescriptionId: string) {
  const supabase = await getServerSupabase();

  const { error } = await supabase
    .from("student_prescriptions")
    .update({
      status: "done",
    })
    .eq("id", prescriptionId);

  if (error) {
    console.error("markPrescriptionDone error", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
