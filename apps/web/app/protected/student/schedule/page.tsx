import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getPlannerStudentContext } from "@/lib/planner/studentContext";
import PlannerClient from "./_components/PlannerClient";

export const dynamic = "force-dynamic";

export default async function StudentSchedulePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ctx = await getPlannerStudentContext();

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-16">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">내 스케줄</h1>
        <p className="mt-0.5 text-xs text-neutral-400">
          시험 준비 계획을 직접 짜 보세요 — 학교 · 학원 · 집 시간을 나눠서.
        </p>
      </header>

      {ctx ? (
        <PlannerClient />
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-400">
          아직 학원 학생으로 연결되지 않아 스케줄러를 쓸 수 없어요.
          <br />
          선생님께 문의해 주세요.
        </div>
      )}
    </main>
  );
}
