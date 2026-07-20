'use client';

import { useCallback, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import WritingHintReveal from '../WritingHintReveal';
import PassagePanel from './PassagePanel';
import {
  submitAnswerClientAction,
  selfCheckClientAction,
  completeSessionClientAction,
  type ClientResponseRow,
} from '../actions';

// ── 타입 ─────────────────────────────────────────────────

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

type TypeInfo = { total: number; done: number; firstUnanswered: number };

const TYPE_ORDER = [
  'vocab', 'translation_arrange', 'translation', 'translation_choice',
  'fill_blank', 'writing_arrange', 'writing', 'grammar_choice',
] as const;

const DRILL_LABEL: Record<string, string> = {
  vocab:               '단어',
  translation_arrange: '해석 배열',
  translation:         '해석',
  translation_choice:  '해석 확인',
  fill_blank:          '빈칸 넣기',
  writing_arrange:     '작문 배열',
  writing:             '작문',
  summary:              '요약',
  grammar_choice:       '문법',
};

const DRILL_INSTRUCTION: Record<string, string> = {
  vocab:               '영어 단어의 우리말 뜻을 입력하세요.',
  translation_arrange: '한글 생각단위 조각을 순서대로 클릭해 번역을 조립하세요.',
  translation:         '영어 문장을 보고 우리말로 해석하세요.',
  translation_choice:  '가장 정확한 해석을 고르세요.',
  fill_blank:          '빈칸(____) 에 알맞은 영어 단어를 입력하세요.',
  writing_arrange:     '영어 생각단위 조각을 순서대로 클릭해 문장을 조립하세요.',
  writing:             '주어진 우리말 문장을 영어로 작문하세요.',
  summary:              '지문 내용을 바탕으로 요약문의 빈칸을 채우세요.',
  grammar_choice:       '빈칸에 알맞은 답을 고르거나 연결어를 선택하세요.',
};

// ─────────────────────────────────────────────────────────
// Main client component
// ─────────────────────────────────────────────────────────

export default function DrillClient({
  sessionId,
  passageTitle,
  passageText,
  passageTranslation,
  allDrills,
  initialResponses,
  initialType,
  initialStep,
  enabledDrillTypes,
}: {
  sessionId: string;
  passageTitle: string;
  passageText: string;
  passageTranslation: string | null;
  allDrills: DrillRow[];
  initialResponses: ResponseRow[];
  initialType: string;
  initialStep: number;
  enabledDrillTypes: string[] | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── 응답 상태 ─────────────────────────────────────────
  const [responses, setResponses] = useState<Map<string, ResponseRow>>(
    () => new Map(initialResponses.map((r) => [r.drill_id, r])),
  );

  // ── 타입별 그룹화 ─────────────────────────────────────
  const drillsByType = useMemo(() => {
    const map: Record<string, DrillRow[]> = {};
    for (const d of allDrills) {
      if (!map[d.drill_type]) map[d.drill_type] = [];
      map[d.drill_type].push(d);
    }
    for (const t of Object.keys(map)) {
      map[t].sort((a, b) => a.order_index - b.order_index);
    }
    return map;
  }, [allDrills]);

  const availableTypes = useMemo(
    () => (TYPE_ORDER as readonly string[]).filter(
      (t) => (drillsByType[t]?.length ?? 0) > 0
        && (enabledDrillTypes === null || enabledDrillTypes.includes(t)),
    ),
    [drillsByType, enabledDrillTypes],
  );

  // ── 탐색 상태 ─────────────────────────────────────────
  const [currentType, setCurrentType] = useState(initialType);
  const [currentStep, setCurrentStep] = useState(initialStep);

  const currentDrills = drillsByType[currentType] ?? [];
  const typeTotal     = currentDrills.length;
  const drill         = currentDrills[currentStep];

  const currentTypeIdx = availableTypes.indexOf(currentType);
  const nextType       = availableTypes[currentTypeIdx + 1] ?? null;

  // ── 탭 정보 (derived) ─────────────────────────────────
  const typeInfoMap = useMemo((): Record<string, TypeInfo> => {
    const map: Record<string, TypeInfo> = {};
    for (const t of availableTypes) {
      const ds = drillsByType[t];
      const done = ds.filter((d) => responses.has(d.id)).length;
      const firstUnanswered = ds.findIndex((d) => !responses.has(d.id));
      map[t] = {
        total: ds.length,
        done,
        firstUnanswered: firstUnanswered >= 0 ? firstUnanswered : ds.length - 1,
      };
    }
    return map;
  }, [availableTypes, drillsByType, responses]);

  const response   = drill ? (responses.get(drill.id) ?? null) : null;
  const isAnswered = response !== null;

  const isSelfCheckType = currentType === 'translation' || currentType === 'writing' || currentType === 'vocab';
  const needsSelfCheck  = isSelfCheckType && isAnswered && response?.is_correct === null;
  const showNextButton  = isSelfCheckType && isAnswered && response?.is_correct !== null;

  // ── 네비게이션 헬퍼 ───────────────────────────────────
  const goNext = useCallback(() => {
    const nextStep = currentStep + 1;
    if (nextStep < typeTotal) {
      setCurrentStep(nextStep);
    } else if (nextType) {
      setCurrentType(nextType);
      setCurrentStep(typeInfoMap[nextType]?.firstUnanswered ?? 0);
    } else {
      startTransition(async () => {
        await completeSessionClientAction(sessionId);
        router.push(`/hi-naesin/drill/${sessionId}/complete`);
      });
    }
  }, [currentStep, typeTotal, nextType, typeInfoMap, sessionId, router]);

  // ── 답변 제출 ─────────────────────────────────────────
  const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!drill) return;
    startTransition(async () => {
      const fd = new FormData(e.currentTarget);
      const result = await submitAnswerClientAction(sessionId, drill.id, fd);
      if ('error' in result) {
        console.error(result.error);
        return;
      }
      setResponses((prev) => new Map(prev).set(drill.id, result));
    });

    // fill_blank / grammar_choice → 자동으로 다음으로 넘어가지 않음 (결과 표시)
  }, [drill, sessionId, startTransition]);

  // ── 자기 채점 ─────────────────────────────────────────
  const handleSelfCheck = useCallback(async (isCorrect: boolean) => {
    if (!drill) return;
    await selfCheckClientAction(sessionId, drill.id, isCorrect);
    setResponses((prev) => {
      const next = new Map(prev);
      const existing = next.get(drill.id);
      if (existing) next.set(drill.id, { ...existing, is_correct: isCorrect });
      return next;
    });
  }, [drill, sessionId]);

  if (!drill) return null;

  // writing drills for PassageProgress
  const writingDrills = (drillsByType['writing'] ?? []) as any as Array<{
    id: string;
    order_index: number;
    payload: { answerEn: string; koPrompt: string };
  }>;
  const writingResponseMap = new Map<
    string,
    { response_text: string | null; is_correct: boolean | null; score_pct: number | null }
  >();
  for (const d of writingDrills) {
    const r = responses.get(d.id);
    if (r) writingResponseMap.set(d.id, r);
  }

  // Derive highlight text for passage panel from current drill
  const p = drill.payload;
  let highlightText: string | null = null;
  let highlightType: 'sentence' | 'word' | null = null;
  if (currentType === 'translation' || currentType === 'translation_arrange' || currentType === 'translation_choice') {
    highlightText = (p as { sentenceEn?: string }).sentenceEn ?? null;
    highlightType = 'sentence';
  } else if (currentType === 'fill_blank') {
    highlightText = (p as { sentenceTemplate?: string }).sentenceTemplate ?? null;
    highlightType = 'sentence';
  } else if (currentType === 'writing') {
    highlightText = (p as { answerEn?: string }).answerEn ?? null;
    highlightType = 'sentence';
  } else if (currentType === 'writing_arrange') {
    highlightText = (p as { koPrompt?: string }).koPrompt ?? null;
    highlightType = 'sentence';
  } else if (currentType === 'vocab') {
    highlightText = (p as { word?: string }).word ?? null;
    highlightType = 'word';
  } else if (currentType === 'grammar_choice') {
    highlightText = (p as { sentenceTemplate?: string }).sentenceTemplate ?? null;
    highlightType = 'sentence';
  }

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-4 space-y-4" suppressHydrationWarning>
      {/* 상단 바: 목록 버튼 + 제목 */}
      <div className="flex items-center gap-3">
        <Link
          href="/hi-naesin"
          className="flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-200 transition-colors shrink-0"
        >
          ← 목록
        </Link>
        <p className="text-sm font-medium text-neutral-600 truncate">{passageTitle}</p>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 gap-6 justify-center" style={{ gridTemplateColumns: 'min(720px, 100%) 480px' }}>

        {/* Left: Passage Panel (sticky) */}
        <div className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
          <PassagePanel
            passageText={passageText}
            passageTranslation={passageTranslation}
            highlightText={highlightText}
            highlightType={highlightType}
          />
        </div>

        {/* Right: Drill content */}
        <div className="space-y-4">
          {/* 블록 탭 바 */}
          <div className="flex gap-1 rounded-2xl border bg-white p-1">
            {availableTypes.map((t) => {
              const info      = typeInfoMap[t];
              const isActive  = t === currentType;
              const isComplete = info.done >= info.total && info.total > 0;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setCurrentType(t);
                    setCurrentStep(info.firstUnanswered);
                  }}
                  className={[
                    'flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-center transition-colors',
                    isActive
                      ? 'bg-neutral-900 text-white'
                      : 'text-neutral-500 hover:bg-neutral-50',
                  ].join(' ')}
                >
                  <span className="text-xs font-semibold leading-tight">{DRILL_LABEL[t] ?? t}</span>
                  <span className="text-[10px] leading-tight opacity-60">
                    {isComplete ? '✓' : `${info.done}/${info.total}`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 블록 내 진행 바 */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span className="font-semibold text-neutral-700">{DRILL_LABEL[currentType] ?? currentType}</span>
              <span>{currentStep + 1} / {typeTotal}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-neutral-900 transition-all"
                style={{ width: `${((currentStep + 1) / typeTotal) * 100}%` }}
              />
            </div>
            <p className="text-xs text-neutral-400">{DRILL_INSTRUCTION[currentType]}</p>
          </div>

          {/* 드릴 카드 */}
          <div className="rounded-2xl border bg-white p-6 space-y-5">
            {(currentType === 'translation_arrange' || currentType === 'writing_arrange') && (
              <ArrangeDrill
                key={drill.id}
                drill={drill}
                direction={currentType === 'translation_arrange' ? 'translation' : 'writing'}
                response={response}
                isAnswered={isAnswered}
                onSubmit={handleSubmit}
                onNext={goNext}
                step={currentStep}
                typeTotal={typeTotal}
                nextType={nextType}
              />
            )}
            {currentType === 'translation_choice' && (
              <TranslationChoiceDrill
                key={drill.id}
                drill={drill}
                response={response}
                isAnswered={isAnswered}
                onSubmit={handleSubmit}
                onNext={goNext}
                step={currentStep}
                typeTotal={typeTotal}
                nextType={nextType}
              />
            )}
            {currentType === 'translation' && (
              <TranslationDrill
                key={drill.id}
                drill={drill}
                response={response}
                isAnswered={isAnswered}
                onSubmit={handleSubmit}
              />
            )}
            {currentType === 'fill_blank' && (
              <FillBlankDrill
                key={drill.id}
                drill={drill}
                response={response}
                isAnswered={isAnswered}
                onSubmit={handleSubmit}
                onNext={goNext}
                step={currentStep}
                typeTotal={typeTotal}
                nextType={nextType}
              />
            )}
            {currentType === 'writing' && (
              <WritingDrill
                key={drill.id}
                drill={drill}
                response={response}
                isAnswered={isAnswered}
                onSubmit={handleSubmit}
              />
            )}
            {currentType === 'vocab' && (
              <VocabDrill
                key={drill.id}
                drill={drill}
                response={response}
                isAnswered={isAnswered}
                onSubmit={handleSubmit}
              />
            )}
            {currentType === 'grammar_choice' && (
              <GrammarChoiceDrill
                key={drill.id}
                drill={drill}
                response={response}
                isAnswered={isAnswered}
                onSubmit={handleSubmit}
                onNext={goNext}
                step={currentStep}
                typeTotal={typeTotal}
                nextType={nextType}
              />
            )}
          </div>

          {/* 자기 채점 */}
          {needsSelfCheck && (
            <div className="rounded-2xl border bg-neutral-50 p-4 space-y-3">
              <p className="text-sm font-medium text-neutral-700">내 답과 비교해보세요. 맞았나요?</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleSelfCheck(true)}
                  className="rounded-xl border border-emerald-300 bg-emerald-50 px-6 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  ✓ 맞음
                </button>
                <button
                  type="button"
                  onClick={() => handleSelfCheck(false)}
                  className="rounded-xl border border-red-200 bg-red-50 px-6 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
                >
                  ✗ 틀림
                </button>
              </div>
            </div>
          )}

          {/* 다음 버튼 */}
          {showNextButton && (
            <button
              type="button"
              onClick={goNext}
              disabled={isPending}
              className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {currentStep + 1 >= typeTotal
                ? nextType
                  ? `다음 블록: ${DRILL_LABEL[nextType]} →`
                  : '결과 보기 →'
                : '다음 →'}
            </button>
          )}

          {/* 작문 누적 진행 */}
          {writingDrills.length > 0 && (
            <PassageProgress
              writingDrills={writingDrills}
              writingResponseMap={writingResponseMap}
              currentDrillId={currentType === 'writing' ? drill.id : null}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 점수 뱃지
// ─────────────────────────────────────────────────────────

function ScoreBadge({ scorePct, isCorrect }: { scorePct: number | null; isCorrect: boolean | null }) {
  if (scorePct === null || isCorrect === null) return null;
  return (
    <div className={[
      'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold',
      isCorrect
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-red-200 bg-red-50 text-red-700',
    ].join(' ')}>
      <span>{isCorrect ? '✓' : '✗'}</span>
      <span>{scorePct}점 · {isCorrect ? '정답' : '오답'}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// 드릴 컴포넌트들
// ─────────────────────────────────────────────────────────

function TranslationDrill({
  drill, response, isAnswered, onSubmit,
}: {
  drill: DrillRow;
  response: ResponseRow | null;
  isAnswered: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const p = drill.payload as { sentenceEn: string; answerKo: string };
  const [submitting, setSubmitting] = useState(false);
  return (
    <>
      <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-800">
        {p.sentenceEn}
      </div>
      {!isAnswered ? (
        <form onSubmit={async (e) => { setSubmitting(true); await onSubmit(e); setSubmitting(false); }}>
          <input type="hidden" name="drill_type"  value="translation" />
          <input type="hidden" name="sentence_en" value={p.sentenceEn} />
          <input type="hidden" name="answer_ko"   value={p.answerKo} />
          <textarea
            name="response_text"
            rows={3}
            placeholder="한국어로 해석하세요."
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? '제출 중...' : '제출'}
          </button>
        </form>
      ) : (
        <>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-800">
            <span className="text-xs font-medium text-neutral-400 block mb-1">내 답</span>
            {response?.response_text ?? '(없음)'}
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <span className="text-xs font-medium text-emerald-600 block mb-1">모범 답안</span>
            {p.answerKo}
          </div>
          <ScoreBadge scorePct={response?.score_pct ?? null} isCorrect={response?.is_correct ?? null} />
          {response?.feedback_text && (
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-600 leading-relaxed">
              {response.feedback_text}
            </div>
          )}
        </>
      )}
    </>
  );
}

function FillBlankDrill({
  drill, response, isAnswered, onSubmit, onNext, step, typeTotal, nextType,
}: {
  drill: DrillRow;
  response: ResponseRow | null;
  isAnswered: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onNext: () => void;
  step: number;
  typeTotal: number;
  nextType: string | null;
}) {
  const p = drill.payload as { sentenceTemplate: string; answer: string; distractors: string[]; sentenceKo?: string };
  const isCorrect = response?.is_correct;
  const [submitting, setSubmitting] = useState(false);
  return (
    <>
      <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-800">
        {p.sentenceTemplate}
      </div>
      {p.sentenceKo && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs leading-relaxed text-blue-700">
          <span className="font-semibold">힌트 · </span>{p.sentenceKo}
        </div>
      )}
      {!isAnswered ? (
        <form onSubmit={async (e) => { setSubmitting(true); await onSubmit(e); setSubmitting(false); }}>
          <input type="hidden" name="drill_type" value="fill_blank" />
          <input type="hidden" name="answer"     value={p.answer} />
          <input
            name="response_text"
            placeholder="빈칸에 들어갈 단어를 입력하세요."
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? '채점 중...' : '제출'}
          </button>
        </form>
      ) : (
        <>
          <div className={[
            'rounded-xl border p-3 text-sm',
            isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900',
          ].join(' ')}>
            <span className="text-xs font-medium block mb-1">{isCorrect ? '✓ 정답' : '✗ 오답'}</span>
            내 답: {response?.response_text}
          </div>
          {!isCorrect && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <span className="text-xs font-medium text-emerald-600 block mb-1">정답</span>
              {p.answer}
            </div>
          )}
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            {step + 1 >= typeTotal
              ? nextType ? `다음 블록: ${DRILL_LABEL[nextType]} →` : '결과 보기 →'
              : '다음 →'}
          </button>
        </>
      )}
    </>
  );
}

function WritingDrill({
  drill, response, isAnswered, onSubmit,
}: {
  drill: DrillRow;
  response: ResponseRow | null;
  isAnswered: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const p = drill.payload as { koPrompt: string; answerEn: string; wordCount?: number; hintWords?: string[]; grammarHints?: string[] };
  const [submitting, setSubmitting] = useState(false);
  return (
    <>
      <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-700">
        {p.koPrompt}
      </div>
      {!isAnswered && (
        <WritingHintReveal
          answerEn={p.answerEn}
          hintWords={p.hintWords ?? []}
          grammarHints={p.grammarHints ?? []}
          wordCount={p.wordCount}
        />
      )}
      {!isAnswered ? (
        <form onSubmit={async (e) => { setSubmitting(true); await onSubmit(e); setSubmitting(false); }}>
          <input type="hidden" name="drill_type" value="writing" />
          <input type="hidden" name="prompt_ko"  value={p.koPrompt} />
          <input type="hidden" name="answer_en"  value={p.answerEn} />
          <textarea
            name="response_text"
            rows={3}
            placeholder="영어로 작문하세요."
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? '제출 중...' : '제출'}
          </button>
        </form>
      ) : (
        <>
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-800">
            <span className="text-xs font-medium text-neutral-400 block mb-1">내 답</span>
            {response?.response_text ?? '(없음)'}
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <span className="text-xs font-medium text-emerald-600 block mb-1">모범 답안</span>
            {p.answerEn}
          </div>
          <ScoreBadge scorePct={response?.score_pct ?? null} isCorrect={response?.is_correct ?? null} />
          {response?.feedback_text && (
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-600 leading-relaxed">
              {response.feedback_text}
            </div>
          )}
        </>
      )}
    </>
  );
}

function VocabDrill({
  drill, response, isAnswered, onSubmit,
}: {
  drill: DrillRow;
  response: ResponseRow | null;
  isAnswered: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  const p = drill.payload as { word: string; meaningKo: string; exampleSentence?: string };
  const isCorrect = response?.is_correct;
  const [submitting, setSubmitting] = useState(false);
  return (
    <>
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-neutral-900 px-6 py-8 text-center">
        <span className="text-xs font-medium uppercase tracking-widest text-neutral-400">단어</span>
        <span className="text-3xl font-bold text-white">{p.word}</span>
      </div>
      {p.exampleSentence && (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-2.5 text-xs text-neutral-500 leading-relaxed">
          <span className="font-medium text-neutral-400">예문 · </span>{p.exampleSentence}
        </div>
      )}
      {!isAnswered ? (
        <form onSubmit={async (e) => { setSubmitting(true); await onSubmit(e); setSubmitting(false); }}>
          <input type="hidden" name="drill_type" value="vocab" />
          <input type="hidden" name="answer_ko"  value={p.meaningKo} />
          <input
            name="response_text"
            placeholder="한국어 뜻을 입력하세요."
            autoComplete="off"
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? '채점 중...' : '제출'}
          </button>
        </form>
      ) : (
        <>
          <div className={[
            'rounded-xl border p-3 text-sm',
            isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900',
          ].join(' ')}>
            <span className="text-xs font-medium block mb-1">{isCorrect ? '✓ 정답' : '✗ 오답'} · 내 답</span>
            {response?.response_text}
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <span className="text-xs font-medium text-emerald-600 block mb-1">정답</span>
            {p.meaningKo}
          </div>
          <ScoreBadge scorePct={response?.score_pct ?? null} isCorrect={response?.is_correct ?? null} />
        </>
      )}
    </>
  );
}

function GrammarChoiceDrill({
  drill, response, isAnswered, onSubmit, onNext, step, typeTotal, nextType,
}: {
  drill: DrillRow;
  response: ResponseRow | null;
  isAnswered: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onNext: () => void;
  step: number;
  typeTotal: number;
  nextType: string | null;
}) {
  const p = drill.payload as {
    sentenceTemplate: string;
    optionA: string;
    optionB: string;
    optionC?: string;
    optionD?: string;
    correct: 'a' | 'b' | 'c' | 'd';
    explanation?: string;
    grammarCategory?: string;
    contextBefore?: string;
  };
  const options = [
    { key: 'a' as const, label: 'A', value: p.optionA },
    { key: 'b' as const, label: 'B', value: p.optionB },
    ...(p.optionC ? [{ key: 'c' as const, label: 'C', value: p.optionC }] : []),
    ...(p.optionD ? [{ key: 'd' as const, label: 'D', value: p.optionD }] : []),
  ];
  const correctValue = options.find((o) => o.key === p.correct)?.value ?? '';
  const isCorrect    = response?.is_correct;
  const [submitting, setSubmitting] = useState(false);
  return (
    <>
      {p.grammarCategory && (
        <span className="inline-flex items-center rounded-full bg-violet-100 px-3 py-0.5 text-xs font-semibold text-violet-700">
          {p.grammarCategory}
        </span>
      )}
      {p.contextBefore && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm italic text-neutral-500 leading-relaxed">
          {p.contextBefore}
        </div>
      )}
      <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-800 font-medium">
        {p.sentenceTemplate}
      </div>
      {!isAnswered ? (
        <form onSubmit={async (e) => { setSubmitting(true); await onSubmit(e); setSubmitting(false); }}>
          <input type="hidden" name="drill_type"     value="grammar_choice" />
          <input type="hidden" name="correct_option" value={p.correct} />
          <div className={`grid gap-2 ${options.length >= 3 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {options.map((opt) => (
              <label
                key={opt.key}
                className="flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              >
                <input type="radio" name="response_choice" value={opt.key} className="accent-neutral-900 shrink-0" required />
                <span className="font-bold text-neutral-400 shrink-0">{opt.label}</span>
                <span className="text-neutral-800">{opt.value}</span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? '채점 중...' : '제출'}
          </button>
        </form>
      ) : (
        <>
          <div className={[
            'rounded-xl border p-3 text-sm font-semibold',
            isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700',
          ].join(' ')}>
            {isCorrect ? `✓ 정답 — ${correctValue}` : `✗ 오답 — 정답: ${correctValue}`}
          </div>
          {p.explanation && (
            <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-2.5 text-xs text-violet-800 leading-relaxed">
              <span className="font-semibold">해설 · </span>{p.explanation}
            </div>
          )}
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            {step + 1 >= typeTotal
              ? nextType ? `다음 블록: ${DRILL_LABEL[nextType]} →` : '결과 보기 →'
              : '다음 →'}
          </button>
        </>
      )}
    </>
  );
}

function ArrangeDrill({
  drill, direction, response, isAnswered, onSubmit, onNext, step, typeTotal, nextType,
}: {
  drill: DrillRow;
  direction: 'translation' | 'writing';
  response: ResponseRow | null;
  isAnswered: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onNext: () => void;
  step: number;
  typeTotal: number;
  nextType: string | null;
}) {
  const p = drill.payload as {
    sentenceEn?: string;
    koPrompt?: string;
    chunks: Array<{ id: string; ko?: string; en?: string }>;
  };
  const correctChunks = p.chunks;
  const getText = (c: { ko?: string; en?: string }) => (direction === 'translation' ? c.ko ?? '' : c.en ?? '');
  const source = direction === 'translation' ? p.sentenceEn ?? '' : p.koPrompt ?? '';

  const shuffled = useMemo(() => {
    const arr = [...correctChunks];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [drill.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [assembled, setAssembled] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const pool = shuffled.filter((c) => !assembled.includes(c.id));
  const isComplete = assembled.length === correctChunks.length;
  const correctOrderJson = JSON.stringify(correctChunks.map((c) => c.id));
  const isCorrect = response?.is_correct;

  return (
    <>
      <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-800">
        {source}
      </div>
      {!isAnswered ? (
        <form onSubmit={async (e) => { setSubmitting(true); await onSubmit(e); setSubmitting(false); }}>
          <input type="hidden" name="drill_type" value={direction === 'translation' ? 'translation_arrange' : 'writing_arrange'} />
          <input type="hidden" name="correct_order" value={correctOrderJson} />
          <input type="hidden" name="response_choice" value={JSON.stringify(assembled)} />

          <div className="min-h-[3rem] rounded-xl border-2 border-dashed border-neutral-200 p-3 flex flex-wrap gap-2">
            {assembled.length === 0 && (
              <span className="text-xs text-neutral-300">조각을 순서대로 클릭하세요</span>
            )}
            {assembled.map((id, i) => {
              const chunk = correctChunks.find((c) => c.id === id)!;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAssembled((prev) => prev.filter((x) => x !== id))}
                  className="rounded-lg border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-sm text-white"
                >
                  {i + 1}. {getText(chunk)}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {pool.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setAssembled((prev) => [...prev, c.id])}
                className="rounded-lg border bg-white px-3 py-1.5 text-sm text-neutral-700 hover:border-neutral-400 hover:bg-neutral-50"
              >
                {getText(c)}
              </button>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            {assembled.length > 0 && (
              <button
                type="button"
                onClick={() => setAssembled([])}
                className="rounded-xl border px-4 py-2.5 text-sm font-medium text-neutral-500 hover:bg-neutral-50"
              >
                다시 담기
              </button>
            )}
            <button
              type="submit"
              disabled={!isComplete || submitting}
              className="flex-1 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
            >
              {submitting ? '채점 중...' : '제출'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className={[
            'rounded-xl border p-3 text-sm',
            isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900',
          ].join(' ')}>
            <span className="text-xs font-medium block mb-1">{isCorrect ? '✓ 정답' : '✗ 오답'}</span>
            {correctChunks.map((c, i) => (
              <span key={c.id}>{i > 0 && ' '}{getText(c)}</span>
            ))}
          </div>
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            {step + 1 >= typeTotal
              ? nextType ? `다음 블록: ${DRILL_LABEL[nextType]} →` : '결과 보기 →'
              : '다음 →'}
          </button>
        </>
      )}
    </>
  );
}

function TranslationChoiceDrill({
  drill, response, isAnswered, onSubmit, onNext, step, typeTotal, nextType,
}: {
  drill: DrillRow;
  response: ResponseRow | null;
  isAnswered: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onNext: () => void;
  step: number;
  typeTotal: number;
  nextType: string | null;
}) {
  const p = drill.payload as {
    sentenceEn: string;
    options: Array<{ key: 'a' | 'b' | 'c'; text: string }>;
    correct: 'a' | 'b' | 'c';
    explanation?: string;
  };
  const correctOption = p.options.find((o) => o.key === p.correct)?.text ?? '';
  const isCorrect = response?.is_correct;
  const [submitting, setSubmitting] = useState(false);

  return (
    <>
      <div className="rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-neutral-800 font-medium">
        {p.sentenceEn}
      </div>
      {!isAnswered ? (
        <form onSubmit={async (e) => { setSubmitting(true); await onSubmit(e); setSubmitting(false); }}>
          <input type="hidden" name="drill_type" value="translation_choice" />
          <input type="hidden" name="correct_option" value={p.correct} />
          <div className="grid grid-cols-1 gap-2">
            {p.options.map((opt) => (
              <label
                key={opt.key}
                className="flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
              >
                <input type="radio" name="response_choice" value={opt.key} className="accent-neutral-900 shrink-0" required />
                <span className="font-bold text-neutral-400 shrink-0">{opt.key.toUpperCase()}</span>
                <span className="text-neutral-800">{opt.text}</span>
              </label>
            ))}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-3 w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? '채점 중...' : '제출'}
          </button>
        </form>
      ) : (
        <>
          <div className={[
            'rounded-xl border p-3 text-sm font-semibold',
            isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700',
          ].join(' ')}>
            {isCorrect ? `✓ 정답 — ${correctOption}` : `✗ 오답 — 정답: ${correctOption}`}
          </div>
          {p.explanation && (
            <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-xs text-sky-800 leading-relaxed">
              <span className="font-semibold">해설 · </span>{p.explanation}
            </div>
          )}
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            {step + 1 >= typeTotal
              ? nextType ? `다음 블록: ${DRILL_LABEL[nextType]} →` : '결과 보기 →'
              : '다음 →'}
          </button>
        </>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────
// 작문 지문 누적 표시
// ─────────────────────────────────────────────────────────

function scoreRing(scorePct: number | null, isCorrect: boolean | null) {
  if (isCorrect === null) return 'bg-neutral-200';
  if (scorePct === null)  return isCorrect ? 'bg-emerald-500' : 'bg-red-500';
  if (scorePct >= 80)     return 'bg-emerald-500';
  if (scorePct >= 70)     return 'bg-emerald-400';
  if (scorePct >= 50)     return 'bg-amber-400';
  return 'bg-red-500';
}

function missingWords(model: string, student: string): Set<string> {
  const sw = new Set(
    student.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter((w) => w.length >= 3),
  );
  return new Set(
    model.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/)
      .filter((w) => w.length >= 3 && !sw.has(w)),
  );
}

function tokenize(model: string, student: string | null) {
  const missing = student ? missingWords(model, student) : new Set<string>();
  return model.split(/(\s+)/).map((tok) => ({
    tok,
    wrong: missing.has(tok.toLowerCase().replace(/[^a-z]/g, '')),
  }));
}

function PassageProgress({
  writingDrills,
  writingResponseMap,
  currentDrillId,
}: {
  writingDrills: Array<{ id: string; order_index: number; payload: { answerEn: string; koPrompt: string } }>;
  writingResponseMap: Map<string, { response_text: string | null; is_correct: boolean | null; score_pct: number | null }>;
  currentDrillId: string | null;
}) {
  const answered = writingDrills.filter((d) => writingResponseMap.has(d.id));
  if (answered.length === 0) return null;

  return (
    <details className="group" open={false}>
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-2xl border bg-white px-4 py-3 hover:bg-neutral-50 select-none">
        <span className="text-xs font-semibold text-neutral-700">작문 진행 현황</span>
        <span className="text-xs text-neutral-400">
          {answered.length} / {writingDrills.length} 문장 완료 · 펼쳐보기 ▾
        </span>
      </summary>
      <div className="mt-2 rounded-2xl border bg-white divide-y overflow-hidden">
        {writingDrills.map((d, i) => {
          const res       = writingResponseMap.get(d.id) ?? null;
          const isCurrent = d.id === currentDrillId;
          const tokens    = res ? tokenize(d.payload.answerEn, res.response_text) : null;
          const ring      = scoreRing(res?.score_pct ?? null, res?.is_correct ?? null);
          return (
            <div key={d.id} className={`flex items-start gap-3 px-4 py-3 ${isCurrent ? 'bg-neutral-50' : ''}`}>
              <div className="flex items-center gap-1.5 pt-0.5 shrink-0">
                <span className="text-xs text-neutral-400 w-4 text-right">{i + 1}</span>
                <span className={`h-2 w-2 rounded-full shrink-0 ${ring}`} />
              </div>
              <p className="text-sm leading-relaxed text-neutral-700 flex-1">
                {isCurrent && !res ? (
                  <span className="text-neutral-300 italic">작성 중...</span>
                ) : tokens ? (
                  tokens.map(({ tok, wrong }, j) =>
                    wrong
                      ? <strong key={j} className="font-bold text-red-500">{tok}</strong>
                      : <span key={j}>{tok}</span>
                  )
                ) : (
                  <span className="text-neutral-300 italic">미제출</span>
                )}
              </p>
              {res?.score_pct !== null && res?.score_pct !== undefined && (
                <span className={`shrink-0 text-xs font-semibold ${(res.score_pct ?? 0) >= 70 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {res.score_pct}점
                </span>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}
