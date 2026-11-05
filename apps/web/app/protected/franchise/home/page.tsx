import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, UserPlus } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getDayOverviewAction } from "@/app/protected/admin/attendance/actions";
import { formatKoreanDate, timeRange } from "@/lib/classes/dates";
import { checkState } from "@/lib/classes/sessionBoard";
import { loadTeacherReviewOverview } from "@/lib/vocab/review/teacherReview";
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

/** 원장 홈 — "오늘 현황": 지금 처리해야 할 일을 한눈에. (디자인 원칙은 components/dashboard/board.tsx) */
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
  const [dayRes, review, wrong] = await Promise.all([
    getDayOverviewAction({}),
    loadTeacherReviewOverview(db).catch(() => null),
    db
      .from("hi_naesin_drill_responses")
      .select("id", { count: "exact", head: true })
      .eq("is_correct", false)
      .is("reviewed_at", null),
  ]);

  const day = dayRes.overview ?? null;
  const t = day?.totals;
  const counted = t ? t.present + t.late + t.absent : 0;
  const attendanceRate = t && counted > 0 ? Math.round(((t.present + t.late) / counted) * 100) : null;
  const dueOnly = review ? Math.max(0, review.counts.withDue - review.counts.late) : null;

  const items: ActionItem[] = [
    {
      key: "attendance",
      count: day ? day.uncheckedSessions : null,
      title: "출석 체크가 안 된 수업",
      desc: day && t ? `${t.unchecked}명의 출석 기록이 없어요` : "출석 현황을 불러오지 못했어요",
      severity: "critical",
      href: "/admin/attendance",
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
      key: "wrong",
      count: wrong.count ?? null,
      title: "오답 검토 대기",
      desc: "Hi-내신 드릴에서 틀린 문제",
      severity: "warning",
      href: "/admin/hi-naesin/wrong-answers",
      cta: "검토하기",
      okLabel: "오답 검토",
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
  const lateStudents = review ? review.rows.filter((r) => r.status === "late").slice(0, 5) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-neutral-500">{day ? formatKoreanDate(day.date) : "오늘"}</p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">오늘 현황</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/attendance"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <CheckCircle2 className="h-4 w-4 text-neutral-500" aria-hidden />
            출석 체크
          </Link>
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            학생 추가
          </Link>
        </div>
      </header>

      <ActionBoard todo={todo} failed={failed} clear={clear} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="오늘 수업"
          value={day ? String(day.sessions.length) : "—"}
          unit="개"
          sub={day ? `출석 체크 완료 ${day.sessions.filter((s) => checkState(s.summary) === "done").length}개` : "불러오지 못했어요"}
        />
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
        <StatTile
          label="복습 기록이 있는 학생"
          value={review ? String(review.counts.students) : "—"}
          unit="명"
          sub={review ? `오늘 복습할 학생 ${review.counts.withDue}명` : "불러오지 못했어요"}
        />
        <StatTile label="총 시험 시기" value={review ? String(review.counts.totalDue) : "—"} unit="명" sub="기본 30일마다 열려요" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-neutral-200 bg-white">
          <PanelHeader title="오늘의 수업" href="/teacher/session" cta="수업 보기" />
          {!day || day.sessions.length === 0 ? (
            <Empty text="오늘은 수업이 없어요." />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {day.sessions.map((s) => {
                const state = checkState(s.summary);
                const checked = s.summary.total - s.summary.unchecked;
                const pct = s.summary.total > 0 ? Math.round((checked / s.summary.total) * 100) : 100;
                const sev: Severity = state === "done" ? "good" : state === "partial" ? "warning" : "critical";
                return (
                  <li key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-[104px] shrink-0">
                      <div className="flex items-center gap-1 text-xs font-semibold tabular-nums text-neutral-900">
                        <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                        {timeRange(s.start_time, s.duration_min)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-neutral-900">{s.class_name}</div>
                      <div className="truncate text-xs text-neutral-500">{s.teacher_name ?? "담당 미정"}</div>
                      <Meter pct={pct} severity={sev} label={`출석 체크 ${checked}/${s.summary.total}명`} />
                    </div>
                    <StatusChip severity={sev} label={state === "done" ? "체크 완료" : state === "partial" ? "일부 체크" : "미체크"} />
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
    </div>
  );
}
