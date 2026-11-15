import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { isStaffRole } from "@/lib/workout/perk";
import StudyCheckClient from "./_client/StudyCheckClient";

export const dynamic = "force-dynamic";

export default async function TeacherStudyCheckPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !isStaffRole(profile.role as string)) redirect("/");

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">학습 완료 체크</h1>
        <p className="mt-0.5 text-xs text-neutral-400">
          학원에서 학습을 마친 학생을 체크하면 그 학생의 <b>게임 플레이 시간</b>이 적립됩니다. 게임은 숙제를 끝내거나 학원 학습을 끝낸 뒤에만 열리는
          보상이며, 같은 학생·날짜는 한 번만 적립됩니다.
        </p>
      </header>
      <StudyCheckClient />
    </main>
  );
}
