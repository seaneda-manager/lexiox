import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, ClipboardList, Clock, GraduationCap } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getDayOverviewAction } from "@/app/protected/admin/attendance/actions";
import { formatKoreanDate, timeRange, todayKST } from "@/lib/classes/dates";
import { checkState } from "@/lib/classes/sessionBoard";
import { loadTeacherReviewOverview } from "@/lib/vocab/review/teacherReview";
import { loadUpcomingExams, sessionPhase } from "@/lib/dashboard/helpers";
import { Empty, Meter, StatTile, StatusChip, type Severity } from "@/components/dashboard/board";
import { Card, ClickTile, DdayBadge, PlannedCard, ZoneSection } from "@/components/dashboard/zones";

export const dynamic = "force-dynamic";

/**
 * 원장 홈 — 선생님 홈과 같은 틀(수업 / 숙제 두 구역)에 원장 관점의 현황판.
 *  - 수업 구역: 출석률, 오늘 수업 현황(반·선생님·출석·진행 상태), 선생님별 출석 체크 대기, 시험 D-day
 *  - 숙제 구역: 복습 지연, 오늘 복습, 오답 검토 대기, 총 시험
 * 수납·퇴원 위험·상담 퍼널·민원·반 정원은 아직 데이터가 없어 맨 아래 "준비 중" 카드로만 둔다.
 * (디자인 원칙은 components/dashboard/board.tsx · zones.tsx)
 */
export default async function FranchiseHomePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/franchise/home");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = me?.role as string | undefined;
  if (role !== "admin" && role !== "franchisee" && role !== "hq_staff") {
    redirect(role === "teacher" ? "/teacher/home" : "/student");
  }

  const db = getServiceSupabase();
  const today = todayKST();
  const [dayRes, review, wrong, upcoming] = await Promise.all([
    getDayOverviewAction({}),
    loadTeacherReviewOverview(db).catch(() => null),
    db
      .from("hi_naesin_drill_responses")
      .select("id", { count: "exact", head: true })
      .eq("is_correct", false)
      .is("reviewed_at", null),
    loadUpcomingExams(db, today),
  ]);

  const day = dayRes.overview ?? null;
  const t = day?.totals;
  const counted = t ? t.present + t.late + t.absent : 0;
  const attendanceRate = t && counted > 0 ? Math.round(((t.present + t.late) / counted) * 100) : null;
  const dueOnly = review ? Math.max(0, review.counts.withDue - review.counts.late) : null;
  const lateStudents = review ? review.rows.filter((r) => r.status === "late").slice(0, 5) : [];
  const exams = upcoming.exams;

  const timeline = (day?.sessions ?? []).map((s) => ({ s, phase: sessionPhase(s.start_time, s.duration_min) }));
  const liveCount = timeline.filter((x) => x.phase === "live").length;
  const nextId = timeline.find((x) => x.phase === "upcoming")?.s.id ?? null;

  // 선생님별 출석 체크 대기 (출석 기록이 비어 있는 수업 수), 많은 순
  const pendingByTeacher = new Map<string, number>();
  for (const { s } of timeline) {
    if (s.summary.total > 0 && s.summary.unchecked > 0) {
      const name = s.teacher_name ?? "담당 미정";
      pendingByTeacher.set(name, (pendingByTeacher.get(name) ?? 0) + 1);
    }
  }
  const pendingRows = [...pendingByTeacher.entries()].sort((a, b) => b[1] - a[1]);
  const pendingMax = pendingRows[0]?.[1] ?? 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold text-neutral-500">{day ? formatKoreanDate(day.date) : "오늘"}</p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">오늘 현황</h1>
      </header>

      {/* ════════════ 수업 구역 ════════════ */}
      <ZoneSection
        tone="class"
        title="수업"
        hint="오늘 수업 진행과 출석, 선생님별 대기, 다가오는 시험"
        icon={<GraduationCap className="h-5 w-5" />}
      >
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/attendance"
            className="rounded-xl bg-neutral-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            출석 체크
          </Link>
          <Link
            href="/admin/students"
            className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
          >
            학생 추가
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="오늘 출석률"
            value={attendanceRate != null ? String(attendanceRate) : "—"}
            unit={attendanceRate != null ? "%" : ""}
            sub={t ? `출석 ${t.present} · 지각 ${t.late} · 결석 ${t.absent}` : "불러오지 못했어요"}
            meter={
              attendanceRate != null
                ? { pct: attendanceRate, severity: attendanceRate >= 90 ? "good" : attendanceRate >= 75 ? "warning" : "critical" }
                : undefined
            }
          />
          <ClickTile
            label="출석 체크가 안 된 수업"
            count={day ? day.uncheckedSessions : null}
            unit="개"
            sub={t ? `${t.unchecked}명의 출석 기록이 없어요` : ""}
            severity="critical"
            href="/admin/attendance"
            cta="출석 체크"
          />
          <StatTile
            label="오늘 수업"
            value={day ? String(day.sessions.length) : "—"}
            unit="개"
            sub={day ? `진행 중 ${liveCount}개 · 체크 완료 ${day.sessions.filter((s) => checkState(s.summary) === "done").length}개` : "불러오지 못했어요"}
          />
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

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Card title="오늘 수업 현황" href="/admin/attendance" cta="출석 보기">
              {timeline.length === 0 ? (
                <Empty text="오늘은 수업이 없어요." />
              ) : (
                <ul className="divide-y divide-neutral-100">
                  {timeline.map(({ s, phase }) => {
                    const state = checkState(s.summary);
                    const checked = s.summary.total - s.summary.unchecked;
                    const pct = s.summary.total > 0 ? Math.round((checked / s.summary.total) * 100) : 100;
                    const sev: Severity = state === "done" ? "good" : state === "partial" ? "warning" : "critical";
                    return (
                      <li
                        key={s.id}
                        className={`flex items-center gap-4 px-5 py-3.5 ${
                          phase === "live" ? "bg-indigo-50/60" : phase === "done" ? "opacity-70" : ""
                        }`}
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
                            {phase === "live" ? (
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
                          <div className="truncate text-xs text-neutral-500">
                            {s.teacher_name ?? "담당 미정"} · 학생 {s.summary.total}명
                          </div>
                          <Meter pct={pct} severity={sev} label={`출석 체크 ${checked}/${s.summary.total}명`} />
                        </div>
                        <StatusChip
                          severity={sev}
                          label={state === "done" ? "체크 완료" : state === "partial" ? "일부 체크" : "미체크"}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div className="space-y-4 lg:col-span-4">
            <Card title="선생님별 출석 체크 대기">
              {pendingRows.length === 0 ? (
                <Empty text="대기 중인 수업이 없어요." good />
              ) : (
                <ul className="space-y-3 px-5 py-4">
                  {pendingRows.map(([name, n]) => (
                    <li key={name}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-neutral-900">{name}</span>
                        <span className="tabular-nums text-neutral-500">{n}개</span>
                      </div>
                      <Meter pct={(n / pendingMax) * 100} severity="info" label={`${name} 대기 ${n}개`} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="학교별 시험 D-day" href="/teacher/exam-schedule" cta="배정 보기">
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
      </ZoneSection>

      {/* ════════════ 숙제 구역 ════════════ */}
      <ZoneSection
        tone="homework"
        title="숙제"
        hint="집에서 하는 단어 복습과 드릴 오답 검토"
        icon={<ClipboardList className="h-5 w-5" />}
      >
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
            label="오답 검토 대기"
            count={wrong.error ? null : (wrong.count ?? 0)}
            unit="건"
            sub="Hi-내신 드릴에서 틀린 문제"
            severity="warning"
            href="/admin/hi-naesin/wrong-answers"
            cta="검토하기"
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
            label="총 시험 시기가 된 학생"
            count={review ? review.counts.totalDue : null}
            unit="명"
            sub="기본 30일마다 열려요"
            severity="info"
            href="/teacher/vocab-review"
            cta="현황 보기"
          />
        </div>

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
      </ZoneSection>

      {/* ════════════ 준비 중 (데이터 없음) ════════════ */}
      <section aria-label="준비 중인 위젯" className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          준비 중인 기능
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PlannedCard title="수납 현황" note="미납·결제 예정·카드 실패. 수납 기능과 함께 제공돼요." />
          <PlannedCard title="퇴원 위험 학생" note="결석·숙제·성적 신호를 묶어 보여 줘요. 신호 집계를 준비 중이에요." />
          <PlannedCard title="신규 상담 → 등록 퍼널" note="문의·레벨테스트·등록 흐름. 상담 기능과 함께 제공돼요." />
          <PlannedCard title="학부모 민원·요청" note="선생님에게서 넘어온 건. 문의 기능과 함께 제공돼요." />
          <PlannedCard title="반별 정원" note="정원 대비 인원과 충원이 필요한 반을 보여 줘요." />
        </div>
      </section>
    </div>
  );
}
