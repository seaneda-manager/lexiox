"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import JrListeningNotesStage from "./stages/JrListeningNotesStage";
import JrListeningQuestionStage from "./stages/JrListeningQuestionStage";
import JrListeningScriptReviewStage from "./stages/JrListeningScriptReviewStage";
import JrListeningShadowingStage from "./stages/JrListeningShadowingStage";
import JrListeningCheckupStage from "./stages/JrListeningCheckupStage";
import { updateListeningSessionProgressAction, completeListeningSessionAction } from "../actions";

type ListeningStage = "notes" | "question" | "script_review" | "shadowing" | "checkup";

const STAGE_ORDER: ListeningStage[] = ["notes", "question", "script_review", "shadowing", "checkup"];

type Props = {
  sessionId: string;
  audioUrl: string;
  audioTranscript: string;
  initialStage: ListeningStage;
};

export default function JrListeningSessionClient({
  sessionId,
  audioUrl,
  audioTranscript,
  initialStage,
}: Props) {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState<ListeningStage>(initialStage);
  const [done, setDone] = useState(false);

  const handleStageComplete = useCallback(async () => {
    const stageIndex = STAGE_ORDER.indexOf(currentStage);
    if (stageIndex < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[stageIndex + 1];
      await updateListeningSessionProgressAction(sessionId, {
        stage: nextStage,
      });
      setCurrentStage(nextStage);
    } else {
      await completeListeningSessionAction(sessionId);
      setDone(true);
    }
  }, [currentStage, sessionId]);

  if (done) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center space-y-6">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-neutral-900">Listening 완료!</h1>
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
            <h1 className="text-2xl font-bold text-slate-900">Listening</h1>
            <div className="text-sm text-slate-600">
              {STAGE_ORDER.indexOf(currentStage) + 1} / {STAGE_ORDER.length}
            </div>
          </div>
          {/* Stage Progress Bar */}
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{
                width: `${((STAGE_ORDER.indexOf(currentStage) + 1) / STAGE_ORDER.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Stage Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {currentStage === "notes" && (
          <JrListeningNotesStage
            audioUrl={audioUrl}
            onComplete={handleStageComplete}
          />
        )}
        {currentStage === "question" && (
          <JrListeningQuestionStage
            audioUrl={audioUrl}
            onComplete={handleStageComplete}
          />
        )}
        {currentStage === "script_review" && (
          <JrListeningScriptReviewStage
            transcript={audioTranscript}
            onComplete={handleStageComplete}
          />
        )}
        {currentStage === "shadowing" && (
          <JrListeningShadowingStage
            audioUrl={audioUrl}
            transcript={audioTranscript}
            onComplete={handleStageComplete}
          />
        )}
        {currentStage === "checkup" && (
          <JrListeningCheckupStage onComplete={handleStageComplete} />
        )}
      </div>
    </div>
  );
}
