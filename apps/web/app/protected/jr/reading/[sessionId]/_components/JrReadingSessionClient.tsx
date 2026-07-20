"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import JrReadingVocabularyStage from "./stages/JrReadingVocabularyStage";
import JrReadingGrammarStage from "./stages/JrReadingGrammarStage";
import JrReadingTranslationStage from "./stages/JrReadingTranslationStage";
import JrReadingComprehensionStage from "./stages/JrReadingComprehensionStage";
import JrReadingDiscussionStage from "./stages/JrReadingDiscussionStage";
import { updateSessionProgressAction, completeSessionAction } from "../actions";

type ReadingStage = "vocabulary" | "grammar" | "reading" | "comprehension" | "discussion";

const STAGE_ORDER: ReadingStage[] = ["vocabulary", "grammar", "reading", "comprehension", "discussion"];

type Props = {
  sessionId: string;
  passage: {
    id: string;
    content: string;
  };
  initialStage: ReadingStage;
  initialSentenceIndex: number;
  initialVocabLogs: any[];
  initialGrammarLogs: any[];
  initialTranslationLogs: any[];
  initialComprehensionLogs: any[];
};

export default function JrReadingSessionClient({
  sessionId,
  passage,
  initialStage,
  initialSentenceIndex,
  initialVocabLogs,
  initialGrammarLogs,
  initialTranslationLogs,
  initialComprehensionLogs,
}: Props) {
  const router = useRouter();
  const [currentStage, setCurrentStage] = useState<ReadingStage>(initialStage);
  const [sentenceIndex, setSentenceIndex] = useState(initialSentenceIndex);
  const [done, setDone] = useState(false);

  // Stage별 Log 상태
  const [vocabLogs, setVocabLogs] = useState(initialVocabLogs);
  const [grammarLogs, setGrammarLogs] = useState(initialGrammarLogs);
  const [translationLogs, setTranslationLogs] = useState(initialTranslationLogs);
  const [comprehensionLogs, setComprehensionLogs] = useState(initialComprehensionLogs);

  const handleStageSave = useCallback(async () => {
    // Autosave: 현재 Stage 진행 상황 저장
    await updateSessionProgressAction(sessionId, {
      stage: currentStage,
      sentenceIndex,
    });
  }, [sessionId, currentStage, sentenceIndex]);

  const handleStageComplete = useCallback(async () => {
    const stageIndex = STAGE_ORDER.indexOf(currentStage);
    if (stageIndex < STAGE_ORDER.length - 1) {
      // 다음 Stage로 이동
      const nextStage = STAGE_ORDER[stageIndex + 1];
      setCurrentStage(nextStage);
    } else {
      // 모든 Stage 완료
      await completeSessionAction(sessionId);
      setDone(true);
    }
  }, [currentStage, sessionId]);

  if (done) {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center space-y-6">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold text-neutral-900">Reading 완료!</h1>
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
            <h1 className="text-2xl font-bold text-slate-900">Reading</h1>
            <div className="text-sm text-slate-600">
              {STAGE_ORDER.indexOf(currentStage) + 1} / {STAGE_ORDER.length}
            </div>
          </div>
          {/* Stage Progress Bar */}
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${((STAGE_ORDER.indexOf(currentStage) + 1) / STAGE_ORDER.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Stage Content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        {currentStage === "vocabulary" && (
          <JrReadingVocabularyStage
            passage={passage}
            logs={vocabLogs}
            onSave={setVocabLogs}
            onComplete={handleStageComplete}
          />
        )}
        {currentStage === "grammar" && (
          <JrReadingGrammarStage
            passage={passage}
            logs={grammarLogs}
            onSave={setGrammarLogs}
            onComplete={handleStageComplete}
          />
        )}
        {currentStage === "reading" && (
          <JrReadingTranslationStage
            passage={passage}
            logs={translationLogs}
            onSave={setTranslationLogs}
            onComplete={handleStageComplete}
          />
        )}
        {currentStage === "comprehension" && (
          <JrReadingComprehensionStage
            passage={passage}
            logs={comprehensionLogs}
            onSave={setComprehensionLogs}
            onComplete={handleStageComplete}
          />
        )}
        {currentStage === "discussion" && (
          <JrReadingDiscussionStage
            passage={passage}
            onComplete={handleStageComplete}
          />
        )}
      </div>
    </div>
  );
}
