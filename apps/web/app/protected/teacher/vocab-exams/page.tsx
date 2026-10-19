// 선생님용 단어 시험 현황: 반별 학생의 오늘 시험 결과 / 필수 재학습 / 복습시험.
// 학생이 접속하지 않아 마감이 지난 채 남은 시험은 이 화면을 열 때 시간 종료로 채점 확정한다.

import Link from "next/link";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacher";
import { finalizeSession } from "@/lib/vocab/test/finalize";
import { kstDateString } from "@/lib/vocab/classDay";
import { voidTestSessionAction } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { searchParams: Promise<{ date?: string }> };

type SessionRow = {
  id: string;
  student_id: string;
  day_number: number;
  kind: "main" | "retest";
  status: string;
  score: number | null;
  passed: boolean | null;
  pass_score: number | null;
  ended_by: "submit" | "timeout" | null;
  deadline_at: string | null;
  started_at: string | null;
  duration_seconds: number | null;
  voided_at: string | null;
};

type TaskRow = {
  id: string;
  student_id: string;
  day_index: number;
  status: string;
  word_ids: string[];
  retest_session_id: string | null;
};

function fmtTime(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function sessionLabel(s: SessionRow): { text: string; cls: string } {
  if (s.voided_at) return { text: "무효(재응시 허용)", cls: "bg-neutral-200 text-neutral-600" };
  if (s.status === "in_progress") return { text: "응시 중", cls: "bg-amber-100 text-amber-800" };
  if (s.passed === true) return { text: "통과", cls: "bg-emerald-100 text-emerald-800" };
  if (s.passed === false) return { text: "미달", cls: "bg-rose-100 text-rose-800" };
  return { text: s.status, cls: "bg-neutral-100 text-neutral-600" };
}

export default async function TeacherVocabExamsPage({ searchParams }: Props) {
  const { date } = await searchParams;

  let flags;
  try {
    flags = await requireTeacherOrAdmin();
  } catch {
    return (
      <main className="mx-auto max-w-3xl p-6 text-sm text-neutral-500">선생님 계정으로 로그인해야 볼 수 있어요.</main>
    );
  }

  const day = /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") ? (date as string) : kstDateString();
  const dayStart = new Date(`${day}T00:00:00+09:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const service = getServiceRoleClient();

  // 내 반 (admin 은 전체)
  let classQuery = service.from("academy_classes").select("id, name, teacher_id").eq("is_active", true).order("name");
  if (!flags.isAdmin) classQuery = classQuery.eq("teacher_id", flags.userId);
  const { data: classes } = await classQuery;
  const classIds = (classes ?? []).map((c: any) => c.id as string);

  const { data: memberships } = classIds.length
    ? await service
        .from("academy_class_students")
        .select("class_id, student_id, left_on")
        .in("class_id", classIds)
    : { data: [] as any[] };
  const activeMembers = (memberships ?? []).filter((m: any) => !m.left_on || m.left_on >= day);
  const authIds = Array.from(new Set(activeMembers.map((m: any) => m.student_id as string)));

  // auth uid → academy_students
  const academyByAuth = new Map<string, { id: string; name: string }>();
  if (authIds.length > 0) {
    const list = authIds.join(",");
    const { data: students } = await service
      .from("academy_students")
      .select("id, display_name, user_id, auth_user_id, profile_id")
      .or(`user_id.in.(${list}),auth_user_id.in.(${list}),profile_id.in.(${list})`);
    for (const st of students ?? []) {
      for (const key of [st.user_id, st.auth_user_id, st.profile_id]) {
        if (key && authIds.includes(key)) academyByAuth.set(key, { id: st.id, name: st.display_name });
      }
    }
  }

  // 마감이 지난 채 남은 시험은 시간 종료로 확정
  if (authIds.length > 0) {
    const cutoff = new Date(Date.now() - 5000).toISOString();
    const { data: stale } = await service
      .from("vocab_test_sessions")
      .select("id")
      .in("student_id", authIds)
      .eq("status", "in_progress")
      .not("deadline_at", "is", null)
      .lt("deadline_at", cutoff)
      .limit(100);
    for (const row of stale ?? []) await finalizeSession(service, row.id, "timeout");
  }

  const { data: sessionRows } = authIds.length
    ? await service
        .from("vocab_test_sessions")
        .select("id, student_id, day_number, kind, status, score, passed, pass_score, ended_by, deadline_at, started_at, duration_seconds, voided_at")
        .in("student_id", authIds)
        .gte("started_at", dayStart.toISOString())
        .lt("started_at", dayEnd.toISOString())
        .order("started_at", { ascending: true })
    : { data: [] as any[] };
  const sessionsByAuth = new Map<string, SessionRow[]>();
  for (const s of (sessionRows ?? []) as SessionRow[]) {
    const arr = sessionsByAuth.get(s.student_id) ?? [];
    arr.push(s);
    sessionsByAuth.set(s.student_id, arr);
  }

  // 아직 끝나지 않은 필수 재학습 / 복습시험 대기
  const academyIds = Array.from(new Set([...academyByAuth.values()].map((a) => a.id)));
  const { data: taskRows } = academyIds.length
    ? await service
        .from("vocab_remedial_tasks")
        .select("id, student_id, day_index, status, word_ids, retest_session_id")
        .in("student_id", academyIds)
        .in("status", ["open", "in_progress", "done"])
        .order("created_at", { ascending: true })
    : { data: [] as any[] };
  const retestIds = ((taskRows ?? []) as TaskRow[]).map((t) => t.retest_session_id).filter(Boolean) as string[];
  const gradedRetests = new Set<string>();
  if (retestIds.length > 0) {
    const { data: g } = await service.from("vocab_test_sessions").select("id").in("id", retestIds).eq("status", "graded");
    for (const r of g ?? []) gradedRetests.add(r.id);
  }
  const pendingByAcademy = new Map<string, TaskRow[]>();
  for (const t of (taskRows ?? []) as TaskRow[]) {
    if (t.status === "done" && t.retest_session_id && gradedRetests.has(t.retest_session_id)) continue;
    const arr = pendingByAcademy.get(t.student_id) ?? [];
    arr.push(t);
    pendingByAcademy.set(t.student_id, arr);
  }

  async function voidAction(formData: FormData) {
    "use server";
    await voidTestSessionAction(formData);
  }

  const prev = kstDateString(new Date(dayStart.getTime() - 12 * 60 * 60 * 1000));
  const next = kstDateString(new Date(dayStart.getTime() + 36 * 60 * 60 * 1000));

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">단어 시험 현황</h1>
          <p className="text-sm text-neutral-400">{day} · 응시 결과 / 필수 재학습 / 복습시험</p>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link href={`/teacher/vocab-exams?date=${prev}`} className="rounded border px-3 py-1 hover:bg-neutral-50">← 전날</Link>
          <Link href="/teacher/vocab-exams" className="rounded border px-3 py-1 hover:bg-neutral-50">오늘</Link>
          <Link href={`/teacher/vocab-exams?date=${next}`} className="rounded border px-3 py-1 hover:bg-neutral-50">다음날 →</Link>
        </nav>
      </header>

      {(classes ?? []).length === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">담당 반이 없어요.</div>
      )}

      {(classes ?? []).map((cls: any) => {
        const members = activeMembers.filter((m: any) => m.class_id === cls.id);
        return (
          <section key={cls.id} className="rounded-2xl border bg-white">
            <h2 className="border-b px-4 py-3 font-semibold text-neutral-900">{cls.name}</h2>
            {members.length === 0 ? (
              <p className="p-4 text-sm text-neutral-400">학생이 없어요.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-neutral-400">
                  <tr>
                    <th className="px-4 py-2">학생</th>
                    <th className="px-2 py-2">시험</th>
                    <th className="px-2 py-2">재학습 / 복습시험</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m: any) => {
                    const st = academyByAuth.get(m.student_id);
                    const sessions = sessionsByAuth.get(m.student_id) ?? [];
                    const pending = st ? (pendingByAcademy.get(st.id) ?? []) : [];
                    return (
                      <tr key={m.student_id} className="border-t align-top">
                        <td className="px-4 py-3 font-medium text-neutral-900">{st?.name ?? "(이름 없음)"}</td>
                        <td className="px-2 py-3">
                          {sessions.length === 0 ? (
                            <span className="text-neutral-400">응시 없음</span>
                          ) : (
                            <ul className="space-y-2">
                              {sessions.map((s) => {
                                const label = sessionLabel(s);
                                return (
                                  <li key={s.id} className="flex flex-wrap items-center gap-2">
                                    <span className="text-neutral-500">
                                      Day {s.day_number}{s.kind === "retest" ? " 복습" : ""} · {fmtTime(s.started_at)}
                                    </span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${label.cls}`}>{label.text}</span>
                                    {s.status === "graded" && !s.voided_at && (
                                      <span className="text-neutral-800">
                                        {s.score ?? "-"}점{s.pass_score ? ` (기준 ${s.pass_score})` : ""}
                                        {s.ended_by === "timeout" ? " · 시간 종료" : ""}
                                      </span>
                                    )}
                                    {s.status === "in_progress" && (
                                      <span className="text-neutral-500">마감 {fmtTime(s.deadline_at)}</span>
                                    )}
                                    {!s.voided_at && (
                                      <form action={voidAction} className="ml-auto flex items-center gap-1">
                                        <input type="hidden" name="session_id" value={s.id} />
                                        <input
                                          name="reason"
                                          placeholder="사유(선택)"
                                          className="w-28 rounded border px-2 py-0.5 text-xs"
                                        />
                                        <button className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-50">
                                          재응시 허용
                                        </button>
                                      </form>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          {pending.length === 0 ? (
                            <span className="text-neutral-400">-</span>
                          ) : (
                            <ul className="space-y-1">
                              {pending.map((t) => (
                                <li key={t.id} className="text-neutral-700">
                                  Day {t.day_index} ·{" "}
                                  {t.status === "done"
                                    ? <span className="text-amber-700">재학습 완료 · 복습시험 대기</span>
                                    : <span className="text-rose-700">재학습 {t.status === "open" ? "미시작" : "진행 중"}</span>}
                                  <span className="text-neutral-400"> ({t.word_ids.length}단어)</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </main>
  );
}
