import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import TeacherDashboardClient from "./_components/TeacherDashboardClient";

export default async function DashboardPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user) redirect("/login");

  if (profile?.role !== "teacher") {
    redirect("/student");
  }

  const supabase = await getSupabaseServer();

  // 학생 목록
  const { data: assignments } = await supabase
    .from("teacher_student_assignments")
    .select("student_id")
    .eq("teacher_id", user.id);

  const studentIds = assignments?.map((a) => a.student_id) || [];

  // Jr. Data
  const [readingRes, grammarRes, listeningRes, speakingRes] = await Promise.all([
    supabase
      .from("jr_reading_sessions")
      .select("id, student_id, stage, completed_at")
      .in("student_id", studentIds.length > 0 ? studentIds : [""]),
    supabase
      .from("jr_grammar_sessions")
      .select("id, student_id, stage, completed_at")
      .in("student_id", studentIds.length > 0 ? studentIds : [""]),
    supabase
      .from("jr_listening_sessions")
      .select("id, student_id, stage, completed_at")
      .in("student_id", studentIds.length > 0 ? studentIds : [""]),
    supabase
      .from("jr_speaking_writing_submissions")
      .select("id, student_id, teacher_feedback, submitted_at")
      .in("student_id", studentIds.length > 0 ? studentIds : [""]),
  ]);

  // Vocab Data
  const { data: vocabAssignments } = await supabase
    .from("student_vocab_assignments")
    .select("id, student_id, completed_at, students(id, full_name, username)")
    .eq("teacher_id", user.id);

  return (
    <TeacherDashboardClient
      jrData={{
        readingSessions: readingRes.data || [],
        grammarSessions: grammarRes.data || [],
        listeningSessions: listeningRes.data || [],
        speakingSubmissions: speakingRes.data || [],
      }}
      vocabData={{ assignments: vocabAssignments || [] }}
      teacherId={user.id}
    />
  );
}
