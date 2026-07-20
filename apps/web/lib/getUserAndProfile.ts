// apps/web/lib/getUserAndProfile.ts
import { getSupabaseServer } from "@/lib/supabaseServer";
import type { User } from "@supabase/supabase-js";

type Role = "student" | "teacher" | "admin";
type ProfileRow = {
  role: Role;
  full_name: string | null;
  avatar_url: string | null;
};

type Result = { user: User | null; profile: ProfileRow | null };

export async function getUserAndProfile(): Promise<Result> {
  const supabase = await getSupabaseServer();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) return { user: null, profile: null };

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (profileErr) return { user, profile: null };

  return { user, profile: profile ?? null };
}




