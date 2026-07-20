"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { NaesinPassage } from "@/components/naesin/drill/types";
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

  if (typeof maxSelectable === "number" && maxSelectable > 0 && list.length >= maxSelectable) {
    return [...list.slice(1), id];
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
      <span className="mx-1 inline-flex rounded-xl border border-violet-300 bg-violet-50 px-3 py-1.5 text-base font-semibold text-violet-700 shadow-sm">
        {slotText}
      </span>
      {parts.slice(1).join(target.targetText)}
    </>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="text-sm font-semibold text-slate-800">{children}</div>;
}

function OptionButton({
  text,
  active,
  onClick,
}: {
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-xl border border-violet-500 bg-violet-50 px-3 py-3 text-left text-sm font-medium text-violet-700"
          : "rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50"
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
  const correctLabels = arraysEqualAsSet(response.selectedLabelIds, target.correctLabelIds);
  const correctFactors = arraysEqualAsSet(response.selectedFactorIds, target.correctFactorIds);
  const correctWrongReasons = target.correctWrongReasonIds
    ? arraysEqualAsSet(response.selectedWrongReasonIds, target.correctWrongReasonIds)
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
  onSubmit,
  onNext,
  canMoveNext,
  isLast,
}: {
  target: PassageGrammarTarget;
  response: TargetResponse;
  onChange: (patch: Partial<TargetResponse>) => void;
  onSubmit: () => void;
  onNext: () => void;
  canMoveNext: boolean;
  isLast: boolean;
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
            Stage 7 · Grammar Judgment
          </div>
          <h2 className="text-lg font-semibold text-slate-900">{target.blankLabel}</h2>
          <p className="text-sm leading-6 text-slate-600">{target.prompt}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {target.sentenceId}
        </span>
      </div>

      <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/70 px-5 py-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-600">
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
          onClick={onSubmit}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          확인하기
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={!canMoveNext}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLast ? "마지막 문장" : "다음 문장"}
        </button>
      </div>

      {response.submitted ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <ResultPill label="정답 선택" correct={correctChoice} />
            <ResultPill label="레이블" correct={correctLabels} />
            <ResultPill label="근거" correct={correctFactors} />
            {target.correctWrongReasonIds ? (
              <ResultPill label="오답 이유" correct={correctWrongReasons} />
            ) : null}
            <ResultPill label="전체" correct={isFullyCorrect} />
          </div>

          <div className="mt-3 text-sm leading-6 text-slate-600">
            {target.explanation?.summary ?? "해설 요약이 아직 없습니다."}
          </div>
          {target.explanation?.koreanHint ? (
            <div className="mt-1 text-sm font-medium text-violet-700">
              힌트: {target.explanation.koreanHint}
            </div>
          ) : null}
          {!isFullyAnswered ? (
            <div className="mt-2 text-sm font-medium text-amber-700">
              아직 선택하지 않은 항목이 있습니다.
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function Stage7GrammarJudgment({
  passage,
  targets = MOCK_GRAMMAR_TARGETS_DEMO,
}: {
  passage: NaesinPassage;
  targets?: PassageGrammarTarget[];
}) {
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, TargetResponse>>({});

  const targetMap = useMemo(
    () => new Map(targets.map((target) => [target.id, target])),
    [targets],
  );

  const targetBySentenceId = useMemo(() => {
    const map = new Map<string, PassageGrammarTarget>();
    targets.forEach((target) => {
      map.set(target.sentenceId, target);
    });
    return map;
  }, [targets]);

  const currentTarget = targets[currentTargetIndex] ?? targets[0];
  const currentResponse = responses[currentTarget.id] ?? createEmptyResponse();
  const currentChoiceText = currentResponse.choiceId
    ? currentTarget.choices.find((choice) => choice.id === currentResponse.choiceId)?.text
    : undefined;

  const completedTargetIds = useMemo(() => {
    return targets
      .filter((target) => responses[target.id]?.submitted)
      .map((target) => target.id);
  }, [responses, targets]);

  const currentCheckState = getTargetCheckState(currentTarget, currentResponse);
  const canMoveNext = currentResponse.submitted && currentTargetIndex < targets.length - 1;

  function patchCurrentResponse(patch: Partial<TargetResponse>) {
    setResponses((prev) => ({
      ...prev,
      [currentTarget.id]: {
        ...(prev[currentTarget.id] ?? createEmptyResponse()),
        ...patch,
      },
    }));
  }

  function submitCurrent() {
    patchCurrentResponse({ submitted: true });
  }

  function moveToNext() {
    if (currentTargetIndex >= targets.length - 1) return;
    if (!currentResponse.submitted) return;
    setCurrentTargetIndex((prev) => Math.min(prev + 1, targets.length - 1));
  }

  function moveToTarget(targetId: string) {
    const nextIndex = targets.findIndex((target) => target.id === targetId);
    if (nextIndex >= 0) setCurrentTargetIndex(nextIndex);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <div className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Passage Scan
              </div>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">지문 기반 문법 판단</h2>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
              {currentTargetIndex + 1} / {targets.length}
            </div>
          </div>

          <div className="mt-5 space-y-5">
            {passage.paragraphs.map((paragraph) => (
              <section key={paragraph.id} className="space-y-2.5">
                {paragraph.label ? (
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {paragraph.label}
                  </div>
                ) : null}
                <div className="space-y-2.5">
                  {paragraph.sentences.map((sentence) => {
                    const target = targetBySentenceId.get(sentence.id);
                    const response = target ? responses[target.id] ?? createEmptyResponse() : null;
                    const isCurrent = target?.id === currentTarget.id;
                    const isCompleted = target ? completedTargetIds.includes(target.id) : false;
                    const choiceText = response?.choiceId
                      ? target?.choices.find((choice) => choice.id === response.choiceId)?.text
                      : undefined;

                    return (
                      <button
                        key={sentence.id}
                        type="button"
                        onClick={() => (target ? moveToTarget(target.id) : undefined)}
                        disabled={!target}
                        className={
                          isCurrent
                            ? "block w-full rounded-2xl border border-violet-300 bg-violet-50 px-4 py-4 text-left shadow-sm"
                            : isCompleted
                              ? "block w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-left"
                              : target
                                ? "block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left hover:border-slate-300 hover:bg-white"
                                : "block w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left"
                        }
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 text-[18px] leading-9 text-slate-900">
                            {target
                              ? renderSentenceWithHighlight(sentence.text, target, choiceText)
                              : sentence.text}
                          </div>
                          {target ? (
                            <span
                              className={
                                isCurrent
                                  ? "shrink-0 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700"
                                  : isCompleted
                                    ? "shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                    : "shrink-0 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"
                              }
                            >
                              {target.blankLabel}
                            </span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </section>

        <CurrentTargetCard
          target={currentTarget}
          response={currentResponse}
          onChange={patchCurrentResponse}
          onSubmit={submitCurrent}
          onNext={moveToNext}
          canMoveNext={canMoveNext}
          isLast={currentTargetIndex === targets.length - 1}
        />
      </div>

      <aside className="space-y-4 xl:max-w-none">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Progress
          </div>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
              <span>완료 문장</span>
              <span className="font-semibold text-slate-900">
                {completedTargetIds.length} / {targets.length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
              <span>현재 문장</span>
              <span className="font-semibold text-violet-700">{currentTarget.sentenceId}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-3">
              <span>현재 상태</span>
              <span className="font-semibold text-slate-900">
                {currentResponse.submitted
                  ? currentCheckState.isFullyCorrect
                    ? "정답"
                    : "검토 필요"
                  : "풀이 중"}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">완료된 문장</div>
          <div className="mt-3 space-y-2">
            {completedTargetIds.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-500">
                아직 완료된 문장이 없습니다.
              </div>
            ) : (
              completedTargetIds.map((targetId) => {
                const target = targetMap.get(targetId);
                if (!target) return null;
                return (
                  <button
                    key={targetId}
                    type="button"
                    onClick={() => moveToTarget(targetId)}
                    className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="font-medium text-slate-900">{target.sentenceId}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {target.blankLabel} · 클릭해서 다시 보기
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}
