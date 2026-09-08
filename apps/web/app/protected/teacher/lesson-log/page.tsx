import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import LessonLogClient from "./_client/LessonLogClient";

export const dynamic = "force-dynamic";

export default async function TeacherLessonLogPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || !["admin", "teacher"].includes(profile.role)) redirect("/");

  const service = getServiceSupabase();
  const { data: roster } = await service
    .from("academy_students")
    .select("id, display_name, grade")
    .eq("is_active", true)
    .order("display_name");

  const students = (roster ?? []).map((s) => {
    const r = s as { id: string; display_name: string | null; grade: string | null };
    return { academyId: String(r.id), name: r.display_name ?? "(이름 없음)", grade: r.grade ?? null };
  });

  const { student } = await searchParams;
  const selected =
    student && students.some((s) => s.academyId === student)
      ? student
      : (students[0]?.academyId ?? null);

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">수업 로그</h1>
        <p className="mt-0.5 text-xs text-neutral-400">
          학원 수업 일정을 잡고, 수업이 끝나면 배운 내용·숙제를 기록합니다. 학생 스케줄러의
          &ldquo;학원&rdquo; 구역에 그대로 표시됩니다.
        </p>
      </header>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          활성 학생이 없습니다.
        </div>
      ) : (
        <LessonLogClient students={students} initialStudent={selected} />
      )}
    </main>
  );
}
