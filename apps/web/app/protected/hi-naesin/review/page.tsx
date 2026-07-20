import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ passage?: string }>;

function masteryLevel(pct: number) {
  if (pct >= 80) return { label: '숙지',    dot: 'bg-emerald-500', bar: 'bg-emerald-500', text: 'text-emerald-700' };
  if (pct >= 60) return { label: '부분숙지', dot: 'bg-amber-400',   bar: 'bg-amber-400',   text: 'text-amber-700'   };
  return               { label: '미숙지',   dot: 'bg-red-400',     bar: 'bg-red-400',     text: 'text-red-600'     };
}

export default async function HiNaesinReviewPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { passage: focusPassageId } = await searchParams;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // ── 시험 범위: 배정된 지문 전체 ─────────────────────────
  const { data: assignments } = await supabase
    .from('hi_naesin_assignments')
    .select('passage_id, status, due_at')
    .eq('student_id', user.id);

  const assignedPassageIds = [...new Set((assignments ?? []).map((a) => a.passage_id))];

  // ── 지문 정보 ─────────────────────────────────────────────
  const { data: passages } = assignedPassageIds.length > 0
    ? await supabase
        .from('hi_naesin_passages')
        .select('id, title, grade, source_type')
        .in('id', assignedPassageIds)
    : { data: [] };

  // ── 완료된 세션 ───────────────────────────────────────────
  const { data: sessions } = assignedPassageIds.length > 0
    ? await supabase
        .from('hi_naesin_sessions')
        .select('id, passage_id, status, submitted_at')
        .eq('student_id', user.id)
        .eq('session_type', 'drill')
        .eq('status', 'submitted')
        .in('passage_id', assignedPassageIds)
    : { data: [] };

  const sessionIds   = (sessions ?? []).map((s) => s.id);
  const sessionByPassage = new Map((sessions ?? []).map((s) => [s.passage_id, s]));

  // ── 드릴 응답 + 드릴 메타 ────────────────────────────────
  const { data: responses } = sessionIds.length > 0
    ? await supabase
        .from('hi_naesin_drill_responses')
        .select('session_id, drill_id, is_correct, score_pct, response_text, feedback_text')
        .in('session_id', sessionIds)
    : { data: [] };

  const drillIds = [...new Set((responses ?? []).map((r) => r.drill_id))];
  const { data: drills } = drillIds.length > 0
    ? await supabase
        .from('hi_naesin_drills')
        .select('id, drill_type, passage_id, payload')
        .in('id', drillIds)
    : { data: [] };

  const drillMap = new Map((drills ?? []).map((d) => [d.id, d]));

  // ── 지문별 집계 ───────────────────────────────────────────
  type PassageDigest = {
    mastery:         number;
    missedVocab:     string[];
    weakGrammar:     Array<[string, number]>;
    wrongSentences:  Array<{ ko: string; model: string; myAnswer: string; feedback: string | null }>;
    orderWrong:      number;
    orderTotal:      number;
  };

  function buildDigest(passageId: string): PassageDigest {
    const session = sessionByPassage.get(passageId);
    if (!session) return { mastery: 0, missedVocab: [], weakGrammar: [], wrongSentences: [], orderWrong: 0, orderTotal: 0 };

    const passageResponses = (responses ?? []).filter((r) => {
      const d = drillMap.get(r.drill_id);
      return d?.passage_id === passageId;
    });

    type TypeStat = { correct: number; total: number; scoreSum: number; scoreCount: number };
    const ts: Record<string, TypeStat> = {};
    const grammarWrong: Record<string, number> = {};
    const missedVocab:  string[] = [];
    const wrongSentences: PassageDigest['wrongSentences'] = [];

    for (const r of passageResponses) {
      const d = drillMap.get(r.drill_id);
      if (!d) continue;
      const t = d.drill_type as string;
      const p = d.payload as Record<string, unknown>;

      if (!ts[t]) ts[t] = { correct: 0, total: 0, scoreSum: 0, scoreCount: 0 };
      ts[t].total++;
      if (r.is_correct === true)  ts[t].correct++;
      if (r.score_pct != null) { ts[t].scoreSum += r.score_pct; ts[t].scoreCount++; }

      // 취약 문법
      if (t === 'grammar_choice' && r.is_correct === false) {
        const cat = p?.grammarCategory as string | undefined;
        if (cat) grammarWrong[cat] = (grammarWrong[cat] ?? 0) + 1;
      }

      // 틀린 단어
      if (t === 'vocab' && r.is_correct === false) {
        const word = p?.word as string | undefined;
        if (word) missedVocab.push(word);
      }

      // 틀린 작문
      if (t === 'writing' && r.is_correct === false && r.response_text) {
        wrongSentences.push({
          ko:       (p?.koPrompt as string) ?? '',
          model:    (p?.answerEn as string) ?? '',
          myAnswer: r.response_text,
          feedback: r.feedback_text ?? null,
        });
      }
    }

    // 숙지도
    const weights = [
      { key: 'translation', w: 0.3 }, { key: 'writing', w: 0.4 }, { key: 'fill_blank', w: 0.3 },
    ];
    let sum = 0, totalW = 0;
    for (const { key, w } of weights) {
      const s = ts[key];
      if (!s || s.total === 0) continue;
      const score = s.scoreCount > 0 ? s.scoreSum / s.scoreCount : (s.correct / s.total) * 100;
      sum += score * w; totalW += w;
    }
    const mastery = totalW === 0 ? 0 : Math.round(sum / totalW);

    return {
      mastery,
      missedVocab:    missedVocab.slice(0, 6),
      weakGrammar:    Object.entries(grammarWrong).sort((a, b) => b[1] - a[1]).slice(0, 4),
      wrongSentences: wrongSentences.slice(0, 3),
      orderWrong: 0,
      orderTotal: 0,
    };
  }

  const passageList = (passages ?? []).map((p) => ({
    ...p,
    digest:    buildDigest(p.id),
    isDone:    !!sessionByPassage.get(p.id),
    assignment: (assignments ?? []).find((a) => a.passage_id === p.id),
  })).sort((a, b) => a.digest.mastery - b.digest.mastery);

  if (assignedPassageIds.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center space-y-4">
        <p className="text-neutral-500">배정된 지문이 없습니다.</p>
        <Link href="/hi-naesin" className="text-sm text-neutral-400 underline">대시보드로</Link>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* 헤더 */}
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-400">
            <Link href="/hi-naesin" className="hover:underline">내신 Drill</Link>
            {' / '}
            <Link href="/hi-naesin/stats" className="hover:underline">학습 현황</Link>
            {' / '}직전정리
          </div>
          <h1 className="text-xl font-bold text-neutral-900 mt-0.5">직전정리</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            시험 범위 {passageList.length}개 지문 · 취약한 순으로 정렬
          </p>
        </div>
      </header>

      {/* 전체 숙지도 요약 */}
      <div className="flex gap-3 text-sm max-w-sm">
        {(['숙지', '부분숙지', '미숙지'] as const).map((lv) => {
          const count = passageList.filter((p) => {
            const m = p.digest.mastery;
            return lv === '숙지' ? m >= 80 : lv === '부분숙지' ? m >= 60 : m < 60;
          }).length;
          const colors = lv === '숙지'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : lv === '부분숙지'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-red-200 bg-red-50 text-red-600';
          return (
            <div key={lv} className={`flex-1 rounded-xl border px-3 py-2 text-center ${colors}`}>
              <p className="text-xs">{lv}</p>
              <p className="text-lg font-bold">{count}</p>
            </div>
          );
        })}
      </div>

      {/* 지문 카드 목록 */}
      <div className="space-y-3">
        {passageList.map((item) => {
          const lv       = masteryLevel(item.digest.mastery);
          const isOpen   = focusPassageId === item.id;
          const dueLabel = item.assignment?.due_at
            ? new Date(item.assignment.due_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
            : null;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border bg-white overflow-hidden transition-shadow ${isOpen ? 'shadow-md' : ''}`}
            >
              {/* 접힌 헤더 */}
              <Link
                href={isOpen ? '/hi-naesin/review' : `/hi-naesin/review?passage=${item.id}`}
                className="flex items-center gap-3 px-5 py-4 hover:bg-neutral-50"
              >
                {/* 숙지도 점 */}
                <span className={`h-3 w-3 shrink-0 rounded-full ${lv.dot}`} />

                {/* 지문명 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 truncate">{item.title ?? '(지문)'}</p>
                  <p className="text-xs text-neutral-400">
                    {item.isDone ? `숙지도 ${item.digest.mastery}% · ${lv.label}` : '미완료'}
                    {dueLabel && ` · 마감 ${dueLabel}`}
                  </p>
                </div>

                {/* 숙지도 바 (미니) */}
                {item.isDone && (
                  <div className="hidden sm:block w-24 shrink-0">
                    <div className="h-1.5 w-full rounded-full bg-neutral-100">
                      <div
                        className={`h-1.5 rounded-full ${lv.bar}`}
                        style={{ width: `${item.digest.mastery}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 화살표 */}
                <span className="text-neutral-400 text-xs">{isOpen ? '▲' : '▼'}</span>
              </Link>

              {/* 펼쳐진 상세 */}
              {isOpen && item.isDone && (
                <div className="border-t px-5 pb-5 pt-4 space-y-5">

                  {/* 취약 문법 */}
                  {item.digest.weakGrammar.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">취약 문법</h3>
                      <div className="flex flex-wrap gap-2">
                        {item.digest.weakGrammar.map(([cat, n]) => (
                          <span key={cat} className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600">
                            {cat} <span className="font-bold">{n}회 오답</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 틀린 단어 */}
                  {item.digest.missedVocab.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">틀린 단어</h3>
                      <div className="flex flex-wrap gap-2">
                        {item.digest.missedVocab.map((w) => (
                          <span key={w} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 틀린 작문 */}
                  {item.digest.wrongSentences.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">틀린 작문</h3>
                      <div className="space-y-3">
                        {item.digest.wrongSentences.map((ws, i) => (
                          <div key={i} className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 space-y-1.5 text-xs">
                            <p className="text-neutral-500">🇰🇷 {ws.ko}</p>
                            <p className="text-red-500">내 답: {ws.myAnswer}</p>
                            <p className="text-emerald-700 font-medium">모범: {ws.model}</p>
                            {ws.feedback && <p className="text-neutral-400 italic">{ws.feedback}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 아무 취약점 없을 때 */}
                  {item.digest.weakGrammar.length === 0 &&
                   item.digest.missedVocab.length === 0 &&
                   item.digest.wrongSentences.length === 0 && (
                    <p className="text-sm text-emerald-600">🎉 모든 문제를 완벽하게 풀었습니다!</p>
                  )}

                  {/* 드릴/변형문제 링크 */}
                  <div className="flex gap-2 pt-2">
                    <Link
                      href={`/hi-naesin/variant/${item.id}`}
                      className="rounded-xl border px-4 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                    >
                      변형문제 풀기
                    </Link>
                    <Link
                      href={`/hi-naesin/drill/${sessionByPassage.get(item.id)!.id}/complete`}
                      className="rounded-xl border px-4 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
                    >
                      드릴 결과 보기
                    </Link>
                  </div>
                </div>
              )}

              {/* 미완료 상태 */}
              {isOpen && !item.isDone && (
                <div className="border-t px-5 py-4 text-sm text-neutral-400">
                  아직 드릴을 완료하지 않았습니다.{' '}
                  <Link href="/hi-naesin" className="text-neutral-700 underline">드릴 시작하기</Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
