/**
 * Super(admin) 대문 위젯 — 선생님 홈 · 원장 홈 · 본사 관제실을 요약해서 한 줄에 박아 둔다.
 * 사이드바를 누르지 않아도 여기서 바로 그 화면(제목의 "열기")이나 처리할 곳(타일)으로 갈 수 있다.
 * 같은 집계 함수를 쓰므로 각 화면과 숫자가 어긋나지 않는다. 한 가지 집계가 실패해도 그 타일만 "—"로 보인다.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, Building2, GraduationCap, Store } from "lucide-react";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getDayOverviewAction } from "@/app/protected/admin/attendance/actions";
import { todayKST } from "@/lib/classes/dates";
import { loadTeacherReviewOverview } from "@/lib/vocab/review/teacherReview";
import { loadAiCostSummary } from "@/lib/dashboard/aiCost";
import { loadUpcomingExams, sessionPhase } from "@/lib/dashboard/helpers";
import { ClickTile } from "./zones";

type Count = number | null;

async function safeCount(run: () => PromiseLike<{ count: number | null; error: unknown }>): Promise<Count> {
  try {
    const r = await run();
    return r.error ? null : (r.count ?? 0);
  } catch {
    return null;
  }
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Widget({
  title,
  sub,
  href,
  accent,
  icon,
  children,
}: {
  title: string;
  sub: string;
  href: string;
  accent: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border bg-white" style={{ borderColor: `${accent}55` }}>
      <Link
        href={href}
        className="group flex items-center gap-3 px-4 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-neutral-900"
        style={{ background: `${accent}14`, borderBottom: `1px solid ${accent}33` }}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: accent }} aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-neutral-900">{title}</span>
          <span className="block truncate text-xs text-neutral-500">{sub}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-neutral-600 group-hover:text-neutral-900">
          열기
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </Link>
      <div className="grid flex-1 grid-cols-2 gap-2.5 p-3">{children}</div>
    </section>
  );
}

/** 숫자가 단위 있는 문자열인 타일(예: 달러) — 누르면 이동 */
function LinkStat({ label, value, sub, href }: { label: string; value: string; sub: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-neutral-200 bg-white p-4 transition hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
    >
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900" style={{ fontVariantNumeric: "proportional-nums" }}>
        {value}
      </div>
      <div className="mt-1.5 text-xs leading-snug text-neutral-500">{sub}</div>
    </Link>
  );
}

export function SuperGateFallback() {
  return (
    <div className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="대시보드 불러오는 중">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-60 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-50" />
      ))}
    </div>
  );
}

export default async function SuperGate() {
  const db = getServiceSupabase();
  const today = todayKST();
  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const head = { count: "exact" as const, head: true };

  const [dayRes, review, upcoming, ai, drafts, wrong, newSubs, students] = await Promise.all([
    getDayOverviewAction({}).catch(() => null),
    loadTeacherReviewOverview(db).catch(() => null),
    loadUpcomingExams(db, today).catch(() => ({ exams: [], error: true })),
    loadAiCostSummary(db).catch(() => null),
    safeCount(() => db.from("grammar_lessons").select("id", head).eq("status", "draft")),
    safeCount(() => db.from("hi_naesin_drill_responses").select("id", head).eq("is_correct", false).is("reviewed_at", null)),
    safeCount(() => db.from("photo_homework_submissions").select("id", head).gte("graded_at", since48h)),
    safeCount(() => db.from("academy_students").select("id", head).eq("is_active", true)),
  ]);

  const day = dayRes?.overview ?? null;
  const t = day?.totals;
  const unchecked: Count = day ? day.uncheckedSessions : null;
  const remaining: Count = day
    ? day.sessions.filter((s) => s.status !== "cancelled" && sessionPhase(s.start_time, s.duration_min) !== "done").length
    : null;
  const late: Count = review ? review.counts.late : null;
  const dueOnly: Count = review ? Math.max(0, review.counts.withDue - review.counts.late) : null;
  const examSoon: Count = upcoming.error ? null : upcoming.exams.filter((e) => e.days <= 7).length;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Widget
        title="본사 관제실"
        sub="가맹점 · 콘텐츠 · AI 비용"
        href="/admin/franchise"
        accent="#7c3aed"
        icon={<Building2 className="h-5 w-5" />}
      >
        <ClickTile
          label="문법 레슨 검수 대기"
          count={drafts}
          unit="개"
          sub="초안 상태"
          severity="warning"
          href="/admin/grammar-engine"
          cta="검수하기"
        />
        <ClickTile
          label="AI 비용 이상치"
          count={ai ? (ai.spike ? 1 : 0) : null}
          unit="건"
          sub={ai ? `오늘 ${usd(ai.todayUsd)}` : ""}
          severity="critical"
          href="/admin/franchise"
          cta="확인하기"
          zeroText="이상 없음"
        />
        <LinkStat
          label="이번 달 AI 비용"
          value={ai ? usd(ai.thisMonthUsd) : "—"}
          sub={ai ? `7일 평균 ${usd(ai.avg7Usd)}/일` : "불러오지 못했어요"}
          href="/admin/franchise"
        />
        <LinkStat
          label="활성 학생"
          value={students != null ? `${students}명` : "—"}
          sub="가맹점 1곳 운영 중"
          href="/admin/franchise"
        />
      </Widget>

      <Widget
        title="원장 홈 · 오늘 현황"
        sub="출석 · 복습 · 오답 검토"
        href="/franchise/home"
        accent="#475569"
        icon={<Store className="h-5 w-5" />}
      >
        <ClickTile
          label="출석 체크가 안 된 수업"
          count={unchecked}
          unit="개"
          sub={t ? `${t.unchecked}명 기록 없음` : ""}
          severity="critical"
          href="/admin/attendance"
          cta="출석 보기"
        />
        <ClickTile
          label="복습 2일 이상 밀린 학생"
          count={late}
          unit="명"
          sub="학습 다음 날부터"
          severity="serious"
          href="/teacher/vocab-review"
          cta="학생 보기"
        />
        <ClickTile
          label="오답 검토 대기"
          count={wrong}
          unit="건"
          sub="Hi-내신 드릴"
          severity="warning"
          href="/admin/hi-naesin/wrong-answers"
          cta="검토하기"
        />
        <ClickTile
          label="시험 임박 (7일 이내)"
          count={examSoon}
          unit="건"
          sub={upcoming.exams[0] ? `${upcoming.exams[0].title} · ${upcoming.exams[0].count}명` : ""}
          severity="serious"
          href="/teacher/exam-schedule"
          cta="시험 보기"
        />
      </Widget>

      <Widget
        title="선생님 홈 · 수업/숙제"
        sub="오늘 수업과 학생 숙제"
        href="/teacher/home"
        accent="#3b5bdb"
        icon={<GraduationCap className="h-5 w-5" />}
      >
        <ClickTile
          label="남은 수업"
          count={remaining}
          unit="개"
          sub={day ? `오늘 수업 ${day.sessions.length}개 중` : ""}
          severity="info"
          href="/teacher/session"
          cta="수업 보기"
        />
        <ClickTile
          label="새 숙제 제출 (48시간)"
          count={newSubs}
          unit="건"
          sub="자동 채점 결과"
          severity="info"
          href="/admin/homework"
          cta="숙제 보기"
          zeroText="새 제출 없음"
        />
        <ClickTile
          label="오늘 복습할 학생"
          count={dueOnly}
          unit="명"
          sub="기한 안의 복습"
          severity="info"
          href="/teacher/vocab-review"
          cta="현황 보기"
        />
        <ClickTile
          label="총 시험 시기 학생"
          count={review ? review.counts.totalDue : null}
          unit="명"
          sub="누적 시험 대상"
          severity="info"
          href="/teacher/vocab-review"
          cta="현황 보기"
        />
      </Widget>
    </div>
  );
}
