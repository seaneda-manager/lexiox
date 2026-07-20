"use client";

import {
  SENTENCE_FUNCTION_LABEL,
  SENTENCE_FUNCTION_TYPES,
  type SentenceFunctionAnswer,
  type SentenceFunctionLog,
  type SentenceFunctionType,
} from "@/components/naesin/drill/types";

type Props = {
  sentenceText: string;
  answer: SentenceFunctionAnswer | null;
  currentSentenceIndex: number;
  totalSentences: number;
  log: SentenceFunctionLog;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onPatchLog: (patch: Partial<SentenceFunctionLog>) => void;
};

const FUNCTION_HINT: Record<SentenceFunctionType, string> = {
  scene_setting: "인물, 장소, 시간, 상황을 깔아 주는 장면 도입",
  topic_sentence: "문단의 중심 생각이나 핵심 대상을 처음 제시",
  supporting_detail: "주제문을 설명하거나 뒷받침하는 정보",
  example: "for example 같은 구체 사례 제시",
  transition: "앞뒤 흐름을 이어 주는 연결 장치",
  contrast: "however, but 류의 대조/반전",
  conclusion: "마지막 정리, 요약, 결론",
};

function isAcceptedFunction(
  answer: SentenceFunctionAnswer | null,
  selectedType?: SentenceFunctionType,
) {
  if (!answer || !selectedType) return false;
  return [answer.correct, ...(answer.accepted ?? [])].includes(selectedType);
}

export default function Stage5SentenceFunction({
  sentenceText,
  answer,
  currentSentenceIndex,
  totalSentences,
  log,
  onPrevSentence,
  onNextSentence,
  onPatchLog,
}: Props) {
  const isFirstSentence = currentSentenceIndex === 0;
  const isLastSentence = currentSentenceIndex === totalSentences - 1;
  const canMoveNext = !isLastSentence;
  const statusLabel = log.revealedAnswer
    ? "정답 확인 완료"
    : log.completed
      ? "정답"
      : log.checked
        ? "다시 시도"
        : log.selectedType
          ? "채점 대기"
          : "선택 필요";

  function handleSelect(choice: SentenceFunctionType) {
    onPatchLog({
      selectedType: choice,
      checked: false,
      isCorrect: undefined,
      revealedAnswer: false,
      completed: false,
    });
  }

  function handleCheck() {
    if (!answer || !log.selectedType) return;

    const correct = isAcceptedFunction(answer, log.selectedType);

    onPatchLog({
      checked: true,
      isCorrect: correct,
      completed: correct,
    });
  }

  function handleRevealAnswer() {
    if (!answer) return;

    onPatchLog({
      checked: true,
      isCorrect: false,
      revealedAnswer: true,
      completed: true,
    });
  }

  function getChoiceClass(choice: SentenceFunctionType) {
    const isSelected = log.selectedType === choice;
    const isCorrectChoice = answer?.correct === choice;

    if (log.revealedAnswer) {
      if (isCorrectChoice) {
        return "border-emerald-300 bg-emerald-50 text-emerald-900";
      }
      if (isSelected) {
        return "border-rose-300 bg-rose-50 text-rose-900";
      }
      return "border-neutral-200 bg-white text-neutral-500";
    }

    if (log.checked && log.isCorrect && isSelected) {
      return "border-emerald-300 bg-emerald-50 text-emerald-900";
    }

    if (log.checked && log.isCorrect === false && isSelected) {
      return "border-rose-300 bg-rose-50 text-rose-900";
    }

    if (isSelected) {
      return "border-sky-300 bg-sky-50 text-sky-900";
    }

    return "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50";
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Stage 5
            </div>
            <h2 className="mt-1 text-xl font-semibold text-neutral-900">
              문장 기능
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              문장의 내용과 문단 내 위치를 보고 이 문장이 어떤 역할을 하는지 고르세요. 서술문 첫 문장처럼 장면을 여는 문장은 상황 제시로 보면 됩니다.
            </p>
          </div>

          <div className="rounded-xl border bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
            문장 {currentSentenceIndex + 1} / {totalSentences}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-neutral-900">현재 문장</div>
          <div
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              log.revealedAnswer
                ? "bg-amber-100 text-amber-800"
                : log.completed
                  ? "bg-emerald-100 text-emerald-800"
                  : log.checked
                    ? "bg-rose-100 text-rose-800"
                    : "bg-sky-100 text-sky-800",
            ].join(" ")}
          >
            {statusLabel}
          </div>
        </div>

        <div className="rounded-xl bg-neutral-50 px-4 py-4 text-[15px] leading-7 text-neutral-900">
          {sentenceText}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {SENTENCE_FUNCTION_TYPES.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => handleSelect(choice)}
              className={[
                "rounded-2xl border px-4 py-4 text-left transition",
                getChoiceClass(choice),
              ].join(" ")}
            >
              <div className="text-sm font-semibold">
                {SENTENCE_FUNCTION_LABEL[choice]}
              </div>
              <div className="mt-1 text-xs leading-5 opacity-80">
                {FUNCTION_HINT[choice]}
              </div>
            </button>
          ))}
        </div>

        {answer ? (
          <div className="mt-4 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-4">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
              힌트
            </div>
            <div className="mt-2 text-sm leading-6 text-neutral-700">
              {answer.clue ?? "문장의 위치, 연결어, 구체 예시 여부를 보고 판단하세요."}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            현재 문장에 sentenceFunctionAnswer 데이터가 없습니다.
          </div>
        )}

        {answer && (log.checked || log.completed || log.revealedAnswer) ? (
          <div className="mt-4 rounded-2xl border border-neutral-200 bg-white px-4 py-4">
            <div className="text-sm font-semibold text-neutral-900">
              정답: {SENTENCE_FUNCTION_LABEL[answer.correct]}
            </div>
            {answer.explanation ? (
              <div className="mt-2 text-sm leading-6 text-neutral-700">
                {answer.explanation}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrevSentence}
            disabled={isFirstSentence}
            className="rounded-xl border px-4 py-2 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전 문장
          </button>

          <button
            type="button"
            onClick={handleCheck}
            disabled={!answer || !log.selectedType || log.revealedAnswer || log.completed}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            채점
          </button>

          <button
            type="button"
            onClick={handleRevealAnswer}
            disabled={!answer || log.revealedAnswer}
            className="rounded-xl border px-4 py-2 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            정답 보기
          </button>

          <button
            type="button"
            onClick={onNextSentence}
            disabled={!canMoveNext}
            className="rounded-xl border px-4 py-2 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음 문장
          </button>
        </div>
      </div>
    </div>
  );
}
