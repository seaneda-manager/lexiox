import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Building2,
  ChevronRight,
  FolderOpen,
  GraduationCap,
  Headphones,
  Info,
  Languages,
  Library,
  Megaphone,
  MessageSquare,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getDayOverviewAction } from "@/app/protected/admin/attendance/actions";
import { formatKoreanDate } from "@/lib/classes/dates";
import { kstToday } from "@/lib/vocab/review/reviewItems";
import { loadTeacherReviewOverview } from "@/lib/vocab/review/teacherReview";
import { Meter, PanelHeader, StatTile, StatusChip, type Severity } from "@/components/dashboard/board";

export const dynamic = "force-dynamic";

/**
 * 본사 허브 — 본사가 가맹점 전체를 한눈에 보는 운영 센터.
 *
 * 지금은 가맹점이 "본점" 하나라서 가맹점 표는 한 줄이다. 가맹점 구조(지점 컬럼)가 생기면 같은 표에
 * 한 줄씩 늘어나고 가맹점끼리 비교할 수 있다. 아직 없는 기능(공지·문의·교육·자료)은 가짜 숫자로
 * 채우지 않고 "준비 중"으로 표시한다.
 * (예전에는 가맹점 42곳·Q&A 7건·교육 이수율 81% 같은 숫자가 코드에 직접 적혀 있었다)
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-neutral-500">{formatKoreanDate(today)} 기준</p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">본사 허브</h1>
          <p className="mt-1 text-sm text-neutral-500">가맹점의 학습 활동과 운영 상태를 한눈에 봅니다.</p>
        </div>
      </header>

      {/* 히어로 + 가맹점 현황 */}
      <section className="grid gap-4 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-6 lg:col-span-4">
          <div>
            <p className="text-sm font-semibold text-neutral-500">이번 주 학습한 학생</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span
                className="text-[72px] font-semibold leading-none tracking-tight text-neutral-900"
                style={{ fontVariantNumeric: "proportional-nums" }}
              >
                {active ?? "—"}
              </span>
              <span className="text-xl font-semibold text-neutral-500">명</span>
            </div>
          </div>
          <div className="mt-5">
            {activePct != null ? (
              <Meter
                pct={activePct}
                severity={activePct >= 70 ? "good" : activePct >= 40 ? "warning" : "serious"}
                label={`전체 ${students}명 중 ${active}명 (${activePct}%)`}
              />
            ) : null}
            <p className="mt-2 text-xs leading-relaxed text-neutral-500">
              {students != null && activePct != null ? `전체 ${students}명 중 ${activePct}%` : "집계하지 못했어요"} · 최근 7일 동안 단어를 학습한
              학생 기준
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white lg:col-span-8">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-neutral-900">가맹점 현황</h2>
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
                  <td colSpan={6} className="px-5 py-3.5">
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      가맹점이 추가되면 이 표에 한 줄씩 늘어나고, 가맹점끼리 비교할 수 있어요. (가맹점 구조 준비 중)
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 지표 타일 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="전체 학생" value={students != null ? String(students) : "—"} unit="명" sub="활성 계정 기준" />
        <StatTile
          label="이번 주 완료한 Day"
          value={completedDays != null ? String(completedDays) : "—"}
          unit="개"
          sub="최근 7일 단어 학습 완료"
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
          label="복습이 밀린 학생"
          value={late != null ? String(late) : "—"}
          unit="명"
          sub={review ? `총 시험 시기 ${review.counts.totalDue}명` : "불러오지 못했어요"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* 본사 업무 */}
        <section className="rounded-2xl border border-neutral-200 bg-white lg:col-span-3">
          <div className="border-b border-neutral-100 px-5 py-3.5">
            <h2 className="text-sm font-bold text-neutral-900">본사 업무</h2>
            <p className="mt-0.5 text-xs text-neutral-500">가맹점과 소통하는 도구예요. 가맹점 구조와 함께 차례로 열려요.</p>
          </div>
          <div className="grid gap-px bg-neutral-100 sm:grid-cols-2">
            <WorkTile href="/admin/franchise/announcements" icon={Megaphone} title="공지" desc="가맹점에 공지를 보내고 읽음 현황을 확인해요" />
            <WorkTile href="/admin/franchise/qna" icon={MessageSquare} title="가맹점 문의" desc="가맹점이 보낸 질문에 답변해요" />
            <WorkTile href="/admin/franchise/training" icon={GraduationCap} title="교육" desc="신규 가맹점 온보딩과 교육 이수 현황" />
            <WorkTile href="/admin/franchise/resources" icon={FolderOpen} title="자료실" desc="마케팅·운영 자료를 배포해요" />
          </div>
        </section>

        {/* 콘텐츠 현황 */}
        <section className="rounded-2xl border border-neutral-200 bg-white lg:col-span-2">
          <PanelHeader title="콘텐츠 현황" href="/admin" cta="콘텐츠 관리" />
          <div className="grid grid-cols-2 gap-px bg-neutral-100">
            <ContentTile href="/admin/vocab/words" icon={Languages} label="단어" value={words} unit="개" />
            <ContentTile href="/admin/vocab/sets" icon={Library} label="단어책(Day)" value={vocabSets} unit="개" />
            <ContentTile href="/admin/content/updated-reading" icon={BookOpen} label="Reading 세트" value={reading} unit="개" />
            <ContentTile href="/admin/content/updated-listening" icon={Headphones} label="Listening 세트" value={listening} unit="개" />
            <ContentTile href="/admin/hi-naesin/passages" icon={BookOpen} label="Hi-내신 지문" value={hiNaesin} unit="개" />
            <ContentTile href="/admin/middle-naesin/units" icon={GraduationCap} label="중학 단원" value={middleUnits} unit="개" />
          </div>
          <div className="flex items-center gap-2 border-t border-neutral-100 px-5 py-3 text-xs text-neutral-500">
            <Info className="h-3.5 w-3.5 shrink-0" aria-hidden />
            문법 레슨 {grammar ?? "—"}개 · 모든 가맹점이 같은 콘텐츠를 써요
          </div>
        </section>
      </div>
    </div>
  );
}

function WorkTile({ href, icon: Icon, title, desc }: { href: string; icon: LucideIcon; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 bg-white p-5 transition-colors hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-100">
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
