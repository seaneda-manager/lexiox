// apps/web/components/listening/ListeningAdaptiveRunner.tsx
"use client";

import { useMemo, useState } from "react";
import TestSectionLayout from "@/components/test/TestSectionLayout";
import AudioScriptSync from "@/components/listening/AudioScriptSync";
import type { ScriptSegment } from "@/models/listening";

export type ListeningItemKind = "conversation" | "announcement" | "lecture";

export type ListeningChoice = {
  id: string;
  text: string;
};

export type ListeningItem = {
  id: string;
  number: number;
  kind: ListeningItemKind;
  stage?: 1 | 2;
  promptTitle: string;
  imageSrc: string;
  audioSrc: string;
  question: string;
  choices: ListeningChoice[];
  correctChoiceId?: string;
  // ── 새로 추가: 스크립트 동기화 (선택사항) ──
  scriptSegments?: ScriptSegment[];
};

export type ListeningTest2026 = {
  meta: {
    id: string;
    label: string;
  };
  items: ListeningItem[];
};

export type ListeningAnswer = {
  itemId: string;
  choiceId: string | null;
  isCorrect?: boolean;
};

type Props = {
  test: ListeningTest2026;
  onFinish?: (result: {
    testId: string;
    answers: ListeningAnswer[];
    correctCount: number;
    total: number;
    scorePercent: number;
  }) => void;
};

export default function ListeningAdaptiveRunner({ test, onFinish }: Props) {
  const items = test.items ?? [];
  const total = items.length;

  const [index, setIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<ListeningAnswer[]>([]);
  const [finished, setFinished] = useState(false);

  const currentItem = items[index];

  const progressText = useMemo(
    () => `Question ${index + 1} of ${total}`,
    [index, total]
  );

  function handleNext() {
    if (!currentItem) {
      console.log("No currentItem, nothing to do");
      return;
    }

    console.log("Next clicked on item", currentItem.id, "selected:", selectedId);

    const answer: ListeningAnswer = {
      itemId: currentItem.id,
      choiceId: selectedId,
      isCorrect:
        selectedId != null &&
        currentItem.correctChoiceId != null &&
        selectedId === currentItem.correctChoiceId,
    };

    const updated = [...answers];
    const existingIdx = updated.findIndex((a) => a.itemId === currentItem.id);
    if (existingIdx >= 0) updated[existingIdx] = answer;
    else updated.push(answer);

    setAnswers(updated);

    const isLast = index === total - 1;
    console.log("isLast:", isLast, "index:", index, "total:", total);

    if (isLast) {
      const correctCount = updated.filter((a) => a.isCorrect).length;
      const scorePercent =
        total > 0 ? Math.round((correctCount / total) * 100) : 0;
      setFinished(true);
      onFinish?.({
        testId: test.meta.id,
        answers: updated,
        correctCount,
        total,
        scorePercent,
      });
    } else {
      setIndex((prev) => prev + 1);
      setSelectedId(null);
    }
  }

  // ✅ 결과 화면
  if (finished) {
    const correctCount = answers.filter((a) => a.isCorrect).length;
    const scorePercent =
      total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <h1 className="text-xl font-bold tracking-tight">
          Listening 2026 – Demo Result
        </h1>
        <p className="text-sm text-slate-700">
          You answered {correctCount} out of {total} questions correctly (
          {scorePercent}%).
        </p>

        <div className="space-y-3 text-sm">
          {items.map((item) => {
            const ans = answers.find((a) => a.itemId === item.id);
            const correctChoice = item.choices.find(
              (c) => c.id === item.correctChoiceId
            );
            const chosenChoice = item.choices.find(
              (c) => c.id === ans?.choiceId
            );

            return (
              <div
                key={item.id}
                className="rounded-md border bg-white p-3 shadow-sm"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    Question {item.number}
                  </span>
                  <span
                    className={
                      ans?.isCorrect
                        ? "text-xs font-semibold text-emerald-600"
                        : "text-xs font-semibold text-rose-600"
                    }
                  >
                    {ans?.isCorrect ? "Correct" : "Incorrect"}
                  </span>
                </div>
                <p className="mb-2 font-medium">{item.question}</p>
                <p className="text-xs text-slate-600">
                  Your answer:{" "}
                  {chosenChoice ? chosenChoice.text : <em>No answer</em>}
                </p>
                <p className="text-xs text-slate-600">
                  Correct answer: {correctChoice ? correctChoice.text : "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8 text-sm">
        No items in this test.
      </div>
    );
  }

  function renderLeftPanel() {
    // scriptSegments가 있으면 AudioScriptSync 표시
    if (currentItem.scriptSegments && currentItem.scriptSegments.length > 0) {
      return (
        <div className="flex flex-col gap-4">
          <AudioScriptSync
            audioUrl={currentItem.audioSrc}
            scriptSegments={currentItem.scriptSegments}
          />
        </div>
      );
    }

    // 기존: 이미지 + 오디오
    return (
      <div className="flex flex-col items-center gap-4">
        <img
          src={currentItem.imageSrc}
          alt={currentItem.kind}
          className="w-52 rounded-md shadow-sm"
        />
        <audio controls className="w-full">
          <source src={currentItem.audioSrc} />
        </audio>
      </div>
    );
  }

  function renderRightPanel() {
    return (
      <div className="flex h-full flex-col gap-4 text-sm">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{currentItem.question}</p>
          <span className="text-xs text-slate-500">{progressText}</span>
        </div>
        <form className="space-y-3">
          {currentItem.choices.map((choice) => (
            <label
              key={choice.id}
              className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 ${
                selectedId === choice.id
                  ? "border-emerald-500 bg-emerald-50"
                  : "hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name={`q-${currentItem.id}`}
                className="mt-1"
                checked={selectedId === choice.id}
                onChange={() => setSelectedId(choice.id)}
              />
              <span>{choice.text}</span>
            </label>
          ))}
        </form>
      </div>
    );
  }

  return (
    <TestSectionLayout
      sectionLabel="Listening"
      title={currentItem.promptTitle}
      showVolumeButton={true}
      showBackButton={false} // 뒤로가기 없음
      headerRightExtra={
        <span className="text-xs font-medium text-slate-600">
          {progressText}
        </span>
      }
      onNext={handleNext}
      nextLabel={index === total - 1 ? "Finish" : "Next"}
      left={renderLeftPanel()}
      right={renderRightPanel()}
    />
  );
}
