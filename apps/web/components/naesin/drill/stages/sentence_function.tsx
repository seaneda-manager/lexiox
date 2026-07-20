'use client';

import { useMemo, useState } from 'react';
import type {
  NaesinSentenceFunctionStage,
  SentenceFunctionChoice,
  SentenceFunctionStageSubmit,
} from '../types';
import {
  SENTENCE_FUNCTION_CHOICES,
  SENTENCE_FUNCTION_LABEL,
} from '../types';

type Props = {
  stage: NaesinSentenceFunctionStage;
  onBack?: () => void;
  onNext?: (payload: SentenceFunctionStageSubmit) => void;
  initialAnswers?: Record<string, SentenceFunctionChoice>;
};

const CHOICE_HELPER: Record<SentenceFunctionChoice, string> = {
  topic_sentence: '문단의 중심 생각을 제시하는 문장',
  supporting_detail: '주장/주제문을 뒷받침하는 설명',
  example: '예시, 사례, 구체적 illustration',
  transition: '앞뒤 내용을 이어 주는 연결 역할',
  contrast: '대조, 반전, however 류의 기능',
  conclusion: '정리, 요약, 결론 역할',
};

export default function SentenceFunctionStage({
  stage,
  onBack,
  onNext,
  initialAnswers,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, SentenceFunctionChoice>>(
    initialAnswers ?? {}
  );
  const [revealed, setRevealed] = useState(false);

  const items = stage.items ?? [];

  const answeredCount = useMemo(() => {
    return items.filter((item) => !!answers[item.id]).length;
  }, [items, answers]);

  const allAnswered = items.length > 0 && answeredCount === items.length;

  const score = useMemo(() => {
    let correct = 0;
    for (const item of items) {
      if (answers[item.id] === item.answer) {
        correct += 1;
      }
    }
    return {
      correct,
      total: items.length,
    };
  }, [items, answers]);

  function handlePick(itemId: string, value: SentenceFunctionChoice) {
    setAnswers((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  }

  function handleReset() {
    setAnswers({});
    setRevealed(false);
  }

  function handleCheckOrNext() {
    if (!allAnswered) return;

    if (!revealed) {
      setRevealed(true);
      return;
    }

    onNext?.({
      answers,
      correctCount: score.correct,
      totalCount: score.total,
    });
  }

  function getChoiceClass(
    itemId: string,
    choice: SentenceFunctionChoice,
    correct: SentenceFunctionChoice
  ) {
    const selected = answers[itemId] === choice;

    if (!revealed) {
      return selected
        ? 'border-sky-500 bg-sky-50 text-sky-900'
        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50';
    }

    if (choice === correct) {
      return 'border-emerald-500 bg-emerald-50 text-emerald-900';
    }

    if (selected && choice !== correct) {
      return 'border-rose-500 bg-rose-50 text-rose-900';
    }

    return 'border-slate-200 bg-white text-slate-500';
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 md:px-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Stage 5
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {stage.title ?? '문장 기능'}
            </h2>
            <p className="text-sm leading-6 text-slate-600">
              {stage.instructions ??
                '각 문장이 문단 안에서 어떤 역할을 하는지 고르세요. 주제문 / 뒷받침 / 예시 / 연결 / 대조 / 결론 중 가장 알맞은 것을 선택하면 됩니다.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <div>
              진행도 <span className="font-semibold">{answeredCount}</span> /{' '}
              <span className="font-semibold">{items.length}</span>
            </div>
            {revealed ? (
              <div className="mt-1">
                점수 <span className="font-semibold">{score.correct}</span> /{' '}
                <span className="font-semibold">{score.total}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SENTENCE_FUNCTION_CHOICES.map((choice) => (
          <div
            key={choice}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-sm font-semibold text-slate-900">
              {SENTENCE_FUNCTION_LABEL[choice]}
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-500">
              {CHOICE_HELPER[choice]}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {items.map((item, index) => {
          const userAnswer = answers[item.id];
          const isCorrect = revealed && userAnswer === item.answer;

          return (
            <section
              key={item.id}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  문장 {index + 1}
                </span>
                {revealed ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isCorrect
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isCorrect ? '정답' : '오답'}
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-base font-medium leading-7 text-slate-900">
                  {item.sentence}
                </p>
                {item.translation_ko ? (
                  <p className="text-sm leading-6 text-slate-500">
                    {item.translation_ko}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(item.choices?.length ? item.choices : SENTENCE_FUNCTION_CHOICES).map(
                  (choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => handlePick(item.id, choice)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${getChoiceClass(
                        item.id,
                        choice,
                        item.answer
                      )}`}
                    >
                      <div>{SENTENCE_FUNCTION_LABEL[choice]}</div>
                      <div className="mt-1 text-xs font-normal opacity-80">
                        {CHOICE_HELPER[choice]}
                      </div>
                    </button>
                  )
                )}
              </div>

              {revealed ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm">
                    <span className="font-semibold text-slate-900">정답:</span>{' '}
                    <span className="text-slate-700">
                      {SENTENCE_FUNCTION_LABEL[item.answer]}
                    </span>
                  </div>
                  {item.explanation ? (
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.explanation}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-600">
          {!revealed
            ? '모든 문장을 분류한 뒤 채점하기를 누르세요.'
            : '채점이 끝났습니다. 다음 단계로 넘어가면 됩니다.'}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            이전 단계
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            선택 초기화
          </button>

          <button
            type="button"
            onClick={handleCheckOrNext}
            disabled={!allAnswered}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white transition ${
              allAnswered
                ? 'bg-slate-900 hover:bg-slate-800'
                : 'cursor-not-allowed bg-slate-300'
            }`}
          >
            {revealed ? '다음 단계' : '채점하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
