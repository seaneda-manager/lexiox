import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";
import JrAnalyticsClient from "./_components/JrAnalyticsClient";

export default async function JrAnalyticsPage() {
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

  return <JrAnalyticsClient students={assignments || []} teacherId={user.id} />;
}
