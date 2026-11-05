import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  UserPlus,
} from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getDayOverviewAction } from "@/app/protected/admin/attendance/actions";
import { formatKoreanDate, timeRange } from "@/lib/classes/dates";
import { checkState } from "@/lib/classes/sessionBoard";
import { loadTeacherReviewOverview } from "@/lib/vocab/review/teacherReview";

export const dynamic = "force-dynamic";

/**
 * 원장 홈 — "오늘 현황".
 *
 * 설계 원칙 (dataviz):
 *  - 히어로 숫자는 화면에 하나("오늘 확인할 일"), 나머지는 같은 무게의 지표 타일.
 *  - 상태 색은 아이콘 + 라벨과 함께만 쓴다 (색만으로 의미를 전하지 않는다). 숫자·글자는 기본 글자색.
 *  - 급한 일부터 정렬한 "처리할 일" 목록 → 바로 이동. 문제없는 항목은 한 줄로 접는다.
 */

// 상태 색 (고정 팔레트: good / warning / serious / critical)
const STATUS = {
  good: { color: "#0ca30c", label: "정상" },
  warning: { color: "#fab219", label: "주의" },
  serious: { color: "#ec835a", label: "확인 필요" },
  critical: { color: "#d03b3b", label: "급함" },
} as const;
type Severity = keyof typeof STATUS | "info";

const tint = (hex: string, alpha = "1f") => `${hex}${alpha}`;

type ActionItem = {
  key: string;
  count: number | null; // null = 집계 실패
  title: string;
  desc: string;
  severity: Severity;
  href: string;
  cta: string;
  /** '문제 없음' 줄에 쓰는 짧은 이름 */
  okLabel: string;
};

const SEVERITY_RANK: Record<Severity, number> = { critical: 0, serious: 1, warning: 2, info: 3, good: 4 };

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

  // ── 처리할 일 (급한 순) ──
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
    },
  ];

  const todo = items
    .filter((i) => i.count != null && i.count > 0)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
  const failed = items.filter((i) => i.count == null);
  const clear = items.filter((i) => i.count === 0);
  const top = todo[0];

  const lateStudents = review ? review.rows.filter((r) => r.status === "late").slice(0, 5) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      {/* 헤더 */}
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

      {/* 히어로 + 처리할 일 */}
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-5">
          <div>
            <p className="text-sm font-semibold text-neutral-500">오늘 확인할 일</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className="text-[72px] font-semibold leading-none tracking-tight text-neutral-900"
                style={{ fontVariantNumeric: "proportional-nums" }}
              >
                {todo.length}
              </span>
              <span className="text-xl font-semibold text-neutral-500">가지</span>
            </div>
          </div>
          <div className="mt-5">
            {top ? (
              <p className="text-sm leading-relaxed text-neutral-600">
                가장 먼저 확인할 일
                <br />
                <span className="font-semibold text-neutral-900">
                  {top.title} {top.count}
                  {top.key === "attendance" ? "개" : top.key === "wrong" ? "건" : "명"}
                </span>
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-neutral-600">
                <CheckCircle2 className="h-4 w-4" style={{ color: STATUS.good.color }} aria-hidden />
                모두 처리했어요. 오늘은 여기까지!
              </p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white lg:col-span-7">
          <div className="border-b border-neutral-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-neutral-900">지금 처리할 일</h2>
          </div>
          <ul className="divide-y divide-neutral-100">
            {todo.map((i) => (
              <li key={i.key}>
                <Link
                  href={i.href}
                  className="group flex items-center gap-3 px-5 py-3.5 hover:bg-neutral-50 focus:outline-none focus-visible:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
                >
                  <SeverityIcon severity={i.severity} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-neutral-900">{i.title}</span>
                    <span className="block truncate text-xs text-neutral-500">{i.desc}</span>
                  </span>
                  <span className="shrink-0 text-lg font-semibold tabular-nums text-neutral-900">{i.count}</span>
                  <span className="hidden shrink-0 items-center gap-0.5 text-xs font-semibold text-neutral-500 group-hover:text-neutral-900 sm:inline-flex">
                    {i.cta}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
            {todo.length === 0 && failed.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-neutral-400">처리할 일이 없어요.</li>
            )}
            {failed.map((i) => (
              <li key={i.key} className="flex items-center gap-3 px-5 py-3 text-xs text-neutral-500">
                <Info className="h-4 w-4 shrink-0" aria-hidden />
                {i.title}: 불러오지 못했어요
              </li>
            ))}
          </ul>
          {clear.length > 0 && (
            <div className="flex items-start gap-2 border-t border-neutral-100 bg-neutral-50/60 px-5 py-3 text-xs text-neutral-500">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: STATUS.good.color }} aria-hidden />
              <span>
                문제 없음 · {clear.map((c) => c.okLabel).join(" · ")}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* 지표 타일 */}
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
          meter={attendanceRate != null ? { pct: attendanceRate, severity: attendanceRate >= 90 ? "good" : attendanceRate >= 75 ? "warning" : "critical" } : undefined}
        />
        <StatTile
          label="복습 기록이 있는 학생"
          value={review ? String(review.counts.students) : "—"}
          unit="명"
          sub={review ? `오늘 복습할 학생 ${review.counts.withDue}명` : "불러오지 못했어요"}
        />
        <StatTile
          label="총 시험 시기"
          value={review ? String(review.counts.totalDue) : "—"}
          unit="명"
          sub="기본 30일마다 열려요"
        />
      </section>

      {/* 오늘의 수업 + 복습 밀린 학생 */}
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

/* ───────── 작은 구성 요소 ───────── */

function SeverityIcon({ severity }: { severity: Severity }) {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-full";
  if (severity === "info") {
    return (
      <span className={`${base} bg-neutral-100`}>
        <Info className="h-4 w-4 text-neutral-500" aria-hidden />
        <span className="sr-only">알림</span>
      </span>
    );
  }
  const s = STATUS[severity];
  const Icon = severity === "critical" ? AlertCircle : severity === "good" ? CheckCircle2 : AlertTriangle;
  return (
    <span className={base} style={{ background: tint(s.color) }}>
      <Icon className="h-4 w-4" style={{ color: s.color }} aria-hidden />
      <span className="sr-only">{s.label}</span>
    </span>
  );
}

/** 상태 칩: 아이콘 + 라벨 (색만으로 의미를 전하지 않는다). 글자는 기본 글자색. */
function StatusChip({ severity, label }: { severity: Severity; label: string }) {
  const s = severity === "info" ? null : STATUS[severity];
  const Icon = severity === "critical" ? AlertCircle : severity === "good" ? CheckCircle2 : severity === "info" ? Info : AlertTriangle;
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold text-neutral-800"
      style={s ? { background: tint(s.color, "14"), borderColor: tint(s.color, "55") } : { background: "#f5f5f4", borderColor: "#e7e5e4" }}
    >
      <Icon className="h-3.5 w-3.5" style={s ? { color: s.color } : undefined} aria-hidden />
      {label}
    </span>
  );
}

/** 얇은 진행 막대: 채움은 상태 색, 비어 있는 부분은 같은 색의 옅은 단계 */
function Meter({ pct, severity, label }: { pct: number; severity: Severity; label: string }) {
  const color = severity === "info" ? "#a8a29e" : STATUS[severity].color;
  return (
    <div
      className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full"
      style={{ background: tint(color, "2e") }}
      role="img"
      aria-label={label}
      title={label}
    >
      <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

function StatTile({
  label,
  value,
  unit,
  sub,
  meter,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  meter?: { pct: number; severity: Severity };
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="text-xs font-semibold text-neutral-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-semibold tracking-tight text-neutral-900" style={{ fontVariantNumeric: "proportional-nums" }}>
          {value}
        </span>
        {unit ? <span className="text-sm font-semibold text-neutral-500">{unit}</span> : null}
      </div>
      {meter ? <Meter pct={meter.pct} severity={meter.severity} label={`${label} ${meter.pct}%`} /> : null}
      <div className="mt-1.5 text-xs leading-snug text-neutral-500">{sub}</div>
    </div>
  );
}

function PanelHeader({ title, href, cta }: { title: string; href: string; cta: string }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
      <h2 className="text-sm font-bold text-neutral-900">{title}</h2>
      <Link href={href} className="inline-flex items-center gap-0.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900">
        {cta}
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

function Empty({ text, good = false }: { text: string; good?: boolean }) {
  return (
    <p className="flex items-center justify-center gap-1.5 px-5 py-10 text-sm text-neutral-400">
      {good ? <CheckCircle2 className="h-4 w-4" style={{ color: STATUS.good.color }} aria-hidden /> : null}
      {text}
    </p>
  );
}
