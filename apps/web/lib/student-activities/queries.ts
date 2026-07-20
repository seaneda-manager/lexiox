// apps/web/lib/student-activities/queries.ts

import { getServerSupabase } from "@/lib/supabase/server";

export async function getStudentTimeline(studentId: string) {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("student_activities")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
