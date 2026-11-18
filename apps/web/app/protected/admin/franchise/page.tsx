import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  Building2,
  CalendarClock,
  ChevronRight,
  Cpu,
  FolderOpen,
  GraduationCap,
  Headphones,
  Info,
  Languages,
  Library,
  Megaphone,
  MessageSquare,
  Plus,
  Store,
  type LucideIcon,
} from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getDayOverviewAction } from "@/app/protected/admin/attendance/actions";
import { formatKoreanDate } from "@/lib/classes/dates";
import { kstToday } from "@/lib/vocab/review/reviewItems";
import { loadTeacherReviewOverview } from "@/lib/vocab/review/teacherReview";
import { loadAiCostSummary } from "@/lib/dashboard/aiCost";
import { Empty, Meter, PanelHeader, StatTile, StatusChip, type Severity } from "@/components/dashboard/board";
import { Card, ClickTile, PlannedCard, ZoneSection } from "@/components/dashboard/zones";

export const dynamic = "force-dynamic";

/**
 * 본사 관제실 — 본사가 가맹점 전체를 한눈에 보는 운영 센터. 두 구역으로 나눈다.
 *  - 가맹점 운영 : 학습·출석·복습 현황, 가맹점 표
 *  - 콘텐츠·시스템 : 검수 대기, AI 비용(추이·이상치·상위 사용처), 콘텐츠 현황
 *
 * 지금은 가맹점이 "본점" 하나라서 가맹점 표는 한 줄이다. 가맹점 구조(지점 컬럼)가 생기면 같은 표에
 * 한 줄씩 늘어난다. 아직 없는 기능(건강도 점수, 지원 티켓, 매출·로열티, 계약, 시스템 오류 수집)은
 * 가짜 숫자로 채우지 않고 맨 아래 "준비 중" 카드로만 표시한다.
 */

type Count = number | null;

async function safeCount(run: () => PromiseLike<{ count: number | null; error: unknown }>): Promise<Count> {
  try {
    const r = await run();
    return r.error ? null : r.count ?? 0;
  } catch {
    return null;
  }
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function FranchiseHubPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/admin/franchise");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin" && me?.role !== "hq_staff") redirect("/");

  const db = getServiceSupabase();
  const today = kstToday();
  const sinceISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const head = { count: "exact" as const, head: true };
  const [
    students,
    activeIds,
    completedDays,
    dayRes,
    review,
    words,
    vocabSets,
    reading,
    listening,
    hiNaesin,
    middleUnits,
    grammar,
    grammarDrafts,
    ai,
  ] = await Promise.all([
    safeCount(() => db.from("academy_students").select("id", head).eq("is_active", true)),
    db
      .from("vocab_learning_attempts")
      .select("student_id")
      .gte("attempted_at", sinceISO)
      .limit(50000)
      .then((r) => (r.error ? null : new Set((r.data ?? []).map((x: any) => String(x.student_id)))))
      .then(
        (v) => v,
        () => null,
      ),
    safeCount(() => db.from("student_vocab_assignments").select("id", head).gte("completed_at", sinceISO)),
    getDayOverviewAction({}),
    loadTeacherReviewOverview(db).catch(() => null),
    safeCount(() => db.from("words").select("id", head)),
    safeCount(() => db.from("vocab_sets").select("id", head)),
    safeCount(() => db.from("reading_tests_2026").select("id", head)),
    safeCount(() => db.from("listening_tests_2026").select("id", head)),
    safeCount(() => db.from("hi_naesin_passages").select("id", head)),
    safeCount(() => db.from("middle_naesin_units").select("id", head)),
    safeCount(() => db.from("grammar_lessons").select("id", head)),
    safeCount(() => db.from("grammar_lessons").select("id", head).eq("status", "draft")),
    loadAiCostSummary(db),
  ]);

  const active = activeIds ? activeIds.size : null;
  const activePct = students && active != null && students > 0 ? Math.round((active / students) * 100) : null;
  const day = dayRes.overview ?? null;
  const t = day?.totals;
  const counted = t ? t.present + t.late + t.absent : 0;
  const attendanceRate = t && counted > 0 ? Math.round(((t.present + t.late) / counted) * 100) : null;
  const unchecked = day ? day.uncheckedSessions : null;
  const late = review ? review.counts.late : null;

  // 본점 한 줄의 상태: 확인이 필요한 일이 있으면 "확인 필요", 없으면 "정상"
  const needsCheck = (unchecked ?? 0) > 0 || (late ?? 0) > 0;
  const branchSeverity: Severity = unchecked == null && late == null ? "info" : needsCheck ? "serious" : "good";

  const maxMonth = ai ? Math.max(...ai.months.map((m) => m.usd), 0.0001) : 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header>
        <p className="text-xs font-semibold text-neutral-500">{formatKoreanDate(today)} 기준</p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">본사 관제실</h1>
        <p className="mt-1 text-sm text-neutral-500">가맹점의 학습 활동과 운영 상태, 콘텐츠·시스템을 한눈에 봅니다.</p>
      </header>

      {/* ════════════ 가맹점 운영 구역 ════════════ */}
      <ZoneSection
        tone="ops"
        title="가맹점 운영"
        hint="가맹점별 학습·출석·복습 현황"
        icon={<Store className="h-5 w-5" />}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ClickTile
            label="출석 체크가 안 된 수업"
            count={unchecked}
            unit="개"
            sub={t ? `${t.unchecked}명의 출석 기록이 없어요` : ""}
            severity="critical"
            href="/admin/attendance"
            cta="출석 보기"
          />
          <ClickTile
            label="복습이 2일 이상 밀린 학생"
            count={late}
            unit="명"
            sub="복습은 학습 다음 날부터 해야 해요"
            severity="serious"
            href="/teacher/vocab-review"
            cta="학생 보기"
          />
          <StatTile
            label="오늘 출석률"
            value={attendanceRate != null ? String(attendanceRate) : "—"}
            unit={attendanceRate != null ? "%" : ""}
            sub={t ? `출석 ${t.present} · 지각 ${t.late} · 결석 ${t.absent}` : "오늘 수업이 없어요"}
            meter={
              attendanceRate != null
                ? { pct: attendanceRate, severity: attendanceRate >= 90 ? "good" : attendanceRate >= 75 ? "warning" : "critical" }
                : undefined
            }
          />
          <StatTile
            label="이번 주 학습한 학생"
            value={active != null ? String(active) : "—"}
            unit="명"
            sub={
              students != null && activePct != null
                ? `전체 ${students}명 중 ${activePct}% · 최근 7일 단어 학습 기준`
                : "집계하지 못했어요"
            }
            meter={
              activePct != null
                ? { pct: activePct, severity: activePct >= 70 ? "good" : activePct >= 40 ? "warning" : "serious" }
                : undefined
            }
          />
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
            <h3 className="text-sm font-bold text-neutral-900">가맹점 현황</h3>
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
              1곳 운영 중
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-neutral-500">
                  <th className="px-5 py-3">가맹점</th>
                  <th className="px-3 py-3 text-right">학생</th>
                  <th className="px-3 py-3 text-right">이번 주 학습</th>
                  <th className="px-3 py-3 text-right">완료한 Day</th>
                  <th className="px-3 py-3 text-right">출석 미체크</th>
                  <th className="px-3 py-3 text-right">복습 밀림</th>
                  <th className="px-5 py-3 text-right">상태</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-neutral-100">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                        <Building2 className="h-4 w-4 text-emerald-700" aria-hidden />
                      </span>
                      <div>
                        <div className="font-semibold text-neutral-900">본점</div>
                        <div className="text-xs text-neutral-500">직영</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-neutral-900">{students ?? "—"}</td>
                  <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-neutral-900">{active ?? "—"}</td>
                  <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-neutral-900">{completedDays ?? "—"}</td>
                  <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-neutral-900">
                    {unchecked != null ? `${unchecked}개` : "—"}
                  </td>
                  <td className="px-3 py-3.5 text-right font-semibold tabular-nums text-neutral-900">
                    {late != null ? `${late}명` : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <StatusChip
                      severity={branchSeverity}
                      label={branchSeverity === "good" ? "정상" : branchSeverity === "serious" ? "확인 필요" : "집계 불가"}
                    />
                  </td>
                </tr>
                <tr className="border-t border-dashed border-neutral-200 bg-neutral-50/60">
                  <td colSpan={7} className="px-5 py-3.5">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      가맹점이 추가되면 이 표에 한 줄씩 늘어나고, 가맹점끼리 비교할 수 있어요. (가맹점 구조 준비 중)
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-5 py-3.5">
            <h3 className="text-sm font-bold text-neutral-900">본사 업무</h3>
            <p className="mt-0.5 text-xs text-neutral-500">가맹점과 소통하는 도구예요. 가맹점 구조와 함께 차례로 열려요.</p>
          </div>
          <div className="grid gap-px bg-neutral-100 sm:grid-cols-2 lg:grid-cols-4">
            <WorkTile href="/admin/franchise/announcements" icon={Megaphone} title="공지" desc="공지와 읽음 현황" />
            <WorkTile href="/admin/franchise/qna" icon={MessageSquare} title="가맹점 문의" desc="질문에 답변" />
            <WorkTile href="/admin/franchise/training" icon={GraduationCap} title="교육" desc="온보딩·이수 현황" />
            <WorkTile href="/admin/franchise/resources" icon={FolderOpen} title="자료실" desc="마케팅·운영 자료" />
          </div>
        </section>
      </ZoneSection>

      {/* ════════════ 콘텐츠·시스템 구역 ════════════ */}
      <ZoneSection
        tone="system"
        title="콘텐츠·시스템"
        hint="검수 대기, AI 사용 비용, 콘텐츠 현황"
        icon={<Cpu className="h-5 w-5" />}
      >
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ClickTile
            label="문법 레슨 검수 대기"
            count={grammarDrafts}
            unit="개"
            sub="초안 상태인 레슨이에요"
            severity="warning"
            href="/admin/grammar-engine"
            cta="검수하기"
          />
          <StatTile
            label="이번 달 AI 비용 (추정)"
            value={ai ? usd(ai.thisMonthUsd) : "—"}
            sub={ai ? `오늘 ${usd(ai.todayUsd)} · 최근 7일 하루 평균 ${usd(ai.avg7Usd)}` : "불러오지 못했어요"}
          />
          <StatTile label="문법 레슨" value={grammar != null ? String(grammar) : "—"} unit="개" sub="초안 포함 전체" />
          <StatTile label="전체 학생" value={students != null ? String(students) : "—"} unit="명" sub="활성 계정 기준" />
        </div>

        {ai?.spike ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border px-4 py-3"
            style={{ borderColor: "#d03b3b66", background: "#d03b3b14" }}
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#d03b3b" }} aria-hidden />
            <div className="text-sm text-neutral-900">
              <span className="font-semibold">AI 비용 이상치</span> · 오늘 {usd(ai.todayUsd)}로 최근 7일 하루 평균({usd(ai.avg7Usd)})의 3배
              이상이에요.
              {ai.topRoutes[0] ? <span className="text-neutral-600"> 이번 달 가장 큰 사용처: {ai.topRoutes[0].route}</span> : null}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="AI 사용 비용 추이 (최근 6개월, 추정 USD)">
            {!ai ? (
              <Empty text="비용 로그를 불러오지 못했어요." />
            ) : (
              <div className="px-5 py-4">
                <div className="flex h-36 items-end gap-3" role="img" aria-label="월별 AI 비용 막대 그래프">
                  {ai.months.map((m, i) => {
                    const isNow = i === ai.months.length - 1;
                    return (
                      <div key={m.key} className="flex flex-1 flex-col items-center justify-end gap-1">
                        <span className="text-[11px] tabular-nums text-neutral-500">{m.usd >= 1 ? m.usd.toFixed(0) : m.usd.toFixed(2)}</span>
                        <div
                          className="w-full rounded-t-md"
                          style={{
                            height: `${Math.max(2, (m.usd / maxMonth) * 100)}%`,
                            background: isNow ? "#5b21b6" : "#c4b5fd",
                          }}
                        />
                        <span className="text-xs text-neutral-500">{m.label}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-3 text-[11px] text-neutral-400">
                  이번 달은 오늘까지의 누적이에요. 요금표에 없는 모델의 호출은 비용에 포함되지 않아요.
                </p>
              </div>
            )}
          </Card>

          <Card title="이번 달 AI 사용처 TOP 5">
            {!ai || ai.topRoutes.length === 0 ? (
              <Empty text={ai ? "이번 달 기록된 사용량이 없어요." : "불러오지 못했어요."} />
            ) : (
              <ul className="space-y-3 px-5 py-4">
                {ai.topRoutes.map((r) => (
                  <li key={r.route}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-mono text-xs text-neutral-800">{r.route}</span>
                      <span className="shrink-0 tabular-nums text-neutral-500">{usd(r.usd)}</span>
                    </div>
                    <Meter pct={(r.usd / ai.topRoutes[0].usd) * 100} severity="info" label={`${r.route} ${usd(r.usd)}`} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white">
          <PanelHeader title="콘텐츠 현황" href="/admin" cta="콘텐츠 관리" />
          <div className="grid grid-cols-2 gap-px bg-neutral-100 sm:grid-cols-3 lg:grid-cols-6">
            <ContentTile href="/admin/vocab/words" icon={Languages} label="단어" value={words} unit="개" />
            <ContentTile href="/admin/vocab/sets" icon={Library} label="단어책(Day)" value={vocabSets} unit="개" />
            <ContentTile href="/admin/content/updated-reading" icon={BookOpen} label="Reading 세트" value={reading} unit="개" />
            <ContentTile href="/admin/content/updated-listening" icon={Headphones} label="Listening 세트" value={listening} unit="개" />
            <ContentTile href="/admin/hi-naesin/passages" icon={BookOpen} label="Hi-내신 지문" value={hiNaesin} unit="개" />
            <ContentTile href="/admin/middle-naesin/units" icon={GraduationCap} label="중학 단원" value={middleUnits} unit="개" />
          </div>
          <div className="flex items-center gap-2 border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
            모든 가맹점이 같은 콘텐츠를 써요
          </div>
        </section>
      </ZoneSection>

      {/* ════════════ 준비 중 (데이터 없음) ════════════ */}
      <section aria-label="준비 중인 위젯" className="space-y-2">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          준비 중인 기능
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <PlannedCard title="가맹점 건강도 점수" note="학생 추세·선생님 활성·처리율·수납을 묶은 점수예요. 가맹점 구조와 함께 제공돼요." />
          <PlannedCard title="가맹점별 매출·로열티·미수금" note="수납·정산 기능과 함께 제공돼요." />
          <PlannedCard title="지원 문의 티켓" note="미응답 건과 평균 응답 시간. 문의 기능과 함께 제공돼요." />
          <PlannedCard title="시스템 오류 알림" note="생성 실패·마이그레이션 중단 등. 오류 수집 기능을 준비 중이에요." />
          <PlannedCard title="콘텐츠 사용 통계" note="많이 쓰는/안 쓰는 콘텐츠 순위. 사용 로그 집계를 준비 중이에요." />
          <PlannedCard title="계약 갱신 임박 · 전국 시험 시즌" note="계약 정보와 학교 시험 캘린더가 생기면 제공돼요." />
        </div>
      </section>
    </div>
  );
}

function WorkTile({ href, icon: Icon, title, desc }: { href: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 bg-white p-4 transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
        <Icon className="h-5 w-5 text-neutral-600" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold text-neutral-900">{title}</span>
          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
            준비 중
          </span>
        </span>
        <span className="mt-1 block text-xs leading-snug text-neutral-500">{desc}</span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-neutral-300 group-hover:text-neutral-500" aria-hidden />
    </Link>
  );
}

function ContentTile({
  href,
  icon: Icon,
  label,
  value,
  unit,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <Link
      href={href}
      className="group bg-white p-4 transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight text-neutral-900" style={{ fontVariantNumeric: "proportional-nums" }}>
          {value != null ? value.toLocaleString("ko-KR") : "—"}
        </span>
        <span className="text-xs font-semibold text-neutral-500">{unit}</span>
      </div>
    </Link>
  );
}
