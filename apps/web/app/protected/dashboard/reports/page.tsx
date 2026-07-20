import { getUser } from "@/lib/getUserAndProfile";
import { getServiceSupabase } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import PerformanceReportClient from "./_components/PerformanceReportClient";

export default async function ReportsPage() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  const userRole = user.user_metadata?.role;
  if (userRole !== "teacher") {
    redirect("/student");
  }

  const supabase = await getSupabaseServer();

  const { data: assignments } = await supabase
    .from("teacher_student_assignments")
    .select("student_id, students(id, full_name, username)")
    .eq("teacher_id", user.id);

  const studentIds = assignments?.map((a) => a.student_id) || [];
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [readingWeek, grammarWeek, listeningWeek, speakingWeek] = await Promise.all([
    supabase
      .from("jr_reading_sessions")
      .select("id, student_id, completed_at")
      .in("student_id", studentIds.length > 0 ? studentIds : [""])
      .gte("created_at", oneWeekAgo),
    supabase
      .from("jr_grammar_sessions")
      .select("id, student_id, completed_at")
      .in("student_id", studentIds.length > 0 ? studentIds : [""])
      .gte("created_at", oneWeekAgo),
    supabase
      .from("jr_listening_sessions")
      .select("id, student_id, completed_at")
      .in("student_id", studentIds.length > 0 ? studentIds : [""])
      .gte("created_at", oneWeekAgo),
    supabase
      .from("jr_speaking_writing_submissions")
      .select("id, student_id, submitted_at")
      .in("student_id", studentIds.length > 0 ? studentIds : [""])
      .gte("submitted_at", oneWeekAgo),
  ]);

  return (
    <PerformanceReportClient
      students={assignments || []}
      weeklyData={{
        reading: readingWeek.data || [],
        grammar: grammarWeek.data || [],
        listening: listeningWeek.data || [],
        speaking: speakingWeek.data || [],
      }}
      teacherId={user.id}
    />
  );
}
