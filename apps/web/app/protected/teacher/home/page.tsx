import Link from "next/link";
import { CalendarClock, ClipboardList, Clock, GraduationCap } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { listSessionsForDateAction } from "@/app/protected/teacher/session/actions";
import { formatKoreanDate, timeRange, todayKST } from "@/lib/classes/dates";
import { checkState } from "@/lib/classes/sessionBoard";
import { loadTeacherReviewOverview } from "@/lib/vocab/review/teacherReview";
import { loadUpcomingExams, sessionPhase } from "@/lib/dashboard/helpers";
import TeacherHiNaesinResultsCard from "@/components/teacher/TeacherHiNaesinResultsCard";
import TeacherVocabResultsCard from "@/components/teacher/TeacherVocabResultsCard";
import { Empty, Meter, StatusChip, type Severity } from "@/components/dashboard/board";
import {
  Card,
  ClickTile,
  DdayBadge,
  PlannedCard,
  ZoneSection,
} from "@/components/dashboard/zones";

export const dynamic = "force-dynamic";

/**
 * 선생님 홈 — 화면을 "수업"과 "숙제" 두 구역으로 나눈다.
 *  - 수업 구역: 오늘 수업 타임라인(지금/다음), 출석 체크, 시험 임박
 *  - 숙제 구역: 새 숙제 제출, 단어 복습(밀린 학생·오늘 복습·총 시험), Hi-내신/어휘 결과
 * 데이터가 아직 없는 위젯(보강, 학부모 문의, 정답률 급락)은 맨 아래 "준비 중" 카드로 자리만 잡는다.
 * 숫자는 만들어 내지 않는다 — 전부 실제 데이터이거나, 아예 표시하지 않는다.
 */

function ActionLink({ href, label, primary = false }: { href: string; label: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "rounded-xl bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
          : "rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
      }
    >
      {label}
    </Link>
  );
}

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
    teacherName = (profile?.full_name as string | null) ?? user.email ?? "선생님";
  }

  // ── 새 숙제 제출 (최근 48시간) ──────────────────────────────
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: newSubmissions } = await supabase
    .from("photo_homework_submissions")
    .select("id, homework_id, student_id, correct_count, total_count, graded_at")
    .gte("graded_at", since48h)
    .order("graded_at", { ascending: false })
    .limit(20);

  const newSubHwIds = [...new Set((newSubmissions ?? []).map((s: any) => s.homework_id as string))];
  const { data: newSubHws } =
    newSubHwIds.length > 0
      ? await supabase.from("photo_homework").select("id, title").in("id", newSubHwIds)
      : { data: [] };
  const newSubHwMap = new Map((newSubHws ?? []).map((h: any) => [h.id as string, h.title as string]));

  const newSubStudentIds = [...new Set((newSubmissions ?? []).map((s: any) => s.student_id as string))];
  const { data: newSubProfiles } =
    newSubStudentIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, name, email").in("id", newSubStudentIds)
      : { data: [] };
  const newSubProfileMap = new Map(
    (newSubProfiles ?? []).map((p: any) => [
      p.id as string,
      (p.full_name ?? p.name ?? p.email ?? "학생") as string,
    ]),
  );

  const recentSubmissions = (newSubmissions ?? []).map((s: any) => ({
    id: s.id as string,
    hwId: s.homework_id as string,
    homeworkTitle: newSubHwMap.get(s.homework_id) ?? "숙제",
    studentName: newSubProfileMap.get(s.student_id) ?? "학생",
    scorePct: s.total_count > 0 ? Math.round((s.correct_count / s.total_count) * 100) : (null as number | null),
    gradedAt: s.graded_at as string,
  }));

  // ── 오늘의 수업 · 복습 현황 · 시험 임박 ───────────────────────
  const today = todayKST();
  const [sessionsRes, review, upcoming] = await Promise.all([
    listSessionsForDateAction({ date: today }),
    loadTeacherReviewOverview(getServiceSupabase()).catch(() => null),
    loadUpcomingExams(getServiceSupabase(), today),
  ]);

  const allSessions = (sessionsRes.sessions ?? []).filter((s) => s.status !== "cancelled");
  // 담당 수업이 있으면 "내 수업", 없으면(예: 관리자 미리보기) 전체 수업을 보여준다
  const mine = allSessions.filter((s) => s.is_mine);
  const sessions = mine.length > 0 ? mine : allSessions;
  const sessionsTitle = mine.length > 0 ? "내 오늘 수업" : "오늘의 수업";

  const timeline = sessions.map((s) => ({ s, phase: sessionPhase(s.start_time, s.duration_min) }));
  const nextId = timeline.find((t) => t.phase === "upcoming")?.s.id ?? null;

  const uncheckedSessions = sessions.filter((s) => s.summary.total > 0 && s.summary.unchecked > 0).length;
  const totalStudentsToday = sessions.reduce((n, s) => n + s.summary.total, 0);
  const checkedStudentsToday = sessions.reduce((n, s) => n + (s.summary.total - s.summary.unchecked), 0);
  const checkPct = totalStudentsToday > 0 ? Math.round((checkedStudentsToday / totalStudentsToday) * 100) : null;
  const remainingSessions = timeline.filter((t) => t.phase !== "done").length;

  const exams = upcoming.exams;

  const dueOnly = review ? Math.max(0, review.counts.withDue - review.counts.late) : null;
  const lateStudents = review ? review.rows.filter((r) => r.status === "late").slice(0, 5) : [];

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      <header>
        <p className="text-xs font-semibold text-neutral-500">{formatKoreanDate(today)}</p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          {teacherName && !teacherName.includes("@") ? `${teacherName} 선생님` : "선생님"}, 오늘 할 일
        </h1>
      </header>

      {/* ════════════ 수업 구역 ════════════ */}
      <ZoneSection
        tone="class"
        title="수업"
        hint="오늘 수업과 출석, 다가오는 시험"
        icon={<GraduationCap className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-2">
          <ActionLink href="/teacher/session" label="출석 체크" primary />
          <ActionLink href="/teacher/lesson-log" label="수업 로그" />
          <ActionLink href="/teacher/exam-schedule" label="시험 배정" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <ClickTile
            label="출석 체크가 안 된 수업"
            count={sessionsRes.ok ? uncheckedSessions : null}
            unit="개"
            sub={`${totalStudentsToday - checkedStudentsToday}명의 출석 기록이 없어요`}
            severity="critical"
            href="/teacher/session"
            cta="출석 체크"
          />
          <ClickTile
            label="남은 수업"
            count={sessionsRes.ok ? remainingSessions : null}
            unit="개"
            sub={`${sessionsTitle} ${sessions.length}개 중 · 학생 ${totalStudentsToday}명`}
            severity="info"
            href="/teacher/session"
            cta="수업 보기"
          />
          <div className="col-span-2 lg:col-span-1">
            <ClickTile
              label="시험 임박 (7일 이내)"
              count={upcoming.error ? null : exams.filter((e) => e.days <= 7).length}
              unit="건"
              sub={exams[0] ? `${exams[0].title} · ${exams[0].count}명` : ""}
              severity="serious"
              href="/teacher/exam-schedule"
              cta="시험 보기"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Card title={sessionsTitle} href="/teacher/session" cta="수업 보기">
              {timeline.length === 0 ? (
                <Empty text="오늘은 수업이 없어요." />
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {timeline.map(({ s, phase }) => {
                    const state = checkState(s.summary);
                    const checked = s.summary.total - s.summary.unchecked;
                    const pct = s.summary.total > 0 ? Math.round((checked / s.summary.total) * 100) : 100;
                    const sev: Severity = state === "done" ? "good" : state === "partial" ? "warning" : "critical";
                    const isLive = phase === "live";
                    return (
                      <li key={s.id} className={isLive ? "bg-indigo-50/60" : phase === "done" ? "opacity-70" : ""}>
                        <Link
                          href={`/teacher/session/${s.id}`}
                          className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                        >
                          <div className="w-[104px] shrink-0">
                            <div className="flex items-center gap-1 text-xs font-semibold tabular-nums text-neutral-900">
                              <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                              {timeRange(s.start_time, s.duration_min)}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold text-neutral-900">{s.class_name}</span>
                              {isLive ? (
                                <span className="shrink-0 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                                  진행 중
                                </span>
                              ) : s.id === nextId ? (
                                <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                                  다음 수업
                                </span>
                              ) : phase === "done" ? (
                                <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-500">
                                  종료
                                </span>
                              ) : null}
                            </div>
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
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card title="시험 임박" href="/teacher/exam-schedule" cta="배정 보기">
              {exams.length === 0 ? (
                <Empty text="2주 안에 시작하는 시험이 없어요." good />
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {exams.slice(0, 5).map((e) => (
                    <li key={`${e.title}|${e.start}`} className="flex items-center gap-3 px-5 py-3">
                      <DdayBadge days={e.days} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-neutral-900">{e.title}</div>
                        <div className="text-xs text-neutral-500">
                          학생 {e.count}명 · {e.start.slice(5).replace("-", "/")}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {checkPct != null ? (
          <p className="text-xs text-neutral-500">
            오늘 출석 체크 진행 {checkPct}% ({checkedStudentsToday}/{totalStudentsToday}명)
          </p>
        ) : null}
      </ZoneSection>

      {/* ════════════ 숙제 구역 ════════════ */}
      <ZoneSection
        tone="homework"
        title="숙제"
        hint="학생들이 집에서 한 숙제와 단어 복습"
        icon={<ClipboardList className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-2">
          <ActionLink href="/admin/homework" label="숙제 보기" primary />
          <ActionLink href="/teacher/vocab-exams" label="단어 시험" />
          <ActionLink href="/teacher/vocab-review" label="복습 현황" />
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ClickTile
            label="복습이 2일 이상 밀린 학생"
            count={review ? review.counts.late : null}
            unit="명"
            sub="복습은 학습 다음 날부터 해야 해요"
            severity="serious"
            href="/teacher/vocab-review"
            cta="학생 보기"
          />
          <ClickTile
            label="오늘 복습할 학생"
            count={dueOnly}
            unit="명"
            sub="기한 안에 있는 복습이에요"
            severity="info"
            href="/teacher/vocab-review"
            cta="현황 보기"
          />
          <ClickTile
            label="새 숙제 제출 (48시간)"
            count={recentSubmissions.length}
            unit="건"
            sub="자동 채점된 결과예요"
            severity="info"
            href="#submissions"
            cta="보기"
          />
          <ClickTile
            label="총 시험 시기가 된 학생"
            count={review ? review.counts.totalDue : null}
            unit="명"
            sub="한 달에 한 번 열리는 누적 시험"
            severity="info"
            href="/teacher/vocab-review"
            cta="현황 보기"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="복습이 밀린 학생" href="/teacher/vocab-review" cta="전체 보기">
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
          </Card>

          <div id="submissions" className="scroll-mt-20">
            <Card title="새 숙제 제출 (최근 48시간)" href="/admin/homework" cta="전체 보기">
              {recentSubmissions.length === 0 ? (
                <Empty text="새로 제출된 숙제가 없어요." good />
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {recentSubmissions.slice(0, 5).map((sub) => {
                    const scoreColor =
                      sub.scorePct === null
                        ? "text-neutral-500"
                        : sub.scorePct >= 80
                          ? "text-emerald-600"
                          : sub.scorePct >= 60
                            ? "text-amber-600"
                            : "text-red-600";
                    const mins = Math.floor((Date.now() - new Date(sub.gradedAt).getTime()) / 60000);
                    const timeAgo =
                      mins < 60 ? `${mins}분 전` : mins < 1440 ? `${Math.floor(mins / 60)}시간 전` : `${Math.floor(mins / 1440)}일 전`;
                    return (
                      <li key={sub.id}>
                        <Link
                          href={`/admin/homework/${sub.hwId}`}
                          className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-neutral-50"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-neutral-900">{sub.studentName}</p>
                            <p className="truncate text-xs text-neutral-500">
                              {sub.homeworkTitle} · {timeAgo}
                            </p>
                          </div>
                          {sub.scorePct !== null ? (
                            <span className={`shrink-0 text-sm font-bold tabular-nums ${scoreColor}`}>{sub.scorePct}%</span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold text-neutral-900">Hi-내신 드릴 결과</h3>
          <TeacherHiNaesinResultsCard />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-bold text-neutral-900">어휘 학습 현황</h3>
          <TeacherVocabResultsCard />
        </div>
      </ZoneSection>

      {/* ════════════ 준비 중 (데이터 없음) ════════════ */}
      <section aria-label="준비 중인 위젯" className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          준비 중인 기능
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <PlannedCard title="보강 필요" note="결석·지각 학생의 보강 일정 기능과 함께 제공돼요." />
          <PlannedCard title="학부모 문의" note="학부모 문의·상담 기능과 함께 제공돼요." />
          <PlannedCard title="정답률 급락 학생" note="최근 3회 시험 기준 추이 집계를 준비하고 있어요." />
        </div>
      </section>
    </main>
  );
}
