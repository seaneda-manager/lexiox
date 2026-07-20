import { getServerSupabase } from "@/lib/supabase/server";
import TasksClient, { type Task } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TeacherTasksPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  let initialTasks: Task[] = [];
  if (user) {
    const { data } = await supabase
      .from("teacher_tasks")
      .select("id, label, status, category, student_name, due_display, created_at")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    initialTasks = (data ?? []) as Task[];
  }

  return <TasksClient initialTasks={initialTasks} />;
}
