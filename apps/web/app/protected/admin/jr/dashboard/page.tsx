import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import JrDashboardClient from "./JrDashboardClient";

export default async function JrDashboardPage() {
  const { user } = await getUserAndProfile();
  if (!user) redirect("/login");

  const supabase = await getSupabaseServer();

  // 현재 사용자가 가르치는 학생들 조회
  const { data: assignments } = await supabase
    .from("teacher_student_assignments")
    .select("student_id, students(id, full_name, username)")
    .eq("teacher_id", user.id);

  const studentIds = assignments?.map((a) => a.student_id) || [];

  // Reading Sessions
  const { data: readingSessions } = await supabase
    .from("jr_reading_sessions")
    .select(
      "id, student_id, stage, completed_at, students(id, full_name, username)"
    )
    .in("student_id", studentIds);

  // Grammar Sessions
  const { data: grammarSessions } = await supabase
    .from("jr_grammar_sessions")
    .select(
      "id, student_id, stage, completed_at, students(id, full_name, username)"
    )
    .in("student_id", studentIds);

  // Listening Sessions
  const { data: listeningSessions } = await supabase
    .from("jr_listening_sessions")
    .select(
      "id, student_id, stage, completed_at, students(id, full_name, username)"
    )
    .in("student_id", studentIds);

  // Speaking & Writing Tasks
  const { data: speakingWritingSubmissions } = await supabase
    .from("jr_speaking_writing_submissions")
    .select(
      "id, task_id, student_id, submitted_at, teacher_feedback, students(id, full_name, username), jr_speaking_writing_tasks(id, task_type, prompt, due_date)"
    )
    .in("student_id", studentIds);

  return (
    <JrDashboardClient
      readingSessions={readingSessions || []}
      grammarSessions={grammarSessions || []}
      listeningSessions={listeningSessions || []}
      speakingWritingSubmissions={speakingWritingSubmissions || []}
      teacherId={user.id}
    />
  );
}
