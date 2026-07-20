// app/(protected)/hi-naesin/drill/[sessionId]/review/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import type {
  TranslationPayload,
  TranslationArrangePayload,
  TranslationChoicePayload,
  FillBlankPayload,
  WritingPayload,
  WritingArrangePayload,
  SummaryPayload,
  GrammarChoicePayload,
  VocabPayload,
  HiNaesinDrillType,
} from '@/models/hi-naesin/drill';
import { drillTypeLabel } from '@/models/hi-naesin/drill';

export const dynamic = 'force-dynamic';

type Params = Promise<{ sessionId: string }>;

type DrillRow = {
  id: string;
  drill_type: string;
  order_index: number;
  payload: Record<string, unknown>;
};

type ResponseRow = {
  drill_id: string;
  response_text: string | null;
  response_choice: string | null;
  is_correct: boolean | null;
  score_pct: number | null;
  feedback_text: string | null;
};

type WrongItem = {
  drill: DrillRow;
  response: ResponseRow;
};

const TYPE_ORDER: HiNaesinDrillType[] = [
  'translation_arrange',
  'translation',
  'translation_choice',
  'fill_blank',
  'writing_arrange',
  'writing',
  'summary',
  'grammar_choice',
  'vocab',
];

const TYPE_COLOR: Record<HiNaesinDrillType, string> = {
  translation_arrange: 'bg-sky-50 border-sky-200 text-sky-800',
  translation:          'bg-blue-50 border-blue-200 text-blue-800',
  translation_choice:   'bg-cyan-50 border-cyan-200 text-cyan-800',
  fill_blank:            'bg-violet-50 border-violet-200 text-violet-800',
  writing_arrange:        'bg-lime-50 border-lime-200 text-lime-800',
  writing:                'bg-emerald-50 border-emerald-200 text-emerald-800',
  summary:                'bg-teal-50 border-teal-200 text-teal-800',
  grammar_choice:          'bg-amber-50 border-amber-200 text-amber-800',
  vocab:                   'bg-rose-50 border-rose-200 text-rose-800',
};

function Badge({ type }: { type: string }) {
  const color = TYPE_COLOR[type as HiNaesinDrillType] ?? 'bg-slate-50 border-slate-200 text-slate-700';
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${color}`}>
      {drillTypeLabel(type as HiNaesinDrillType)}
    </span>
  );
}

function safeParseIdArray(json: string): string[] | null {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function WrongCard({ item }: { item: WrongItem }) {
  const { drill, response } = item;
  const type = drill.drill_type as HiNaesinDrillType;
  const p = drill.payload;

  let question = '';
  let correctAnswer = '';
  let studentAnswer = response.response_text ?? response.response_choice ?? '(미제출)';

  if (type === 'translation') {
    const payload = p as unknown as TranslationPayload;
    question = payload.sentenceEn;
    correctAnswer = payload.answerKo;
  } else if (type === 'translation_arrange' || type === 'writing_arrange') {
    const payload = p as unknown as TranslationArrangePayload | WritingArrangePayload;
    question = type === 'translation_arrange'
      ? (payload as TranslationArrangePayload).sentenceEn
      : (payload as WritingArrangePayload).koPrompt;
    const chunkText = (c: { ko?: string; en?: string }) => c.ko ?? c.en ?? '';
    correctAnswer = payload.chunks.map(chunkText).join(' ');
    const submittedIds = response.response_choice ? safeParseIdArray(response.response_choice) : null;
    studentAnswer = submittedIds
      ? submittedIds.map((id) => chunkText(payload.chunks.find((c) => c.id === id) ?? {})).join(' ')
      : '(미제출)';
  } else if (type === 'translation_choice') {
    const payload = p as unknown as TranslationChoicePayload;
    question = payload.sentenceEn;
    const opt = (key: string) => payload.options.find((o) => o.key === key)?.text ?? key;
    correctAnswer = `(${payload.correct.toUpperCase()}) ${opt(payload.correct)}`;
    studentAnswer = response.response_choice
      ? `(${response.response_choice.toUpperCase()}) ${opt(response.response_choice)}`
      : '(미제출)';
  } else if (type === 'fill_blank') {
    const payload = p as unknown as FillBlankPayload;
    question = payload.sentenceTemplate;
    correctAnswer = payload.answer;
    if (payload.sentenceKo) question += `\n${payload.sentenceKo}`;
  } else if (type === 'writing') {
    const payload = p as unknown as WritingPayload;
    question = payload.koPrompt;
    correctAnswer = payload.answerEn;
  } else if (type === 'summary') {
    const payload = p as unknown as SummaryPayload;
    question = payload.template;
    correctAnswer = payload.blanks.map((b, i) => `(${String.fromCharCode(65 + i)}) ${b.answer}`).join('  ');
  } else if (type === 'grammar_choice') {
    const payload = p as unknown as GrammarChoicePayload;
    const opts: Record<string, string | undefined> = {
      a: payload.optionA,
      b: payload.optionB,
      c: payload.optionC,
      d: payload.optionD,
    };
    question = payload.sentenceTemplate;
    if (payload.contextBefore) question = `${payload.contextBefore}\n${question}`;
    correctAnswer = `(${payload.correct.toUpperCase()}) ${opts[payload.correct] ?? ''}`;
    studentAnswer = response.response_choice
      ? `(${response.response_choice.toUpperCase()}) ${opts[response.response_choice] ?? response.response_choice}`
      : '(미제출)';
  } else if (type === 'vocab') {
    const payload = p as unknown as VocabPayload;
    question = payload.word;
    correctAnswer = payload.meaningKo;
    if (payload.exampleSentence) correctAnswer += `\n예문: ${payload.exampleSentence}`;
  }

  const scorePct = response.score_pct;
  const feedback = response.feedback_text;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <Badge type={type} />
        {type === 'grammar_choice' && (p as unknown as GrammarChoicePayload).grammarCategory && (
          <span className="text-xs text-slate-500">{(p as unknown as GrammarChoicePayload).grammarCategory}</span>
        )}
        {scorePct !== null && (
          <span className={`ml-auto text-xs font-semibold ${scorePct >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
            {scorePct}점
          </span>
        )}
        {scorePct === null && response.is_correct === false && (
          <span className="ml-auto text-xs font-semibold text-red-500">✗ 오답</span>
        )}
      </div>

      <div className="space-y-3 px-4 py-4">
        {/* 문제 */}
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">문제</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{question}</p>
        </div>

        {/* 내 답 */}
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
          <p className="mb-1 text-[11px] font-semibold text-red-500">내 답</p>
          <p className="whitespace-pre-wrap text-sm text-red-800">{studentAnswer}</p>
        </div>

        {/* 정답 */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="mb-1 text-[11px] font-semibold text-emerald-600">정답</p>
          <p className="whitespace-pre-wrap text-sm text-emerald-800">{correctAnswer}</p>
        </div>

        {/* AI 피드백 */}
        {feedback && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5">
            <p className="mb-1 text-[11px] font-semibold text-blue-500">해설</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-blue-900">{feedback}</p>
          </div>
        )}

        {/* grammar_choice 설명 */}
        {type === 'grammar_choice' && (p as unknown as GrammarChoicePayload).explanation && (
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
            <p className="mb-1 text-[11px] font-semibold text-amber-600">문법 해설</p>
            <p className="text-sm leading-relaxed text-amber-900">{(p as unknown as GrammarChoicePayload).explanation}</p>
          </div>
        )}

        {/* translation_choice 설명 */}
        {type === 'translation_choice' && (p as unknown as TranslationChoicePayload).explanation && (
          <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2.5">
            <p className="mb-1 text-[11px] font-semibold text-cyan-600">해설</p>
            <p className="text-sm leading-relaxed text-cyan-900">{(p as unknown as TranslationChoicePayload).explanation}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function HiNaesinReviewPage({ params }: { params: Params }) {
  const { sessionId } = await params;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session } = await supabase
    .from('hi_naesin_sessions')
    .select('id, passage_id, submitted_at, score_percent')
    .eq('id', sessionId)
    .single();

  if (!session) notFound();

  const [{ data: passage }, { data: wrongResponses }, { data: allDrillsForSummary }] = await Promise.all([
    supabase
      .from('hi_naesin_passages')
      .select('title, passage_text')
      .eq('id', session.passage_id)
      .single(),
    supabase
      .from('hi_naesin_drill_responses')
      .select('drill_id, response_text, response_choice, is_correct, score_pct, feedback_text')
      .eq('session_id', sessionId)
      .or('is_correct.eq.false,score_pct.lt.70'),
    supabase
      .from('hi_naesin_drills')
      .select('id, drill_type, order_index, payload')
      .eq('passage_id', session.passage_id)
      .in('drill_type', ['vocab', 'grammar_choice'])
      .order('order_index'),
  ]);

  if (!wrongResponses || wrongResponses.length === 0) {
    return (
      <main className="mx-auto max-w-xl space-y-6 px-4 py-12 text-center">
        <div className="text-4xl">🎯</div>
        <h1 className="text-xl font-bold text-slate-900">오답이 없습니다!</h1>
        <p className="text-sm text-slate-500">모든 문제를 정확히 풀었어요.</p>
        <Link
          href={`/hi-naesin/drill/${sessionId}/complete`}
          className="inline-block rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
        >
          결과 페이지로
        </Link>
      </main>
    );
  }

  const drillIds = wrongResponses.map((r) => r.drill_id);

  const { data: drills } = await supabase
    .from('hi_naesin_drills')
    .select('id, drill_type, order_index, payload')
    .in('id', drillIds);

  const drillMap = new Map((drills ?? []).map((d) => [d.id, d]));
  const responseMap = new Map(wrongResponses.map((r) => [r.drill_id, r]));

  const wrongItems: WrongItem[] = drillIds
    .map((id) => {
      const drill = drillMap.get(id);
      const response = responseMap.get(id);
      if (!drill || !response) return null;
      return { drill, response };
    })
    .filter((x): x is WrongItem => x !== null)
    .sort((a, b) => {
      const typeA = TYPE_ORDER.indexOf(a.drill.drill_type as HiNaesinDrillType);
      const typeB = TYPE_ORDER.indexOf(b.drill.drill_type as HiNaesinDrillType);
      if (typeA !== typeB) return typeA - typeB;
      return a.drill.order_index - b.drill.order_index;
    });

  const grouped = TYPE_ORDER.map((type) => ({
    type,
    items: wrongItems.filter((i) => i.drill.drill_type === type),
  })).filter((g) => g.items.length > 0);

  // Build key elements from all vocab + grammar drills
  const vocabItems = (allDrillsForSummary ?? [])
    .filter((d) => d.drill_type === 'vocab')
    .map((d) => {
      const p = d.payload as { word?: string; meaningKo?: string };
      return { word: p.word ?? '', meaning: p.meaningKo ?? '' };
    })
    .filter((v) => v.word);

  const grammarItems = (allDrillsForSummary ?? [])
    .filter((d) => d.drill_type === 'grammar_choice')
    .map((d) => {
      const p = d.payload as { grammarCategory?: string; sentenceTemplate?: string };
      return { category: p.grammarCategory ?? '', sentence: p.sentenceTemplate ?? '' };
    })
    .filter((g) => g.category || g.sentence);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_520px]">

        {/* Left: 지문 + 핵심 요소 */}
        <div className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto space-y-4">
          {/* 지문 */}
          <div className="rounded-2xl border bg-white p-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">지문</p>
            <p className="whitespace-pre-wrap text-sm leading-8 text-slate-800">
              {passage?.passage_text ?? ''}
            </p>
          </div>

          {/* 어휘 정리 */}
          {vocabItems.length > 0 && (
            <div className="rounded-2xl border bg-white p-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">어휘 정리</p>
              <div className="space-y-1.5">
                {vocabItems.map((v, i) => (
                  <div key={i} className="flex items-baseline gap-2 text-sm">
                    <span className="font-semibold text-slate-800 shrink-0">{v.word}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-600">{v.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 문법 포인트 */}
          {grammarItems.length > 0 && (
            <div className="rounded-2xl border bg-white p-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-500">문법 포인트</p>
              <div className="space-y-3">
                {grammarItems.map((g, i) => (
                  <div key={i} className="space-y-1">
                    {g.category && (
                      <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                        {g.category}
                      </span>
                    )}
                    {g.sentence && (
                      <p className="text-xs leading-relaxed text-slate-600">{g.sentence}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: 오답 카드 */}
        <div className="space-y-6">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">오답 해설</p>
            <h1 className="text-xl font-bold text-slate-900">{passage?.title ?? '지문'}</h1>
            <p className="text-sm text-slate-500">틀린 문제 {wrongItems.length}개</p>
          </header>

          {grouped.map(({ type, items }) => (
            <section key={type} className="space-y-3">
              <h2 className="text-sm font-bold text-slate-700">
                {drillTypeLabel(type as HiNaesinDrillType)}
                <span className="ml-2 text-xs font-normal text-slate-400">{items.length}개</span>
              </h2>
              {items.map((item) => (
                <WrongCard key={item.drill.id} item={item} />
              ))}
            </section>
          ))}

          <div className="flex flex-col gap-3 pt-2">
            <Link
              href={`/hi-naesin/drill/${sessionId}/complete`}
              className="rounded-xl border px-6 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← 결과 페이지
            </Link>
            <Link
              href="/hi-naesin"
              className="rounded-xl bg-slate-900 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-slate-800"
            >
              대시보드
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
