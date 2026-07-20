import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { startVariantSessionAction, submitVariantAnswerAction } from './actions';
import TextOrderingClient from './TextOrderingClient';

export const dynamic = 'force-dynamic';

type Params      = Promise<{ passageId: string }>;
type SearchParams = Promise<{ session?: string; q?: string; result?: string }>;

export default async function HiNaesinVariantPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { passageId } = await params;
  const sp = await searchParams;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // ── 지문 조회 ──────────────────────────────────────────
  const { data: passage } = await supabase
    .from('hi_naesin_passages')
    .select('id, title, passage_text')
    .eq('id', passageId)
    .single();
  if (!passage) notFound();

  // ── 공개된 변형문제 조회 ───────────────────────────────
  const { data: questions } = await supabase
    .from('hi_naesin_variant_questions')
    .select('id, question_type, stem, payload, explanation')
    .eq('passage_id', passageId)
    .eq('is_published', true)
    .order('order_index');

  if (!questions || questions.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 text-center space-y-4">
        <p className="text-neutral-500">아직 공개된 변형문제가 없습니다.</p>
        <Link href="/hi-naesin" className="text-sm text-neutral-400 underline">대시보드로</Link>
      </main>
    );
  }

  // ── 세션 확보 ──────────────────────────────────────────
  let sessionId = sp.session;
  if (!sessionId) {
    const result = await startVariantSessionAction(passageId);
    sessionId = result.sessionId;
  }

  // ── 이미 답한 문제 조회 ────────────────────────────────
  const { data: answers } = await supabase
    .from('hi_naesin_variant_answers')
    .select('question_id, selected_order, is_correct')
    .eq('session_id', sessionId);

  const answerMap = new Map(
    (answers ?? []).map((a) => [a.question_id, a])
  );

  const allAnswered = questions.every((q) => answerMap.has(q.id));

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-10">
      {/* 헤더 */}
      <header className="space-y-1">
        <div className="text-xs text-neutral-400">
          <Link href="/hi-naesin" className="hover:underline">내신 Drill</Link>
          {' / '}변형문제
        </div>
        <h1 className="text-xl font-bold text-neutral-900">{passage.title ?? '(지문)'}</h1>
        {allAnswered && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            ✓ 모든 변형문제를 완료했습니다!
          </div>
        )}
      </header>

      {/* 지문 원문 */}
      <section className="rounded-2xl border bg-neutral-50 p-5">
        <p className="text-xs font-semibold text-neutral-500 mb-2">원문 지문</p>
        <p className="text-sm leading-7 text-neutral-700 whitespace-pre-line">
          {passage.passage_text}
        </p>
      </section>

      {/* 변형문제 목록 */}
      {questions.map((q, qi) => {
        const answer  = answerMap.get(q.id) ?? null;
        const payload = q.payload as Record<string, unknown>;
        const stem    = q.stem ?? defaultStem(q.question_type);

        return (
          <section key={q.id} className="rounded-2xl border bg-white p-5 space-y-4">
            {/* 문제 헤더 */}
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                {qi + 1}
              </span>
              <span className="text-sm font-semibold text-neutral-800">{stem}</span>
              {answer && (
                <span className={`ml-auto text-xs font-semibold ${answer.is_correct ? 'text-emerald-600' : 'text-red-500'}`}>
                  {answer.is_correct ? '✓ 정답' : '✗ 오답'}
                </span>
              )}
            </div>

            {/* text_ordering */}
            {q.question_type === 'text_ordering' && (() => {
              type TOPayload = {
                fixedSegment: { text: string };
                segments: Array<{ id: string; text: string }>;
                correctOrder: string[];
              };
              const p = payload as TOPayload;
              if (!p.segments || !p.correctOrder) return <p className="text-xs text-red-400">payload 오류</p>;

              return (
                <div className="space-y-4">
                  {/* 고정 단락 (주어진 첫 단락) */}
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <p className="text-xs font-semibold text-neutral-400 mb-1">주어진 단락</p>
                    <p className="text-sm leading-6 text-neutral-700">{p.fixedSegment.text}</p>
                  </div>

                  {/* 인터랙티브 순서 맞추기 */}
                  <TextOrderingClient
                    questionId={q.id}
                    sessionId={sessionId!}
                    passageId={passageId}
                    fixedText={p.fixedSegment.text}
                    segments={p.segments}
                    correctOrder={p.correctOrder}
                    action={submitVariantAnswerAction.bind(null, passageId)}
                    alreadyAnswered={!!answer}
                    previousOrder={answer?.selected_order ?? null}
                    isCorrect={answer?.is_correct ?? null}
                  />
                </div>
              );
            })()}

            {/* 해설 */}
            {answer && q.explanation && (
              <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                <p className="text-xs font-semibold text-neutral-500 mb-1">해설</p>
                <p className="text-sm text-neutral-600">{q.explanation}</p>
              </div>
            )}
          </section>
        );
      })}

      {/* 하단 버튼 */}
      <div className="flex gap-3">
        <Link
          href="/hi-naesin"
          className="flex-1 rounded-xl border py-3 text-center text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          대시보드
        </Link>
        {allAnswered && (
          <Link
            href={`/hi-naesin?tab=history`}
            className="flex-1 rounded-xl bg-neutral-900 py-3 text-center text-sm font-semibold text-white hover:bg-neutral-800"
          >
            기록 보기
          </Link>
        )}
      </div>
    </main>
  );
}

function defaultStem(type: string): string {
  switch (type) {
    case 'text_ordering':      return '주어진 단락 다음에 이어질 순서로 가장 적절한 것을 고르시오.';
    case 'blank_word':         return '빈칸 (A), (B)에 들어갈 말로 가장 적절한 것을 고르시오.';
    case 'blank_sentence':     return '빈칸에 들어갈 문장으로 가장 적절한 것을 고르시오.';
    case 'irrelevant_sentence': return '전체 흐름과 관계없는 문장을 고르시오.';
    case 'summary_fill':       return '다음 글의 내용을 한 문장으로 요약하고자 한다. 빈칸에 들어갈 적절한 말을 고르시오.';
    case 'fact':               return '글의 내용과 일치하는 것을 고르시오.';
    case 'negative_fact':      return '글의 내용과 일치하지 않는 것을 고르시오.';
    default:                   return '다음 문제를 푸시오.';
  }
}
