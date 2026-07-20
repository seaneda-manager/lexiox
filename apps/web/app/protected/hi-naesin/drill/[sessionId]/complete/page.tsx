import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

// ── 변형문제 있으면 링크 노출 ─────────────────────────────
async function VariantLink({ passageId }: { passageId: string }) {
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from('hi_naesin_variant_questions')
    .select('id')
    .eq('passage_id', passageId)
    .eq('is_published', true)
    .limit(1);

  if (!data || data.length === 0) return null;

  return (
    <Link
      href={`/hi-naesin/variant/${passageId}`}
      className="rounded-xl border-2 border-violet-300 bg-violet-50 px-6 py-3 text-sm font-semibold text-violet-700 text-center hover:bg-violet-100"
    >
      변형문제 풀기 →
    </Link>
  );
}

export const dynamic = 'force-dynamic';

type Params = Promise<{ sessionId: string }>;

function scoreColor(scorePct: number | null, isCorrect: boolean | null) {
  if (isCorrect === null) return { dot: 'bg-neutral-300', border: 'border-neutral-200', bg: 'bg-neutral-50', text: 'text-neutral-400' };
  if (scorePct === null) {
    return isCorrect
      ? { dot: 'bg-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800' }
      : { dot: 'bg-red-500',     border: 'border-red-200',     bg: 'bg-red-50',     text: 'text-red-800'     };
  }
  if (scorePct >= 80) return { dot: 'bg-emerald-500', border: 'border-emerald-200', bg: 'bg-emerald-50',  text: 'text-emerald-800' };
  if (scorePct >= 70) return { dot: 'bg-emerald-400', border: 'border-emerald-100', bg: 'bg-emerald-50',  text: 'text-emerald-700' };
  if (scorePct >= 50) return { dot: 'bg-amber-400',   border: 'border-amber-200',   bg: 'bg-amber-50',    text: 'text-amber-800'   };
  return               { dot: 'bg-red-500',     border: 'border-red-200',     bg: 'bg-red-50',     text: 'text-red-800'     };
}

export default async function HiNaesinDrillCompletePage({
  params,
}: {
  params: Params;
}) {
  const { sessionId } = await params;
  const supabase = await getServerSupabase();

  const { data: session } = await supabase
    .from('hi_naesin_sessions')
    .select('id, passage_id, submitted_at')
    .eq('id', sessionId)
    .single();

  if (!session) notFound();

  const [{ data: passage }, { data: allResponses }, { data: writingDrills }] = await Promise.all([
    supabase
      .from('hi_naesin_passages')
      .select('title')
      .eq('id', session.passage_id)
      .single(),
    supabase
      .from('hi_naesin_drill_responses')
      .select('is_correct, drill_id, score_pct, feedback_text, response_text')
      .eq('session_id', sessionId),
    supabase
      .from('hi_naesin_drills')
      .select('id, order_index, payload')
      .eq('passage_id', session.passage_id)
      .eq('drill_type', 'writing')
      .order('order_index'),
  ]);

  // 전체 점수 요약
  const total   = allResponses?.length ?? 0;
  const correct = allResponses?.filter((r) => r.is_correct === true).length ?? 0;
  const wrong   = allResponses?.filter((r) => r.is_correct === false).length ?? 0;

  // 작문 드릴 + 응답 합치기
  const responseMap = new Map(
    (allResponses ?? []).map((r) => [r.drill_id, r])
  );

  type WritingRow = {
    id: string;
    order_index: number;
    payload: { koPrompt: string; answerEn: string };
    response: typeof allResponses extends (infer T)[] ? T : never | null;
  };

  const writingRows: WritingRow[] = (writingDrills ?? []).map((d) => ({
    id:          d.id,
    order_index: d.order_index,
    payload:     d.payload as { koPrompt: string; answerEn: string },
    response:    responseMap.get(d.id) ?? null,
  }));

  const hasWriting = writingRows.length > 0;

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      {/* 헤더 */}
      <div className="text-center space-y-2">
        <div className="text-4xl">🎉</div>
        <h1 className="text-2xl font-bold text-neutral-900">Drill 완료!</h1>
        <p className="text-sm text-neutral-500">{passage?.title ?? '지문'}</p>
      </div>

      {/* 점수 요약 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4 text-center">
          <p className="text-xs text-neutral-500">정답</p>
          <p className="mt-1 text-2xl font-bold text-emerald-600">{correct}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 text-center">
          <p className="text-xs text-neutral-500">오답</p>
          <p className="mt-1 text-2xl font-bold text-red-500">{wrong}</p>
        </div>
        <div className="rounded-2xl border bg-white p-4 text-center">
          <p className="text-xs text-neutral-500">전체</p>
          <p className="mt-1 text-2xl font-bold text-neutral-700">{total}</p>
        </div>
      </div>

      {/* 작문 지문 재구성 */}
      {hasWriting && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900">내가 작문한 지문</h2>
            {/* 범례 */}
            <div className="flex items-center gap-3 text-xs text-neutral-400">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />80점+</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-400" />50~79점</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />50점 미만</span>
            </div>
          </div>

          <div className="rounded-2xl border bg-white divide-y overflow-hidden">
            {writingRows.map((row, i) => {
              const res      = row.response;
              const scorePct = (res as any)?.score_pct ?? null;
              const isCorrect = (res as any)?.is_correct ?? null;
              const myAnswer  = (res as any)?.response_text ?? null;
              const feedback  = (res as any)?.feedback_text ?? null;
              const modelAnswer = row.payload.answerEn;
              const colors = scoreColor(scorePct, isCorrect);
              const isWeak = isCorrect === false || (scorePct !== null && scorePct < 70);

              return (
                <details key={row.id} className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 hover:bg-neutral-50 select-none">
                    {/* 순번 + 색상 점 */}
                    <div className="flex items-center gap-2 pt-0.5 shrink-0">
                      <span className="text-xs text-neutral-400 w-4 text-right">{i + 1}</span>
                      <span className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${colors.dot}`} />
                    </div>

                    {/* 내 작문 또는 미제출 */}
                    <span className={`flex-1 text-sm leading-relaxed ${myAnswer ? colors.text : 'text-neutral-300 italic'}`}>
                      {myAnswer ?? '(미제출)'}
                    </span>

                    {/* 점수 */}
                    {scorePct !== null && (
                      <span className={`shrink-0 text-xs font-semibold ${colors.text}`}>
                        {scorePct}점
                      </span>
                    )}
                    {scorePct === null && isCorrect !== null && (
                      <span className={`shrink-0 text-xs font-semibold ${colors.text}`}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                    )}
                  </summary>

                  {/* 펼쳐지는 상세 */}
                  <div className={`px-4 pb-4 pt-2 space-y-2 border-t ${colors.border} ${colors.bg}`}>
                    {myAnswer && (
                      <div>
                        <p className="text-xs font-semibold text-neutral-500 mb-1">내 답</p>
                        <p className="text-sm text-neutral-700">{myAnswer}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-emerald-600 mb-1">모범 답안</p>
                      <p className="text-sm text-emerald-800">{modelAnswer}</p>
                    </div>
                    {feedback && (
                      <div className="rounded-xl border border-neutral-200 bg-white px-3 py-2">
                        <p className="text-xs text-neutral-500 leading-relaxed">{feedback}</p>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      )}

      {/* 버튼 */}
      <div className="flex flex-col gap-3">
        {wrong > 0 && (
          <Link
            href={`/hi-naesin/drill/${sessionId}/review`}
            className="rounded-xl border-2 border-red-300 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700 text-center hover:bg-red-100"
          >
            오답 해설 보기 ({wrong}개) →
          </Link>
        )}

        {/* 변형문제가 있으면 링크 표시 */}
        <VariantLink passageId={session.passage_id} />

        <Link
          href="/hi-naesin"
          className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white text-center hover:bg-neutral-800"
        >
          대시보드
        </Link>
        <Link
          href={`/hi-naesin/drill/${sessionId}?step=0`}
          className="rounded-xl border px-6 py-3 text-sm font-semibold text-neutral-700 text-center hover:bg-neutral-50"
        >
          다시 풀기
        </Link>
      </div>
    </main>
  );
}
