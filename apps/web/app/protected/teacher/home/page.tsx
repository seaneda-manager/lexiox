import Link from "next/link";
import { Clock } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { listSessionsForDateAction } from "@/app/protected/teacher/session/actions";
import { formatKoreanDate, timeRange, todayKST } from "@/lib/classes/dates";
import { checkState } from "@/lib/classes/sessionBoard";
import { loadTeacherReviewOverview } from "@/lib/vocab/review/teacherReview";
import TeacherHiNaesinResultsCard from "@/components/teacher/TeacherHiNaesinResultsCard";
import TeacherVocabResultsCard from "@/components/teacher/TeacherVocabResultsCard";
import {
  ActionBoard,
  Empty,
  Meter,
  PanelHeader,
  StatTile,
  StatusChip,
  splitActionItems,
  type ActionItem,
  type Severity,
} from "@/components/dashboard/board";

export const dynamic = "force-dynamic";

/**
 * 선생님 홈 — "오늘 할 일".
 * 예전에는 오늘의 수업·일정·할 일·성적 추이·코멘트가 코드에 직접 적어 둔 가짜 데이터(mock)였다.
 * 지금은 전부 실제 데이터: 내 오늘 수업·출석 체크, 복습이 밀린 학생, 새 숙제 제출.
 */

export default async function TeacherHomePage() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 선생님 이름 (프로필 없으면 이메일, 그것도 없으면 기본값)
  let teacherName = "선생님";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    teacherName =
      (profile?.full_name as string | null) ?? user.email ?? "선생님";
  }

  // ── 새 숙제 제출 (최근 48시간) ──────────────────────────────
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: newSubmissions } = await supabase
    .from('photo_homework_submissions')
    .select('id, homework_id, student_id, correct_count, total_count, graded_at')
    .gte('graded_at', since48h)
    .order('graded_at', { ascending: false })
    .limit(20);

  // 관련 숙제 제목
  const newSubHwIds = [...new Set((newSubmissions ?? []).map((s: any) => s.homework_id as string))];
  const { data: newSubHws } = newSubHwIds.length > 0
    ? await supabase.from('photo_homework').select('id, title').in('id', newSubHwIds)
    : { data: [] };
  const newSubHwMap = new Map((newSubHws ?? []).map((h: any) => [h.id as string, h.title as string]));

  // 제출한 학생 이름
  const newSubStudentIds = [...new Set((newSubmissions ?? []).map((s: any) => s.student_id as string))];
  const { data: newSubProfiles } = newSubStudentIds.length > 0
    ? await supabase.from('profiles').select('id, full_name, name, email').in('id', newSubStudentIds)
    : { data: [] };
  const newSubProfileMap = new Map(
    (newSubProfiles ?? []).map((p: any) => [
      p.id as string,
      (p.full_name ?? p.name ?? p.email ?? '학생') as string,
    ]),
  );

  type NewSubmission = {
    id: string;
    homeworkTitle: string;
    studentName: string;
    scorePct: number | null;
    correctCount: number;
    totalCount: number;
    gradedAt: string;
    hwId: string;
  };

  const recentSubmissions: NewSubmission[] = (newSubmissions ?? []).map((s: any) => ({
    id:            s.id,
    hwId:          s.homework_id,
    homeworkTitle: newSubHwMap.get(s.homework_id) ?? '숙제',
    studentName:   newSubProfileMap.get(s.student_id) ?? '학생',
    scorePct:      s.total_count > 0 ? Math.round((s.correct_count / s.total_count) * 100) : null,
    correctCount:  s.correct_count ?? 0,
    totalCount:    s.total_count ?? 0,
    gradedAt:      s.graded_at,
  }));

  // ── 오늘의 수업(실제) · 복습 현황 ─────────────────────────────
  const today = todayKST();
  const [sessionsRes, review] = await Promise.all([
    listSessionsForDateAction({ date: today }),
    loadTeacherReviewOverview(getServiceSupabase()).catch(() => null),
  ]);
  const allSessions = (sessionsRes.sessions ?? []).filter((s) => s.status !== "cancelled");
  // 담당 수업이 있으면 "내 수업", 없으면(예: 관리자 미리보기) 전체 수업을 보여준다
  const mine = allSessions.filter((s) => s.is_mine);
  const sessions = mine.length > 0 ? mine : allSessions;
  const sessionsTitle = mine.length > 0 ? "내 오늘 수업" : "오늘의 수업";

  const uncheckedSessions = sessions.filter((s) => s.summary.total > 0 && s.summary.unchecked > 0).length;
  const totalStudentsToday = sessions.reduce((n, s) => n + s.summary.total, 0);
  const checkedStudentsToday = sessions.reduce((n, s) => n + (s.summary.total - s.summary.unchecked), 0);
  const checkPct = totalStudentsToday > 0 ? Math.round((checkedStudentsToday / totalStudentsToday) * 100) : null;
  const dueOnly = review ? Math.max(0, review.counts.withDue - review.counts.late) : null;
  const lateStudents = review ? review.rows.filter((r) => r.status === "late").slice(0, 5) : [];

  const items: ActionItem[] = [
    {
      key: "attendance",
      count: sessionsRes.ok ? uncheckedSessions : null,
      title: "출석 체크가 안 된 수업",
      desc: sessionsRes.ok ? `${totalStudentsToday - checkedStudentsToday}명의 출석 기록이 없어요` : "수업을 불러오지 못했어요",
      severity: "critical",
      href: "/teacher/session",
      cta: "출석 체크",
      okLabel: "출석 체크",
      unit: "개",
    },
    {
      key: "review-late",
      count: review ? review.counts.late : null,
      title: "복습이 2일 이상 밀린 학생",
      desc: "복습은 학습 다음 날부터 해야 해요",
      severity: "serious",
      href: "/teacher/vocab-review",
      cta: "학생 보기",
      okLabel: "복습 지연",
      unit: "명",
    },
    {
      key: "submissions",
      count: recentSubmissions.length,
      title: "새 숙제 제출 (최근 48시간)",
      desc: "자동 채점된 결과를 확인해 보세요",
      severity: "info",
      href: "#submissions",
      cta: "보기",
      okLabel: "새 숙제",
      unit: "건",
    },
    {
      key: "review-due",
      count: dueOnly,
      title: "오늘 복습할 학생",
      desc: "기한 안에 있는 복습이에요",
      severity: "info",
      href: "/teacher/vocab-review",
      cta: "현황 보기",
      okLabel: "오늘 복습",
      unit: "명",
    },
    {
      key: "total-exam",
      count: review ? review.counts.totalDue : null,
      title: "총 시험 시기가 된 학생",
      desc: "한 달에 한 번 열리는 누적 시험",
      severity: "info",
      href: "/teacher/vocab-review",
      cta: "현황 보기",
      okLabel: "총 시험",
      unit: "명",
    },
  ];
  const { todo, failed, clear } = splitActionItems(items);

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header>
        <p className="text-xs font-semibold text-neutral-500">{formatKoreanDate(today)}</p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {teacherName && !teacherName.includes("@") ? `${teacherName} 선생님` : "선생님"}, 오늘 할 일
        </h1>
      </header>

      <ActionBoard heroLabel="오늘 확인할 일" todo={todo} failed={failed} clear={clear} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label={sessionsTitle} value={String(sessions.length)} unit="개" sub={`학생 ${totalStudentsToday}명`} />
        <StatTile
          label="출석 체크 진행"
          value={checkPct != null ? String(checkPct) : "—"}
          unit={checkPct != null ? "%" : ""}
          sub={`${checkedStudentsToday}/${totalStudentsToday}명 체크`}
          meter={
            checkPct != null
              ? { pct: checkPct, severity: checkPct === 100 ? "good" : checkPct >= 50 ? "warning" : "critical" }
              : undefined
          }
        />
        <StatTile label="새 숙제 제출" value={String(recentSubmissions.length)} unit="건" sub="최근 48시간" />
        <StatTile
          label="오늘 복습할 학생"
          value={review ? String(review.counts.withDue) : "—"}
          unit="명"
          sub={review ? `2일 이상 밀린 학생 ${review.counts.late}명` : "불러오지 못했어요"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white">
          <PanelHeader title={sessionsTitle} href="/teacher/session" cta="수업 보기" />
          {sessions.length === 0 ? (
            <Empty text="오늘은 수업이 없어요." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {sessions.map((s) => {
                const state = checkState(s.summary);
                const checked = s.summary.total - s.summary.unchecked;
                const pct = s.summary.total > 0 ? Math.round((checked / s.summary.total) * 100) : 100;
                const sev: Severity = state === "done" ? "good" : state === "partial" ? "warning" : "critical";
                return (
                  <li key={s.id}>
                    <Link
                      href={`/teacher/session/${s.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                    >
                      <div className="w-[104px] shrink-0">
                        <div className="flex items-center gap-1 text-xs font-semibold tabular-nums text-neutral-900">
                          <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                          {timeRange(s.start_time, s.duration_min)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-neutral-900">{s.class_name}</div>
                        <div className="truncate text-xs text-neutral-500">학생 {s.summary.total}명</div>
                        <Meter pct={pct} severity={sev} label={`출석 체크 ${checked}/${s.summary.total}명`} />
                      </div>
                      <StatusChip
                        severity={sev}
                        label={state === "done" ? "체크 완료" : state === "partial" ? "일부 체크" : "미체크"}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white">
          <PanelHeader title="복습이 밀린 학생" href="/teacher/vocab-review" cta="전체 보기" />
          {lateStudents.length === 0 ? (
            <Empty text="2일 이상 밀린 학생이 없어요." good />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {lateStudents.map((r) => (
                <li key={r.studentId} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-neutral-900">{r.name}</div>
                    <div className="truncate text-xs text-neutral-500">
                      {r.classNames.join(", ") || [r.school, r.grade].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <StatusChip severity="serious" label={`${r.summary.dueCount}개 · ${r.summary.overdueDays}일째`} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div id="submissions" className="scroll-mt-20">
      {/* ── 새 숙제 제출 알림 ─────────────────────────────────── */}
      {recentSubmissions.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {recentSubmissions.length}
              </span>
              <h2 className="text-sm font-semibold text-amber-900">
                새 숙제 제출 (최근 48시간)
              </h2>
            </div>
            <a
              href="/admin/homework"
              className="text-xs text-amber-700 hover:underline"
            >
              전체 보기 →
            </a>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recentSubmissions.map((sub) => {
              const scoreColor =
                sub.scorePct === null    ? 'text-neutral-500' :
                sub.scorePct >= 80       ? 'text-emerald-600' :
                sub.scorePct >= 60       ? 'text-amber-600'   :
                                           'text-red-500';
              const timeAgo = (() => {
                const diff = Date.now() - new Date(sub.gradedAt).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 60) return `${mins}분 전`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs}시간 전`;
                return `${Math.floor(hrs / 24)}일 전`;
              })();
              return (
                <a
                  key={sub.id}
                  href={`/admin/homework/${sub.hwId}`}
                  className="flex items-center justify-between rounded-xl border border-amber-200 bg-white px-3 py-2.5 hover:shadow-sm transition"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-neutral-800 truncate">
                      {sub.studentName}
                    </p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {sub.homeworkTitle} · {timeAgo}
                    </p>
                  </div>
                  {sub.scorePct !== null && (
                    <span className={`shrink-0 ml-2 text-sm font-black ${scoreColor}`}>
                      {sub.scorePct}%
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      )}
      </div>

      <section>
        <h2 className="mb-3 text-base font-bold text-neutral-900">Hi-내신 드릴 결과</h2>
        <TeacherHiNaesinResultsCard />
      </section>

      <section>
        <h2 className="mb-3 text-base font-bold text-neutral-900">어휘 학습 현황</h2>
        <TeacherVocabResultsCard />
      </section>
    </main>
  );
}
