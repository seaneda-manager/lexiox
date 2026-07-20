import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import AssignmentManagerClient from "./_components/AssignmentManagerClient";

export default async function JrAssignmentsPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "teacher") redirect("/login");

  const supabase = await getSupabaseServer();

  // 이 선생님이 가르치는 학생들
  const { data: students } = await supabase
    .from("teacher_student_assignments")
    .select("student_id, students(id, full_name, username)")
    .eq("teacher_id", user.id);

  // Reading passages
  const { data: readingPassages } = await supabase
    .from("jr_reading_passages")
    .select("id, title, difficulty");

  // Grammar chapters
  const { data: grammarChapters } = await supabase
    .from("jr_grammar_chapters")
    .select("id, title");

  // Listening sessions
  const { data: listeningAudio } = await supabase
    .from("jr_listening_sessions")
    .select("id, audio_url");

  // Speaking&Writing tasks
  const { data: speakingTasks } = await supabase
    .from("jr_speaking_writing_tasks")
    .select("id, task_type, prompt, due_date");

  return (
    <AssignmentManagerClient
      students={students || []}
      readingPassages={readingPassages || []}
      grammarChapters={grammarChapters || []}
      listeningAudio={listeningAudio || []}
      speakingTasks={speakingTasks || []}
      teacherId={user.id}
    />
  );
}
