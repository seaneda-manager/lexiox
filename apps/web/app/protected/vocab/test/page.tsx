"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { VocabTestQuestion, TestSubmitResponse } from "@/models/vocab/test.types";
import FocusModeWrapper from "@/components/common/FocusModeWrapper";
import StageBackground from "@/components/common/StageBackground";
import MascotLayer from "@/components/common/MascotLayer";
import TestQuestionsTable from "./_components/TestQuestionsTable";
import TestQuestionPanel from "./_components/TestQuestionPanel";
import TestResultsScreen from "./_components/TestResultsScreen";
import TestStartScreen from "./_components/TestStartScreen";

export default function VocabTestPage() {
  const router = useRouter();
  const params = useSearchParams();
  const trackId = params.get("track_id");
  const dayNumber = params.get("day");
  const useWrongOnly = params.get("wrong_only") === "true";

  const [state, setState] = useState<"loading" | "start" | "testing" | "results">("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<VocabTestQuestion[]>([]);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [results, setResults] = useState<TestSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackId || !dayNumber) {
      setError("Missing track_id or day parameter");
      return;
    }
    setState("start");
  }, [trackId, dayNumber]);

  const handleStartTest = async () => {
    if (!trackId || !dayNumber) return;
    setState("loading");
    try {
      const response = await fetch("/api/vocab/test/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track_id: trackId,
          day_number: parseInt(dayNumber),
          use_wrong_only: useWrongOnly,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start test");
      }
      const data = await response.json();
      setSessionId(data.session_id);
      setQuestions(data.questions);
      setSelectedQuestionIdx(0);
      setState("testing");
    } catch (err: any) {
      setError(err.message || "Failed to start test");
      setState("start");
    }
  };

  const handleSubmitAnswer = async (questionIdx: number, answer: string) => {
    if (!sessionId || !questions[questionIdx]) return;
    const question = questions[questionIdx];
    try {
      const response = await fetch("/api/vocab/test/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          question_id: question.id,
          answer,
        }),
      });
      if (!response.ok) throw new Error("Failed to submit answer");
      const answerResult = await response.json();
      setQuestions(prev => {
        const newQuestions = [...prev];
        newQuestions[questionIdx] = {
          ...newQuestions[questionIdx],
          student_answer: answer,
          is_correct: answerResult.is_correct,
        };
        return newQuestions;
      });
    } catch (err: any) {
      console.error("Answer submit error:", err);
    }
  };

  const handleSubmitTest = async () => {
    if (!sessionId) return;
    setState("loading");
    try {
      const response = await fetch("/api/vocab/test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!response.ok) throw new Error("Failed to submit test");
      const data = await response.json();
      setResults(data);
      setState("results");
    } catch (err: any) {
      setError(err.message || "Failed to submit test");
    }
  };

  if (error) {
    return (
      <FocusModeWrapper className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-lg">{error}</p>
          <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            뒤로 가기
          </button>
        </div>
      </FocusModeWrapper>
    );
  }

  return (
    <FocusModeWrapper className="relative w-full min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <StageBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {state === "start" && (
          <TestStartScreen
            trackId={trackId!}
            dayNumber={parseInt(dayNumber!)}
            useWrongOnly={useWrongOnly}
            onStart={handleStartTest}
          />
        )}
        {state === "testing" && sessionId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 h-[calc(100vh-200px)] overflow-y-auto">
              <TestQuestionsTable
                questions={questions}
                selectedIdx={selectedQuestionIdx}
                onSelect={setSelectedQuestionIdx}
              />
            </div>
            <div className="lg:col-span-2">
              {questions[selectedQuestionIdx] && (
                <TestQuestionPanel
                  question={questions[selectedQuestionIdx]}
                  questionNumber={selectedQuestionIdx + 1}
                  totalQuestions={questions.length}
                  onAnswerSubmit={(answer) => handleSubmitAnswer(selectedQuestionIdx, answer)}
                  onSubmitTest={handleSubmitTest}
                  onNext={() => setSelectedQuestionIdx(Math.min(selectedQuestionIdx + 1, questions.length - 1))}
                  onPrev={() => setSelectedQuestionIdx(Math.max(selectedQuestionIdx - 1, 0))}
                />
              )}
            </div>
          </div>
        )}
        {state === "results" && results && (
          <TestResultsScreen
            results={results}
            questions={questions}
            onRetry={() => router.push(`/vocab/test?track_id=${trackId}&day=${dayNumber}`)}
            onHome={() => router.push("/vocab")}
          />
        )}
      </div>
      <MascotLayer />
    </FocusModeWrapper>
  );
}
