import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { HI_NAESIN_DRILL_TYPES, sourceTypeLabel } from '@/models/hi-naesin';
import type { HiNaesinDrillType, HiNaesinSourceType } from '@/models/hi-naesin';
import { startHiNaesinDrillSessionAction } from './passages/actions';
import SectionGuide from '@/app/components/SectionGuide';

export const dynamic = 'force-dynamic';

// ── 드릴 타입 표시 순서 & 라벨 (고등용) ─────────────────────
const DRILL_COLS: { type: HiNaesinDrillType; label: string; short: string }[] = [
  { type: 'vocab',          label: '단어',   short: '단어' },
  { type: 'translation',    label: '해석',   short: '해석' },
  { type: 'writing',        label: '작문',   short: '작문' },
  { type: 'fill_blank',     label: '빈칸',   short: '빈칸' },
  { type: 'grammar_choice', label: '문법',   short: '문법' },
  { type: 'summary',        label: '요약',   short: '요약' },
];

type CellStatus = 'done' | 'partial' | 'empty' | 'none'; // none = 해당 드릴 없음

type PassageProgress = {
  passageId:     string;
  title:         string;
  sourceType:    HiNaesinSourceType | string;
  grade:         string;
  sessionId:     string | null;
  sessionStatus: string | null;
  cols: Record<HiNaesinDrillType, {
    status:   CellStatus;
    total:    number;
    answered: number;
  }>;
  totalDone:   number;
  totalDrills: number;
};

// 출처별 그룹 순서
const SOURCE_ORDER: string[] = ['mock_exam', 'textbook', 'external_book'];

const SOURCE_BADGE: Record<string, string> = {
  mock_exam:     'border-sky-200 bg-sky-50 text-sky-700',
  textbook:      'border-emerald-200 bg-emerald-50 text-emerald-700',
  external_book: 'border-violet-200 bg-violet-50 text-violet-700',
};

export default async function HiNaesinDashboard() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // ── 1. 시험 일정 (가장 가까운 다음 시험) ─────────────────
  const today = new Date().toISOString().slice(0, 10);
  const { data: examRows } = await supabase
    .from('naesin_exam_schedule')
    .select('id, exam_name, exam_date, school')
    .eq('student_id', user.id)
    .gte('exam_date', today)
    .order('exam_date', { ascending: true })
    .limit(3);

  const nextExam = examRows?.[0] ?? null;
  const dDay = nextExam
    ? Math.ceil(
        (new Date(nextExam.exam_date).getTime() - new Date(today).getTime()) /
        (1000 * 60 * 60 * 24),
      )
    : null;

  // ── 2. 배정된 지문 ────────────────────────────────────────
  const { data: assignments } = await supabase
    .from('hi_naesin_assignments')
    .select('passage_id, due_at')
    .eq('student_id', user.id);

  const assignedIds = [...new Set((assignments ?? []).map((a: any) => a.passage_id as string))];
  if (assignedIds.length === 0) {
    return <EmptyState />;
  }

  // ── 3. 지문 기본 정보 ─────────────────────────────────────
  const { data: passages } = await supabase
    .from('hi_naesin_passages')
    .select('id, title, source_type, grade, school_name, textbook_name, unit_label, exam_year, exam_month, question_number')
    .in('id', assignedIds);

  const passageMap = new Map((passages ?? []).map((p: any) => [p.id as string, p]));

  // ── 3b. 분석 자료 존재 여부 ───────────────────────────────
  const { data: analyses } = await supabase
    .from('hi_naesin_passage_analysis')
    .select('passage_id, grammar_locked, vocab_locked, connector_locked, blank_locked')
    .in('passage_id', assignedIds);

  const analysisSet = new Set(
    (analyses ?? [])
      .filter((a: any) => a.grammar_locked || a.vocab_locked || a.connector_locked || a.blank_locked)
      .map((a: any) => a.passage_id as string)
  );

  // ── 4. 드릴 목록 (passage_id + drill_type + id) ───────────
  const { data: drills } = await supabase
    .from('hi_naesin_drills')
    .select('id, passage_id, drill_type')
    .in('passage_id', assignedIds)
    .eq('is_published', true);

  // drillId → {passageId, drillType}
  const drillMeta = new Map(
    (drills ?? []).map((d: any) => [d.id as string, {
      passageId: d.passage_id as string,
      drillType: d.drill_type as HiNaesinDrillType,
    }])
  );
  const drillIds = [...drillMeta.keys()];

  // passageId → drillType → count
  const drillCount: Record<string, Record<string, number>> = {};
  for (const d of drills ?? []) {
    const pid = (d as any).passage_id as string;
    const dt  = (d as any).drill_type as string;
    if (!drillCount[pid]) drillCount[pid] = {};
    drillCount[pid][dt] = (drillCount[pid][dt] ?? 0) + 1;
  }

  // ── 5. 학생 응답 (해당 드릴에 대한) ──────────────────────
  const { data: responses } = drillIds.length > 0
    ? await supabase
        .from('hi_naesin_drill_responses')
        .select('drill_id')
        .eq('student_id', user.id)
        .in('drill_id', drillIds)
    : { data: [] };

  // passageId → drillType → 응답 수
  const answeredCount: Record<string, Record<string, number>> = {};
  for (const r of responses ?? []) {
    const meta = drillMeta.get((r as any).drill_id as string);
    if (!meta) continue;
    const { passageId, drillType } = meta;
    if (!answeredCount[passageId]) answeredCount[passageId] = {};
    answeredCount[passageId][drillType] =
      (answeredCount[passageId][drillType] ?? 0) + 1;
  }

  // ── 6. 세션 정보 (이어하기용) ────────────────────────────
  const { data: sessions } = await supabase
    .from('hi_naesin_sessions')
    .select('id, passage_id, status')
    .eq('student_id', user.id)
    .in('passage_id', assignedIds)
    .order('started_at', { ascending: false });

  // 지문별 가장 최근 세션
  const sessionMap = new Map<string, { id: string; status: string }>();
  for (const s of sessions ?? []) {
    if (!sessionMap.has((s as any).passage_id)) {
      sessionMap.set((s as any).passage_id, {
        id:     (s as any).id,
        status: (s as any).status,
      });
    }
  }

  // ── 7. PassageProgress 조합 ───────────────────────────────
  const progressList: PassageProgress[] = assignedIds.map((pid) => {
    const passage   = passageMap.get(pid) as any;
    const session   = sessionMap.get(pid) ?? null;

    const cols = {} as PassageProgress['cols'];
    let totalDone   = 0;
    let totalDrills = 0;

    for (const col of DRILL_COLS) {
      const total    = drillCount[pid]?.[col.type] ?? 0;
      const answered = answeredCount[pid]?.[col.type] ?? 0;

      totalDrills += total;
      totalDone   += Math.min(answered, total);

      cols[col.type] = {
        total,
        answered,
        status: total === 0     ? 'none'
               : answered === 0  ? 'empty'
               : answered >= total ? 'done'
               : 'partial',
      };
    }

    return {
      passageId:     pid,
      title:         passage?.title ?? '(지문)',
      sourceType:    passage?.source_type ?? 'external_book',
      grade:         passage?.grade ?? '',
      sessionId:     session?.id ?? null,
      sessionStatus: session?.status ?? null,
      cols,
      totalDone,
      totalDrills,
    };
  });

  // 출처별 그룹핑
  const grouped = SOURCE_ORDER.map((src) => ({
    sourceType: src,
    items: progressList.filter((p) => p.sourceType === src),
  })).filter((g) => g.items.length > 0);

  // 분류 안 된 것도 포함
  const knownSources = new Set(SOURCE_ORDER);
  const otherItems = progressList.filter((p) => !knownSources.has(p.sourceType));
  if (otherItems.length > 0) {
    grouped.push({ sourceType: 'external_book', items: otherItems });
  }

  // ── 8. "이어하기" 타겟 — 첫 번째 미완성 지문 ─────────────
  const nextPassage =
    progressList.find(
      (p) => p.totalDrills > 0 && p.totalDone < p.totalDrills
    ) ?? null;

  // 전체 완주 여부
  const allDone = progressList.every(
    (p) => p.totalDrills === 0 || p.totalDone >= p.totalDrills
  );

  return (
    <main className="mx-auto max-w-4xl space-y-6 pb-12">

      <SectionGuide
        storageKey="guide-seen-hi-naesin"
        color="emerald"
        icon="📖"
        title="고등 내신"
        tagline="배정된 교과서 지문을 6가지 드릴로 반복해 시험을 준비합니다."
        outcomes={[
          '교과서 지문의 단어·해석·작문·빈칸·문법·요약을 드릴로 완전히 소화할 수 있다',
          '시험 출제 패턴에 맞춘 표현을 정확히 암기해 서술형·빈칸 문제에 바로 쓸 수 있다',
          'D-Day까지 체계적으로 반복해 시험 당일 자신있게 임할 수 있다',
        ]}
        steps={[
          { icon: '📋', title: '지문 배정', desc: '선생님이 배정한 지문이 아래 표에 나타납니다. 교과서·모의고사·외부 출처별로 묶여 있어요.' },
          { icon: '▶️', title: '드릴 순서', desc: '단어 → 해석 → 작문 → 빈칸 → 문법 → 요약 순으로 진행됩니다. 중간에 나가도 진도가 저장됩니다.' },
          { icon: '🔄', title: '반복 학습', desc: '1회전 완주 후 2회전을 반복할수록 기억이 굳어집니다.' },
        ]}
        progress={
          progressList.reduce((s, p) => s + p.totalDrills, 0) > 0
            ? {
                done:  progressList.reduce((s, p) => s + p.totalDone, 0),
                total: progressList.reduce((s, p) => s + p.totalDrills, 0),
                unit:  '드릴',
              }
            : undefined
        }
        nextAction={
          nextPassage
            ? {
                label: nextPassage.sessionStatus === 'started' ? `"${nextPassage.title}" 이어하기` : `"${nextPassage.title}" 시작하기`,
                href: '#drill-table',
              }
            : undefined
        }
      />

      {/* ── 상단: D-Day + 이어하기 ─────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">

        {/* D-Day 카드 */}
        {nextExam ? (
          <div className={[
            'rounded-2xl border p-4 sm:w-52 shrink-0',
            dDay !== null && dDay <= 3
              ? 'border-red-200 bg-red-50'
              : dDay !== null && dDay <= 7
              ? 'border-amber-200 bg-amber-50'
              : 'border-emerald-200 bg-emerald-50',
          ].join(' ')}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              시험까지
            </p>
            <p className={[
              'text-4xl font-black mt-0.5',
              dDay !== null && dDay <= 3 ? 'text-red-600'
              : dDay !== null && dDay <= 7 ? 'text-amber-600'
              : 'text-emerald-600',
            ].join(' ')}>
              D-{dDay}
            </p>
            <p className="text-xs text-neutral-600 mt-1 font-medium">
              {nextExam.exam_name}
            </p>
            {nextExam.school && (
              <p className="text-[11px] text-neutral-400">{nextExam.school}</p>
            )}
            <p className="text-[11px] text-neutral-400 mt-0.5">
              {new Date(nextExam.exam_date).toLocaleDateString('ko-KR', {
                month: 'long', day: 'numeric', weekday: 'short',
              })}
            </p>
            {examRows && examRows.length > 1 && (
              <p className="text-[11px] text-neutral-400 mt-1">
                +{examRows.length - 1}개 일정 더
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-4 sm:w-52 shrink-0 flex flex-col items-center justify-center gap-1">
            <p className="text-xs text-neutral-400">시험 날짜 미설정</p>
          </div>
        )}

        {/* 이어하기 / 완주 카드 */}
        <div className="flex-1 rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">고등 내신 준비</h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              배정된 지문 {assignedIds.length}개 ·{' '}
              {progressList.reduce((s, p) => s + p.totalDone, 0)} /{' '}
              {progressList.reduce((s, p) => s + p.totalDrills, 0)} 드릴 완료
            </p>
          </div>

          {/* 전체 진도 바 */}
          {(() => {
            const total = progressList.reduce((s, p) => s + p.totalDrills, 0);
            const done  = progressList.reduce((s, p) => s + p.totalDone,   0);
            const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>1회전 진도</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-neutral-100">
                  <div
                    className="h-2.5 rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {allDone ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 text-center">
              🎉 1회전 완주! 2회전 반복을 시작하세요.
            </div>
          ) : nextPassage ? (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-neutral-400">다음 학습</p>
                <p className="text-sm font-semibold text-neutral-800 truncate">
                  {nextPassage.title}
                </p>
              </div>
              <form action={startHiNaesinDrillSessionAction} className="shrink-0">
                <input type="hidden" name="passage_id" value={nextPassage.passageId} />
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  {nextPassage.sessionStatus === 'started' ? '이어하기 →' : '시작하기 →'}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>

      {/* ── 진도 목록 ──────────────────────────────────────── */}
      <section id="drill-table" className="space-y-6">
        {grouped.map(({ sourceType: src, items }) => (
          <div key={src} className="space-y-3">
            {/* 출처 그룹 헤더 */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${SOURCE_BADGE[src] ?? SOURCE_BADGE.external_book}`}>
                {sourceTypeLabel(src as HiNaesinSourceType)}
              </span>
              <span className="text-[11px] text-neutral-400">{items.length}개 지문</span>
            </div>

            {/* 카드 그리드 */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((p) => {
                const pct = p.totalDrills > 0
                  ? Math.round((p.totalDone / p.totalDrills) * 100)
                  : 0;
                const isAllDone = p.totalDrills > 0 && p.totalDone >= p.totalDrills;

                // 날짜 prefix 제거 (예: "2026-6-21 35 제목" → "제목")
                const displayTitle = p.title.replace(/^\d{4}-\d{1,2}-\d{1,2}\s+\d+\s*/, '');
                const gradeLabel = p.grade === 'H1' ? '고1' : p.grade === 'H2' ? '고2' : p.grade === 'H3' ? '고3'
                  : p.grade === 'M1' ? '중1' : p.grade === 'M2' ? '중2' : p.grade === 'M3' ? '중3' : '';

                const btnLabel = isAllDone ? '다시 하기'
                  : p.sessionStatus === 'started' ? '이어하기'
                  : p.totalDone > 0 ? '계속하기'
                  : '시작하기';

                return (
                  <div
                    key={p.passageId}
                    className={[
                      'flex flex-col rounded-2xl border bg-white p-5 gap-4 transition',
                      isAllDone ? 'opacity-55' : 'hover:border-neutral-300 hover:shadow-sm',
                    ].join(' ')}
                  >
                    {/* 제목 + 메타 */}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold leading-snug text-neutral-800">
                        {displayTitle}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {gradeLabel && (
                          <span className="text-[11px] text-neutral-400">{gradeLabel}</span>
                        )}
                        {isAllDone && (
                          <span className="text-[11px] font-semibold text-emerald-600">· 완료</span>
                        )}
                      </div>
                    </div>

                    {/* 드릴 칩 */}
                    <div className="flex flex-wrap gap-1.5">
                      {DRILL_COLS.map((col) => {
                        const cell = p.cols[col.type];
                        if (cell.status === 'none') return null;
                        return (
                          <span
                            key={col.type}
                            className={[
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              cell.status === 'done'    ? 'bg-emerald-100 text-emerald-700' :
                              cell.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                              'bg-neutral-100 text-neutral-400',
                            ].join(' ')}
                          >
                            {col.short}{cell.status === 'done' ? ' ✓' : cell.status === 'partial' ? ` ${cell.answered}/${cell.total}` : ''}
                          </span>
                        );
                      })}
                    </div>

                    {/* 진도 바 + 버튼 */}
                    <div className="space-y-2.5">
                      {p.totalDrills > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-neutral-400">{p.totalDone} / {p.totalDrills}</span>
                            <span className={pct === 100 ? 'text-emerald-600 font-bold' : pct > 0 ? 'text-amber-600 font-semibold' : 'text-neutral-300'}>
                              {pct > 0 ? `${pct}%` : '—'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-neutral-100">
                            <div
                              className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {analysisSet.has(p.passageId) && (
                          <Link
                            href={`/hi-naesin/analyze/${p.passageId}`}
                            className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 shrink-0"
                          >
                            지문 분석
                          </Link>
                        )}
                        <form action={startHiNaesinDrillSessionAction} className="flex-1">
                          <input type="hidden" name="passage_id" value={p.passageId} />
                          <button
                            type="submit"
                            className={[
                              'w-full rounded-xl py-2 text-sm font-semibold transition',
                              isAllDone
                                ? 'border border-neutral-200 text-neutral-400 hover:bg-neutral-50'
                                : p.sessionStatus === 'started'
                                ? 'bg-amber-500 text-white hover:bg-amber-600'
                                : p.totalDone > 0
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-neutral-900 text-white hover:bg-neutral-800',
                            ].join(' ')}
                          >
                            {btnLabel}
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      {/* ── 하단 링크 ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/hi-naesin/vocab"
          className="rounded-xl border border-neutral-200 px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-50"
        >
          📚 내신 단어 전체
        </Link>
        <Link
          href="/hi-naesin/stats"
          className="rounded-xl border border-neutral-200 px-4 py-2 text-xs text-neutral-600 hover:bg-neutral-50"
        >
          📊 학습 현황
        </Link>
        <Link
          href="/hi-naesin/review"
          className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-xs text-violet-700 hover:bg-violet-100"
        >
          직전정리
        </Link>
      </div>
    </main>
  );
}


// ── 배정 없을 때 ───────────────────────────────────────────────
function EmptyState() {
  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900">고등 내신 준비</h1>
      </header>
      <div className="rounded-2xl border border-dashed p-12 text-center space-y-2">
        <p className="text-sm text-neutral-400">배정된 지문이 없습니다.</p>
        <p className="text-xs text-neutral-300">선생님이 지문을 배정하면 드릴이 시작됩니다.</p>
      </div>
    </main>
  );
}
