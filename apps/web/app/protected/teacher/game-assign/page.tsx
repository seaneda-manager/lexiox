import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { isStaffRole } from "@/lib/workout/perk";
import GameAssignClient from "./_client/GameAssignClient";

export const dynamic = "force-dynamic";

export default async function TeacherGameAssignPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !isStaffRole(profile.role as string)) redirect("/");

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">게임 배정</h1>
        <p className="mt-0.5 text-xs text-neutral-400">
          학생에게 게임과 단어 범위(Day)를 숙제로 내줍니다. 배정받은 게임은 <b>게임 시간을 차감하지 않고</b> 열리며, 목표 횟수를 채우면 완료돼요.
        </p>
      </header>
      <GameAssignClient />
    </main>
  );
}
