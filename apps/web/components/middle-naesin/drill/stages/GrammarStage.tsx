'use client';

import { useState } from 'react';
import {
  MIDDLE_GRAMMAR_STAGES,
  type MiddleGrammarPoint,
  type MiddleGrammarQuizItem,
  type MiddleGrammarStageId,
} from '@/components/middle-naesin/drill/types';
import SaveResultButton from '@/components/middle-naesin/drill/SaveResultButton';
import GrammarLessonFlow from '@/components/middle-naesin/drill/stages/GrammarLessonFlow';
import type { MiddleNaesinDrillDetailItem } from '@/lib/middle-naesin/drill-results';

type Props = {
  points: MiddleGrammarPoint[];
  unitId?: string;
};

const STAGE_LABEL: Record<MiddleGrammarStageId, string> = {
  drill: 'Drill',
  practice: 'Practice',
  test: 'Test',
};

export default function GrammarStage({ points, unitId }: Props) {
  if (points.length === 0) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center text-sm text-neutral-400">
        등록된 문법 포인트가 없습니다. 단원 에디터에서 문법 포인트를 추가해주세요.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {points.map((point) =>
        point.lesson ? (
          <GrammarLessonFlow
            key={point.id}
            pointId={point.id}
            title={point.title}
            lesson={point.lesson}
            unitId={unitId}
            isDraft={point.lesson.status !== 'final'}
          />
        ) : (
          <GrammarPointCard key={point.id} point={point} unitId={unitId} />
        ),
      )}
    </div>
  );
}

function GrammarPointCard({ point, unitId }: { point: MiddleGrammarPoint; unitId?: string }) {
  const [revealed, setRevealed] = useState(false);
  const [answers, setAnswers] = useState<Record<MiddleGrammarStageId, Record<number, number>>>({
    drill: {},
    practice: {},
    test: {},
  });

  // 문항이 없는 단계는 자동 통과로 간주해서 다음 단계로 바로 넘어가게 함
  const isPassed = (stage: MiddleGrammarStageId) => {
    const quiz = point.quiz[stage];
    if (quiz.length === 0) return true;
    const stageAnswers = answers[stage];
    return quiz.every((q, i) => stageAnswers[i] === q.answerIndex);
  };

  const isUnlocked = (stageIdx: number) => stageIdx === 0 || isPassed(MIDDLE_GRAMMAR_STAGES[stageIdx - 1]);

  const firstIncompleteIdx = MIDDLE_GRAMMAR_STAGES.findIndex((s) => !isPassed(s));
  const defaultTabIdx = firstIncompleteIdx === -1 ? MIDDLE_GRAMMAR_STAGES.length - 1 : firstIncompleteIdx;
  const [activeTabIdx, setActiveTabIdx] = useState(defaultTabIdx);
  const activeStage = MIDDLE_GRAMMAR_STAGES[activeTabIdx];

  const select = (stage: MiddleGrammarStageId, qIdx: number, choiceIdx: number) => {
    setAnswers((prev) => ({ ...prev, [stage]: { ...prev[stage], [qIdx]: choiceIdx } }));
  };

  const resetStage = (stage: MiddleGrammarStageId) => {
    setAnswers((prev) => ({ ...prev, [stage]: {} }));
  };

  const scoredStages = MIDDLE_GRAMMAR_STAGES.filter((s) => point.quiz[s].length > 0);
  const hasAnyQuiz = scoredStages.length > 0;
  const stagesPassedCount = scoredStages.filter((s) => isPassed(s)).length;

  const detail: MiddleNaesinDrillDetailItem[] = scoredStages.flatMap((stage) =>
    point.quiz[stage].map((q, qIdx) => {
      const selected = answers[stage][qIdx];
      const isCorrect = selected === q.answerIndex;
      return {
        prompt: `[${STAGE_LABEL[stage]}] ${q.prompt}`,
        yourAnswer: selected !== undefined ? q.choices[selected] : '(미응답)',
        correctAnswer: q.choices[q.answerIndex],
        isCorrect,
        explanation: q.explanation,
      };
    }),
  );

  return (
    <div className="rounded-2xl border bg-white p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-neutral-900">{point.title}</h3>
        {unitId && hasAnyQuiz && (
          <SaveResultButton
            unitId={unitId}
            drillType="grammar_point"
            refId={point.id}
            score={stagesPassedCount}
            total={scoredStages.length}
            detail={detail}
            label={`결과 저장 (${stagesPassedCount}/${scoredStages.length}단계)`}
          />
        )}
      </div>

      {point.explanationEn && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">
          {point.explanationEn}
        </p>
      )}

      {point.explanationKo && (
        <div>
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            {revealed ? '한글 설명 숨기기' : '한글 설명 보기'}
          </button>
          {revealed && (
            <p className="mt-2 whitespace-pre-wrap rounded-xl bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900">
              {point.explanationKo}
            </p>
          )}
        </div>
      )}

      {hasAnyQuiz && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex gap-2 rounded-xl border bg-neutral-50 p-1">
            {MIDDLE_GRAMMAR_STAGES.map((stage, idx) => {
              const unlocked = isUnlocked(idx);
              const passed = isPassed(stage);
              const count = point.quiz[stage].length;

              return (
                <button
                  key={stage}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => setActiveTabIdx(idx)}
                  className={[
                    'flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition',
                    activeTabIdx === idx
                      ? 'bg-neutral-900 text-white'
                      : unlocked
                        ? 'text-neutral-600 hover:bg-neutral-100'
                        : 'text-neutral-300 cursor-not-allowed',
                  ].join(' ')}
                >
                  {!unlocked ? '🔒 ' : passed ? '✓ ' : ''}{STAGE_LABEL[stage]}
                  {count > 0 ? ` (${count})` : ''}
                </button>
              );
            })}
          </div>

          <GrammarQuizBlock
            stage={activeStage}
            quiz={point.quiz[activeStage]}
            answers={answers[activeStage]}
            onSelect={(qIdx, cIdx) => select(activeStage, qIdx, cIdx)}
            onReset={() => resetStage(activeStage)}
            passed={isPassed(activeStage)}
          />
        </div>
      )}
    </div>
  );
}

function GrammarQuizBlock({
  stage,
  quiz,
  answers,
  onSelect,
  onReset,
  passed,
}: {
  stage: MiddleGrammarStageId;
  quiz: MiddleGrammarQuizItem[];
  answers: Record<number, number>;
  onSelect: (qIdx: number, choiceIdx: number) => void;
  onReset: () => void;
  passed: boolean;
}) {
  if (quiz.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-neutral-50 p-6 text-center text-sm text-neutral-400">
        {STAGE_LABEL[stage]} 문제가 아직 없습니다.
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-500">
          {answeredCount}/{quiz.length}개 응답
        </span>
        {answeredCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border px-3 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            다시 풀기
          </button>
        )}
      </div>

      {quiz.map((q, qIdx) => {
        const selected = answers[qIdx];
        const isChecked = selected !== undefined;

        return (
          <div key={qIdx} className="space-y-2 rounded-xl border bg-neutral-50 p-4">
            <p className="text-sm font-medium text-neutral-800">
              {qIdx + 1}. {q.prompt}
            </p>
            <div className="flex flex-wrap gap-2">
              {q.choices.map((choice, cIdx) => {
                const isSelected = selected === cIdx;
                const isCorrectChoice = cIdx === q.answerIndex;
                const showState = isChecked && (isSelected || isCorrectChoice);

                return (
                  <button
                    key={cIdx}
                    type="button"
                    onClick={() => onSelect(qIdx, cIdx)}
                    className={[
                      'rounded-full border px-3 py-1.5 text-sm transition',
                      showState
                        ? isCorrectChoice
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-rose-300 bg-rose-50 text-rose-700'
                        : 'bg-white text-neutral-700 hover:bg-neutral-100',
                    ].join(' ')}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
            {isChecked && (
              <>
                <p className={['text-xs font-semibold', selected === q.answerIndex ? 'text-emerald-600' : 'text-rose-600'].join(' ')}>
                  {selected === q.answerIndex ? '✓ 정답' : `✗ 오답 · 정답: ${q.choices[q.answerIndex]}`}
                </p>
                {q.explanation && (
                  <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-800">
                    💡 {q.explanation}
                  </p>
                )}
              </>
            )}
          </div>
        );
      })}

      {passed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          ✓ {STAGE_LABEL[stage]} 통과! {stage !== 'test' ? '다음 단계로 넘어가세요.' : '문법 포인트를 완료했습니다.'}
        </div>
      )}
    </div>
  );
}
