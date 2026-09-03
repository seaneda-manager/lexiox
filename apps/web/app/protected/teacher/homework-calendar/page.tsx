import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import {
  getStudentAssignmentCalendar,
  resolveStudentIds,
  toIsoDate,
} from "@/lib/assignments/studentAssignmentCalendar";
import TeacherHomeworkCalendarClient from "./_client/TeacherHomeworkCalendarClient";

export const dynamic = "force-dynamic";

export default async function TeacherHomeworkCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string }>;
}) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "teacher"].includes(profile.role)) redirect("/");

  const service = getServiceSupabase();
  const { data: roster } = await service
    .from("academy_students")
    .select("id, display_name, grade")
    .eq("is_active", true)
    .order("display_name");

  const students = (roster ?? []).map((s: any) => ({
    academyId: String(s.id),
    name: s.display_name ?? "(이름 없음)",
    grade: s.grade ?? null,
  }));

  const { student: selectedAcademyId } = await searchParams;
  const selected = selectedAcademyId && students.some((s) => s.academyId === selectedAcademyId)
    ? selectedAcademyId
    : students[0]?.academyId ?? null;

  let initialItems: Awaited<ReturnType<typeof getStudentAssignmentCalendar>> = [];
  let calYm = "";
  let authId: string | null = null;
  if (selected) {
    const ids = await resolveStudentIds(selected);
    authId = ids.authId;
    const now = new Date();
    calYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const gs = new Date(first);
    gs.setDate(gs.getDate() - first.getDay());
    const ge = new Date(gs);
    ge.setDate(ge.getDate() + 41);
    initialItems = await getStudentAssignmentCalendar({
      authUserId: authId,
      academyStudentId: selected,
      fromIso: toIsoDate(gs),
      toIso: toIsoDate(ge),
    });
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">배정 캘린더</h1>
        <p className="mt-0.5 text-xs text-neutral-400">학생별로 배정된 숙제·시험·단어·드릴을 날짜별로 확인합니다.</p>
      </header>

      {students.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          활성 학생이 없습니다.
        </div>
      ) : (
        <TeacherHomeworkCalendarClient
          students={students}
          selectedAcademyId={selected}
          authId={authId}
          initialItems={initialItems}
          initialMonth={calYm}
        />
      )}
    </main>
  );
}
