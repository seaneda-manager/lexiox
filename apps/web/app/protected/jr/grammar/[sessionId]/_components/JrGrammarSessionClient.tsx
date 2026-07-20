"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import JrGrammarLessonStage from "./stages/JrGrammarLessonStage";
import JrGrammarPracticeStage from "./stages/JrGrammarPracticeStage";
import { updateGrammarSessionProgressAction, completeGrammarSessionAction } from "../actions";

type GrammarStage = "lesson" | "practice";

const STAGE_ORDER: GrammarStage[] = ["lesson", "practice"];

type Props = {
  sessionId: string;
  chapter: {
    id: string;
    title: string;
    content: string;
  };
  initialStage: GrammarStage;
};

export default function JrGrammarSessionClient({
  sessionId,
  chapter,
  initialStage,
}: Props) {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState<GrammarStage>(initialStage);
  const [done, setDone] = useState(false);

  const handleStageComplete = useCallback(async () => {
    const stageIndex = STAGE_ORDER.indexOf(currentStage);
    if (stageIndex < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[stageIndex + 1];
      await updateGrammarSessionProgressAction(sessionId, {
        stage: nextStage,
      });
      setCurrentStage(nextStage);
    } else {
      await completeGrammarSessionAction(sessionId);
      setDone(true);
    }
  }, [currentStage, sessionId]);

  if (done) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center space-y-6">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-neutral-900">Grammar 완료!</h1>
        <p className="text-neutral-500">수고했어요. 결과가 저장됐습니다.</p>
        <button
          onClick={() => router.push("/jr")}
          className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600"
        >
          홈으로
        </button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Stage Header */}
      <div className="border-b bg-white p-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Grammar</h1>
              <p className="text-sm text-slate-600 mt-1">{chapter.title}</p>
            </div>
            <div className="text-sm text-slate-600">
              {STAGE_ORDER.indexOf(currentStage) + 1} / {STAGE_ORDER.length}
            </div>
          </div>
          {/* Stage Progress Bar */}
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{
                width: `${((STAGE_ORDER.indexOf(currentStage) + 1) / STAGE_ORDER.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Stage Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {currentStage === "lesson" && (
          <JrGrammarLessonStage
            chapter={chapter}
            onComplete={handleStageComplete}
          />
        )}
        {currentStage === "practice" && (
          <JrGrammarPracticeStage
            chapter={chapter}
            onComplete={handleStageComplete}
          />
        )}
      </div>
    </div>
  );
}
