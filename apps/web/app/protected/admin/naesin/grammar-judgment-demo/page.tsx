"use client";

import { useMemo, useState, type ReactNode } from "react";
import { MOCK_NAESIN_PASSAGE } from "@/components/naesin/drill/mock";
import {
  MOCK_GRAMMAR_TARGETS_DEMO,
  type PassageGrammarTarget,
} from "@/components/naesin/drill/mock_grammar_targets_demo";

type TargetResponse = {
  choiceId: string | null;
  selectedLabelIds: string[];
  selectedFactorIds: string[];
  selectedWrongReasonIds: string[];
  submitted: boolean;
};

function createEmptyResponse(): TargetResponse {
  return {
    choiceId: null,
    selectedLabelIds: [],
    selectedFactorIds: [],
    selectedWrongReasonIds: [],
    submitted: false,
  };
}

function arraysEqualAsSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const aSet = new Set(a);
  const bSet = new Set(b);
  if (aSet.size !== bSet.size) return false;
  for (const value of aSet) {
    if (!bSet.has(value)) return false;
  }
  return true;
}

function toggleId(list: string[], id: string, maxSelectable?: number) {
  const exists = list.includes(id);
  if (exists) return list.filter((value) => value !== id);

  if (typeof maxSelectable === "number" && maxSelectable > 0) {
    if (list.length >= maxSelectable) {
      return [...list.slice(1), id];
    }
  }

  return [...list, id];
}

function renderSentenceWithHighlight(
  sentenceText: string,
  target: PassageGrammarTarget | undefined,
  currentChoiceText?: string,
) {
  if (!target || !target.targetText || !sentenceText.includes(target.targetText)) {
    return <span>{sentenceText}</span>;
  }

  const parts = sentenceText.split(target.targetText);
  const slotText = currentChoiceText ?? `[${target.blankLabel}]`;

  return (
    <>
      {parts[0]}
      <span className="mx-1 inline-flex rounded-xl border border-sky-300 bg-sky-50 px-3 py-1.5 text-base font-semibold text-sky-700 shadow-sm">
        {slotText}
      </span>
      {parts.slice(1).join(target.targetText)}
    </>
  );
}

function replaceTargetText(
  sentenceText: string,
  target: PassageGrammarTarget,
  replacement: string,
) {
  if (!target.targetText || !sentenceText.includes(target.targetText)) {
    return sentenceText;
  }
  return sentenceText.replace(target.targetText, replacement);
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="text-sm font-semibold text-slate-800">{children}</div>;
}

function OptionButton({
  text,
  active,
  onClick,
  disabled = false,
}: {
  text: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        active
          ? "rounded-xl border border-sky-500 bg-sky-50 px-3 py-3 text-left text-sm font-medium text-sky-700"
          : "rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {text}
    </button>
  );
}

function ResultPill({
  label,
  correct,
}: {
  label: string;
  correct: boolean;
}) {
  return (
    <span
      className={
        correct
          ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700"
          : "rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700"
      }
    >
      {label}
    </span>
  );
}

function getTargetCheckState(target: PassageGrammarTarget, response: TargetResponse) {
  const correctChoice = response.choiceId === target.correctChoiceId;
  const correctLabels = arraysEqualAsSet(
    response.selectedLabelIds,
    target.correctLabelIds,
  );
  const correctFactors = arraysEqualAsSet(
    response.selectedFactorIds,
    target.correctFactorIds,
  );
  const correctWrongReasons = target.correctWrongReasonIds
    ? arraysEqualAsSet(
        response.selectedWrongReasonIds,
        target.correctWrongReasonIds,
      )
    : true;

  const isFullyAnswered =
    !!response.choiceId &&
    response.selectedLabelIds.length > 0 &&
    response.selectedFactorIds.length > 0 &&
    (!target.correctWrongReasonIds || response.selectedWrongReasonIds.length > 0);

  const isFullyCorrect =
    correctChoice && correctLabels && correctFactors && correctWrongReasons;

  return {
    correctChoice,
    correctLabels,
    correctFactors,
    correctWrongReasons,
    isFullyAnswered,
    isFullyCorrect,
  };
}

function CurrentTargetCard({
  target,
  response,
  onChange,
}: {
  target: PassageGrammarTarget;
  response: TargetResponse;
  onChange: (patch: Partial<TargetResponse>) => void;
}) {
  const currentChoiceText = response.choiceId
    ? target.choices.find((choice) => choice.id === response.choiceId)?.text
    : undefined;

  const {
    correctChoice,
    correctLabels,
    correctFactors,
    correctWrongReasons,
    isFullyAnswered,
    isFullyCorrect,
  } = getTargetCheckState(target, response);

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Current Target
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{target.blankLabel}</h2>
          <p className="text-sm leading-6 text-slate-600">{target.prompt}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {target.sentenceId}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-sky-100 bg-sky-50/70 px-5 py-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-600">
          현재 문장 슬롯
        </div>
        <p className="mt-2 text-lg font-medium leading-9 text-slate-900 md:text-[20px]">
          {renderSentenceWithHighlight(target.sentenceText, target, currentChoiceText)}
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <section className="space-y-2.5">
          <SectionTitle>1. 정답 선택</SectionTitle>
          <div className="grid gap-2 md:grid-cols-2">
            {target.choices.map((choice) => (
              <OptionButton
                key={choice.id}
                text={choice.text}
                active={response.choiceId === choice.id}
                onClick={() => onChange({ choiceId: choice.id, submitted: false })}
              />
            ))}
          </div>
        </section>

        <section className="space-y-2.5">
          <SectionTitle>2. 레이블 선택</SectionTitle>
          <div className="grid gap-2 md:grid-cols-2">
            {target.labelOptions.map((option) => (
              <OptionButton
                key={option.id}
                text={option.text}
                active={response.selectedLabelIds.includes(option.id)}
                onClick={() =>
                  onChange({
                    selectedLabelIds: toggleId(
                      response.selectedLabelIds,
                      option.id,
                      target.correctLabelIds.length,
                    ),
                    submitted: false,
                  })
                }
              />
            ))}
          </div>
        </section>

        <section className="space-y-2.5">
          <SectionTitle>3. 근거 선택</SectionTitle>
          <div className="grid gap-2">
            {target.factorOptions.map((option) => (
              <OptionButton
                key={option.id}
                text={option.text}
                active={response.selectedFactorIds.includes(option.id)}
                onClick={() =>
                  onChange({
                    selectedFactorIds: toggleId(
                      response.selectedFactorIds,
                      option.id,
                      target.correctFactorIds.length,
                    ),
                    submitted: false,
                  })
                }
              />
            ))}
          </div>
        </section>

        {target.wrongReasonOptions?.length ? (
          <section className="space-y-2.5">
            <SectionTitle>4. 오답 이유 선택</SectionTitle>
            <div className="grid gap-2">
              {target.wrongReasonOptions.map((option) => (
                <OptionButton
                  key={option.id}
                  text={option.text}
                  active={response.selectedWrongReasonIds.includes(option.id)}
                  onClick={() =>
                    onChange({
                      selectedWrongReasonIds: toggleId(
                        response.selectedWrongReasonIds,
                        option.id,
                        target.correctWrongReasonIds?.length,
                      ),
                      submitted: false,
                    })
                  }
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ submitted: true })}
          disabled={!isFullyAnswered}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          확인하기
        </button>
        <button
          type="button"
          onClick={() => onChange(createEmptyResponse())}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          초기화
        </button>
        {response.submitted ? (
          <ResultPill label={isFullyCorrect ? "문장 완료" : "재확인 필요"} correct={isFullyCorrect} />
        ) : null}
      </div>

      {response.submitted ? (
        <div className="mt-4 space-y-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <ResultPill label="정답" correct={correctChoice} />
            <ResultPill label="레이블" correct={correctLabels} />
            <ResultPill label="근거" correct={correctFactors} />
            {target.correctWrongReasonIds ? (
              <ResultPill label="오답 이유" correct={correctWrongReasons} />
            ) : null}
          </div>
          {target.explanation?.summary ? (
            <p className="text-sm leading-6 text-slate-700">{target.explanation.summary}</p>
          ) : null}
          {target.explanation?.koreanHint ? (
            <p className="text-xs text-slate-500">힌트: {target.explanation.koreanHint}</p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function AdminNaesinGrammarJudgmentDemoPage() {
  const [responses, setResponses] = useState<Record<string, TargetResponse>>(() =>
    Object.fromEntries(
      MOCK_GRAMMAR_TARGETS_DEMO.map((target) => [target.id, createEmptyResponse()]),
    ),
  );
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);

  const currentTarget = MOCK_GRAMMAR_TARGETS_DEMO[currentTargetIndex] ?? null;
  const currentResponse = currentTarget
    ? responses[currentTarget.id] ?? createEmptyResponse()
    : createEmptyResponse();

  const stats = useMemo(() => {
    const total = MOCK_GRAMMAR_TARGETS_DEMO.length;
    let completed = 0;
    const completedTargets: Array<{
      target: PassageGrammarTarget;
      response: TargetResponse;
      finalSentence: string;
    }> = [];

    for (const target of MOCK_GRAMMAR_TARGETS_DEMO) {
      const response = responses[target.id] ?? createEmptyResponse();
      const checkState = getTargetCheckState(target, response);
      if (response.submitted && checkState.isFullyCorrect) {
        completed += 1;
        const selectedChoiceText =
          target.choices.find((choice) => choice.id === response.choiceId)?.text ??
          target.targetText;
        completedTargets.push({
          target,
          response,
          finalSentence: replaceTargetText(
            target.sentenceText,
            target,
            selectedChoiceText,
          ),
        });
      }
    }

    return {
      total,
      completed,
      completedTargets,
    };
  }, [responses]);

  const currentCheckState = currentTarget
    ? getTargetCheckState(currentTarget, currentResponse)
    : null;

  const canGoNext = !!(
    currentTarget &&
    currentResponse.submitted &&
    currentCheckState?.isFullyCorrect
  );

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-8">
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Admin / Naesin / Grammar Judgment Demo
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Passage-based Grammar Judgment Demo
        </h1>
        <p className="max-w-4xl text-sm leading-6 text-slate-600">
          한 문장씩 풀고 다음으로 넘어가는 demo입니다. 완료된 문장은 오른쪽 Progress에 쌓이고,
          passage나 completed list에서 다시 클릭해 재진입할 수 있습니다.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <section className="space-y-5">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Passage Scan
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {MOCK_NAESIN_PASSAGE.title}
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {currentTargetIndex + 1} / {MOCK_GRAMMAR_TARGETS_DEMO.length}
              </span>
            </div>

            <div className="mt-5 space-y-5">
              {MOCK_NAESIN_PASSAGE.paragraphs.map((paragraph) => (
                <article key={paragraph.id} className="space-y-3 rounded-2xl bg-slate-50 p-4">
                  {paragraph.label ? (
                    <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {paragraph.label}
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    {paragraph.sentences.map((sentence) => {
                      const target = MOCK_GRAMMAR_TARGETS_DEMO.find(
                        (item) => item.sentenceId === sentence.id,
                      );
                      const response = target
                        ? responses[target.id] ?? createEmptyResponse()
                        : undefined;
                      const selectedChoiceText = target
                        ? target.choices.find((choice) => choice.id === response?.choiceId)?.text
                        : undefined;
                      const isCurrent = target?.id === currentTarget?.id;
                      const isCompleted = !!(
                        target &&
                        response?.submitted &&
                        getTargetCheckState(target, response).isFullyCorrect
                      );

                      const targetIndex = target
                        ? MOCK_GRAMMAR_TARGETS_DEMO.findIndex((item) => item.id === target.id)
                        : -1;

                      return target ? (
                        <button
                          key={sentence.id}
                          type="button"
                          onClick={() => setCurrentTargetIndex(targetIndex)}
                          className={
                            isCurrent
                              ? "w-full rounded-2xl border-2 border-sky-400 bg-white p-4 text-left shadow-sm"
                              : isCompleted
                                ? "w-full rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-left"
                                : "w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300 hover:bg-slate-50"
                          }
                        >
                          <p className="text-[17px] leading-8 text-slate-900 md:text-[19px]">
                            {renderSentenceWithHighlight(
                              sentence.text,
                              target,
                              isCompleted ? selectedChoiceText ?? target.targetText : isCurrent ? selectedChoiceText : undefined,
                            )}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
                            {isCurrent ? (
                              <span className="text-sky-700">현재 푸는 문장</span>
                            ) : null}
                            {isCompleted ? (
                              <span className="text-emerald-700">완료됨 · 클릭해서 다시 보기</span>
                            ) : !isCurrent ? (
                              <span className="text-slate-500">클릭해서 이동</span>
                            ) : null}
                          </div>
                        </button>
                      ) : (
                        <div
                          key={sentence.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <p className="text-[17px] leading-8 text-slate-900 md:text-[19px]">
                            {sentence.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </article>

          {currentTarget ? (
            <>
              <CurrentTargetCard
                target={currentTarget}
                response={currentResponse}
                onChange={(patch) =>
                  setResponses((prev) => ({
                    ...prev,
                    [currentTarget.id]: {
                      ...(prev[currentTarget.id] ?? createEmptyResponse()),
                      ...patch,
                    },
                  }))
                }
              />

              <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCurrentTargetIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentTargetIndex === 0}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  이전 문장
                </button>

                <div className="text-center text-sm text-slate-500">
                  {canGoNext
                    ? currentTargetIndex === MOCK_GRAMMAR_TARGETS_DEMO.length - 1
                      ? "마지막 문장까지 완료했어요."
                      : "문장 완료. 다음 문장으로 이동할 수 있어요."
                    : "현재 문장을 확인하고 완료하면 다음으로 이동할 수 있어요."}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentTargetIndex((prev) =>
                      Math.min(MOCK_GRAMMAR_TARGETS_DEMO.length - 1, prev + 1),
                    )
                  }
                  disabled={!canGoNext || currentTargetIndex === MOCK_GRAMMAR_TARGETS_DEMO.length - 1}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  다음 문장
                </button>
              </div>
            </>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Progress
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="text-xs text-slate-500">완성된 문장</div>
                <div className="mt-1 text-2xl font-semibold text-slate-900">
                  {stats.completed} / {stats.total}
                </div>
              </div>

              {currentTarget ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
                    현재 문장
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">
                    {currentTarget.blankLabel}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {renderSentenceWithHighlight(
                      currentTarget.sentenceText,
                      currentTarget,
                      currentResponse.choiceId
                        ? currentTarget.choices.find(
                            (choice) => choice.id === currentResponse.choiceId,
                          )?.text
                        : undefined,
                    )}
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Completed Sentences
            </div>
            <div className="mt-4 space-y-3">
              {stats.completedTargets.length > 0 ? (
                stats.completedTargets.map(({ target, finalSentence }, index) => {
                  const targetIndex = MOCK_GRAMMAR_TARGETS_DEMO.findIndex(
                    (item) => item.id === target.id,
                  );

                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setCurrentTargetIndex(targetIndex)}
                      className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                        완료 문장 {index + 1}
                      </div>
                      <div className="mt-1 text-xs text-emerald-700">
                        {target.blankLabel} · 클릭해서 다시 보기
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-800">{finalSentence}</p>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                  아직 완료된 문장이 없어요. 현재 문장을 끝내면 이곳에 하나씩 쌓입니다.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Demo Note
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>지금은 한 문장씩 완료하고 다음 문장으로 넘기는 흐름과, 완료 문장 재진입 흐름까지 함께 검증하는 데모입니다.</p>
              <p>다음 단계에서는 passage 안 inline 슬롯을 더 강하게 만들고, 문장 카드 영역을 더 슬림하게 줄이면 됩니다.</p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
