import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ filter?: string; passage?: string }>;

type VocabStatus = 'unstudied' | 'correct' | 'wrong';

type WordItem = {
  drillId:         string;
  word:            string;
  meaningKo:       string;
  exampleSentence: string | null;
  passageId:       string;
  passageTitle:    string;
  status:          VocabStatus;
};

const STATUS_LABEL: Record<VocabStatus, string> = {
  unstudied: '미학습',
  correct:   '정답',
  wrong:     '오답',
};

const STATUS_CLASS: Record<VocabStatus, string> = {
  unstudied: 'border-neutral-200 bg-neutral-50 text-neutral-500',
  correct:   'border-emerald-200 bg-emerald-50 text-emerald-700',
  wrong:     'border-red-200 bg-red-50 text-red-600',
};

export default async function HiNaesinVocabPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { filter = 'all', passage: filterPassageId } = await searchParams;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // ── 1. 배정된 지문 ────────────────────────────────────────
  const { data: assignments } = await supabase
    .from('hi_naesin_assignments')
    .select('passage_id')
    .eq('student_id', user.id);

  const assignedPassageIds = [...new Set((assignments ?? []).map((a) => a.passage_id))];

  if (assignedPassageIds.length === 0) {
    return (
      <main className="space-y-6">
        <header>
          <div className="text-xs text-neutral-400">
            <Link href="/hi-naesin" className="hover:underline">내신 Drill</Link> / 내신 단어
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mt-0.5">내신 단어</h1>
        </header>
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          배정된 지문이 없습니다.{' '}
          <Link href="/hi-naesin" className="underline">드릴 목록으로</Link>
        </div>
      </main>
    );
  }

  // ── 2. 지문 제목 ──────────────────────────────────────────
  const { data: passages } = await supabase
    .from('hi_naesin_passages')
    .select('id, title')
    .in('id', assignedPassageIds);

  const passageMap = new Map((passages ?? []).map((p) => [p.id, p.title ?? '(지문)']));

  // ── 3. 어휘 드릴 목록 ─────────────────────────────────────
  const { data: drills } = await supabase
    .from('hi_naesin_drills')
    .select('id, passage_id, payload')
    .eq('drill_type', 'vocab')
    .in('passage_id', assignedPassageIds);

  const drillIds = (drills ?? []).map((d) => d.id);

  // ── 4. 학생 응답 (가장 최근 것만) ────────────────────────
  const { data: responses } = drillIds.length > 0
    ? await supabase
        .from('hi_naesin_drill_responses')
        .select('drill_id, is_correct')
        .in('drill_id', drillIds)
    : { data: [] };

  // drill_id별 최신 응답 (맞/틀)
  const responseMap = new Map<string, boolean>();
  for (const r of (responses ?? []).reverse()) {
    if (!responseMap.has(r.drill_id)) {
      responseMap.set(r.drill_id, r.is_correct ?? false);
    }
  }

  // ── 5. WordItem 목록 조합 ─────────────────────────────────
  const allWords: WordItem[] = (drills ?? []).map((d) => {
    const p = d.payload as { word?: string; meaningKo?: string; exampleSentence?: string | null };
    const hasResponse = responseMap.has(d.id);
    const status: VocabStatus = !hasResponse
      ? 'unstudied'
      : responseMap.get(d.id)
      ? 'correct'
      : 'wrong';

    return {
      drillId:         d.id,
      word:            p.word ?? '',
      meaningKo:       p.meaningKo ?? '',
      exampleSentence: p.exampleSentence ?? null,
      passageId:       d.passage_id,
      passageTitle:    passageMap.get(d.passage_id) ?? '(지문)',
      status,
    };
  }).filter((w) => w.word);

  // ── 6. 필터 ──────────────────────────────────────────────
  const filtered = allWords.filter((w) => {
    if (filterPassageId && w.passageId !== filterPassageId) return false;
    if (filter === 'wrong')     return w.status === 'wrong';
    if (filter === 'correct')   return w.status === 'correct';
    if (filter === 'unstudied') return w.status === 'unstudied';
    return true;
  });

  // ── 7. 요약 ──────────────────────────────────────────────
  const totalWords    = allWords.length;
  const studiedWords  = allWords.filter((w) => w.status !== 'unstudied').length;
  const correctWords  = allWords.filter((w) => w.status === 'correct').length;
  const wrongWords    = allWords.filter((w) => w.status === 'wrong').length;
  const accuracy      = studiedWords > 0 ? Math.round((correctWords / studiedWords) * 100) : null;

  const filterTabs = [
    { key: 'all',       label: `전체 (${totalWords})` },
    { key: 'unstudied', label: `미학습 (${allWords.filter((w) => w.status === 'unstudied').length})` },
    { key: 'wrong',     label: `오답 (${wrongWords})` },
    { key: 'correct',   label: `정답 (${correctWords})` },
  ];

  return (
    <main className="space-y-6">
      {/* 헤더 */}
      <header className="flex items-start justify-between">
        <div>
          <div className="text-xs text-neutral-400">
            <Link href="/hi-naesin" className="hover:underline">내신 Drill</Link> / 내신 단어
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mt-0.5">내신 단어</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            배정된 지문 {assignedPassageIds.length}개 · 총 {totalWords}개 단어
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/hi-naesin/vocab/quiz"
            className="rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
          >
            문제 풀기 →
          </Link>
          <Link
            href="/hi-naesin/review"
            className="rounded-xl border px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            직전정리 →
          </Link>
        </div>
      </header>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard label="전체 단어"  value={`${totalWords}개`} />
        <SummaryCard label="학습 완료"  value={`${studiedWords}개`}
          sub={totalWords > 0 ? `${Math.round((studiedWords / totalWords) * 100)}%` : undefined} />
        <SummaryCard label="정답률"     value={accuracy != null ? `${accuracy}%` : '—'} />
        <SummaryCard label="오답"       value={`${wrongWords}개`}
          color={wrongWords > 0 ? 'red' : undefined} />
      </div>

      {/* 지문 필터 */}
      {assignedPassageIds.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/hi-naesin/vocab?filter=${filter}`}
            className={[
              'rounded-full border px-3 py-1 text-xs transition',
              !filterPassageId
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
            ].join(' ')}
          >
            전체 지문
          </Link>
          {assignedPassageIds.map((pid) => (
            <Link
              key={pid}
              href={`/hi-naesin/vocab?filter=${filter}&passage=${pid}`}
              className={[
                'rounded-full border px-3 py-1 text-xs transition truncate max-w-[160px]',
                filterPassageId === pid
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
              ].join(' ')}
            >
              {passageMap.get(pid) ?? pid}
            </Link>
          ))}
        </div>
      )}

      {/* 상태 필터 탭 */}
      <nav className="flex gap-1 border-b">
        {filterTabs.map((t) => (
          <Link
            key={t.key}
            href={`/hi-naesin/vocab?filter=${t.key}${filterPassageId ? `&passage=${filterPassageId}` : ''}`}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
              filter === t.key
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* 단어 목록 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-neutral-400">
          해당하는 단어가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((w) => (
            <div
              key={w.drillId}
              className="rounded-2xl border bg-white p-4 space-y-2"
            >
              {/* 단어 + 상태 */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-bold text-neutral-900">{w.word}</p>
                  <p className="text-sm text-neutral-600">{w.meaningKo}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[w.status]}`}>
                  {STATUS_LABEL[w.status]}
                </span>
              </div>

              {/* 예문 */}
              {w.exampleSentence && (
                <p className="text-xs text-neutral-400 italic leading-relaxed border-t pt-2">
                  {w.exampleSentence}
                </p>
              )}

              {/* 지문명 */}
              <p className="text-[11px] text-neutral-300 truncate">
                📖 {w.passageTitle}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ── 서브 컴포넌트 ─────────────────────────────────────────────
function SummaryCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string; color?: 'red';
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color === 'red' ? 'text-red-500' : 'text-neutral-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-neutral-400">{sub}</p>}
    </div>
  );
}
