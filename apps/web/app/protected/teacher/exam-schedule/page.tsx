import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import ExamScheduleClient from "./_client/ExamScheduleClient";

export const dynamic = "force-dynamic";

export default async function TeacherExamSchedulePage() {
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
    .select("id, display_name, grade, school")
    .eq("is_active", true)
    .order("display_name");

  const students = (roster ?? []).map((s) => {
    const r = s as {
      id: string;
      display_name: string | null;
      grade: string | null;
      school: string | null;
    };
    return {
      academyId: String(r.id),
      name: r.display_name ?? "(이름 없음)",
      grade: r.grade ?? null,
      school: r.school ?? null,
    };
  });

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">시험 · 수행평가 배정</h1>
        <p className="mt-0.5 text-xs text-neutral-400">
          여러 학생에게 시험이나 수행평가를 한 번에 등록합니다. 학생 스케줄러의 &ldquo;내
          시험&rdquo;에 표시되고, 준비 블록이 자동으로 잡힙니다. 학생은 삭제할 수 없고 세부만
          조정할 수 있어요.
        </p>
      </header>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          활성 학생이 없습니다.
        </div>
      ) : (
        <ExamScheduleClient students={students} />
      )}
    </main>
  );
}
