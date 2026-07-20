import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import StudentDashboardClient from "./_components/StudentDashboardClient";

export default async function StudentDashboardPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "student") redirect("/login");

  const supabase = await getSupabaseServer();

  const [readingSessions, grammarSessions, listeningSessions, speakingSubmissions] = await Promise.all([
    supabase
      .from("jr_reading_sessions")
      .select("id, stage, completed_at, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("jr_grammar_sessions")
      .select("id, stage, completed_at, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("jr_listening_sessions")
      .select("id, stage, completed_at, created_at")
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("jr_speaking_writing_submissions")
      .select("id, submitted_at, teacher_feedback")
      .eq("student_id", user.id)
      .order("submitted_at", { ascending: false }),
  ]);

  return (
    <StudentDashboardClient
      studentName={profile?.full_name || "Student"}
      readingSessions={readingSessions.data || []}
      grammarSessions={grammarSessions.data || []}
      listeningSessions={listeningSessions.data || []}
      speakingSubmissions={speakingSubmissions.data || []}
    />
  );
}
