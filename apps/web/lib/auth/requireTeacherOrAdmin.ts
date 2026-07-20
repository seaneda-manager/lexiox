import { getServerSupabase } from "@/lib/supabase/server";

export async function requireTeacherOrAdmin() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("401 unauthorized");

  const { data: me, error: perr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (perr) throw new Error("500 profile lookup failed");
  if (!me || !["teacher", "admin"].includes((me as any).role)) {
    throw new Error("403 forbidden");
  }
  return { user, role: (me as any).role as "teacher" | "admin" };
}
