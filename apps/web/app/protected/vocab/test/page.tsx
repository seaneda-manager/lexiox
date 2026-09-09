"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { VocabTestQuestion, TestSubmitResponse } from "@/models/vocab/test.types";
import FocusModeWrapper from "@/components/common/FocusModeWrapper";
import StageBackground from "@/components/common/StageBackground";
import MascotLayer from "@/components/common/MascotLayer";
import TestQuestionPanel from "./_components/TestQuestionPanel";
import TestResultsScreen from "./_components/TestResultsScreen";
import TestStartScreen from "./_components/TestStartScreen";

export default function VocabTestPage() {
  const router = useRouter();
  const params = useSearchParams();
  const urlTrackId = params.get("track_id");
  const urlDay = params.get("day");
  const useWrongOnly = params.get("wrong_only") === "true";

  // track/day 는 URL 파라미터가 있으면 그걸 쓰고,
  // 없으면(사이드바 "단어 시험" 등 맨링크 진입) 학생 프로필+eligibility 로 해석한다.
  const [trackId, setTrackId] = useState<string | null>(urlTrackId);
  const [dayNumber, setDayNumber] = useState<string | null>(urlDay);

  const [state, setState] = useState<"loading" | "start" | "testing" | "results">("loading");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<VocabTestQuestion[]>([]);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [results, setResults] = useState<TestSubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "시험은 있는데 아직 학습을 안 끝냈다" 같은 안내 (에러와 구분)
  const [notReady, setNotReady] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [hintReveals, setHintReveals] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    if (urlTrackId && urlDay) {
      setTrackId(urlTrackId);
      setDayNumber(urlDay);
      setState("start");
      return;
    }

    // 맨링크 진입: 현재 배정된 트랙 + 가장 최근 완료 Day 로 해석
    (async () => {
      try {
        const profRes = await fetch("/api/student/profile");
        const prof = profRes.ok ? await profRes.json() : null;
        const bookId: string | undefined = prof?.bookId;
        if (!bookId) {
          if (!cancelled) setError("배정된 단어 트랙이 없습니다. 담당 선생님에게 문의하세요.");
          return;
        }

        const eligRes = await fetch(
          `/api/vocab/test/eligibility?track_id=${encodeURIComponent(bookId)}`,
          { cache: "no-store" },
        );
        const elig = eligRes.ok ? await eligRes.json() : null;
        if (cancelled) return;

        if (!elig?.ok || elig.day == null) {
          setNotReady("아직 완료한 단어 학습 Day가 없어요. 먼저 단어 학습(깜지까지)을 끝내주세요.");
          return;
        }
        if (!elig.dayComplete) {
          setNotReady(
            `Day ${elig.day} 단어 학습을 아직 다 못 끝냈어요. 깜지까지 완료해야 시험을 볼 수 있어요.`,
          );
          return;
        }

        setTrackId(bookId);
        setDayNumber(String(elig.day));
        setState("start");
      } catch {
        if (!cancelled) setError("시험 정보를 불러오지 못했어요.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlTrackId, urlDay]);

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
      setStreak(0);
      setBestStreak(0);
      setSessionPoints(0);
      setHintReveals({});
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
          points_earned: answerResult.points_earned,
          streak_bonus: answerResult.streak_bonus,
        };
        return newQuestions;
      });
      setStreak(answerResult.current_streak);
      setBestStreak(answerResult.best_streak);
      setSessionPoints(answerResult.session_total_points);
    } catch (err: any) {
      console.error("Answer submit error:", err);
    }
  };

  const handleUseHint = async (questionIdx: number) => {
    if (!sessionId || !questions[questionIdx]) return;
    const question = questions[questionIdx];
    try {
      const response = await fetch("/api/vocab/test/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, question_id: question.id }),
      });
      if (!response.ok) throw new Error("Failed to use hint");
      const hintResult = await response.json();
      setQuestions(prev => {
        const newQuestions = [...prev];
        newQuestions[questionIdx] = {
          ...newQuestions[questionIdx],
          hint_level: hintResult.hint_level,
        };
        return newQuestions;
      });
      setHintReveals(prev => ({ ...prev, [question.id]: hintResult.reveal }));
    } catch (err: any) {
      console.error("Hint error:", err);
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

  if (notReady) {
    return (
      <FocusModeWrapper className="flex items-center justify-center min-h-screen">
        <div className="max-w-sm text-center space-y-3">
          <div className="text-4xl">📝</div>
          <p className="text-gray-800 text-lg font-bold">아직 시험을 볼 수 없어요</p>
          <p className="text-gray-500 text-sm">{notReady}</p>
          <button
            onClick={() => router.push("/vocab/hub-new")}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold"
          >
            단어 학습하러 가기
          </button>
        </div>
      </FocusModeWrapper>
    );
  }

  if (error) {
    return (
      <FocusModeWrapper className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <p className="text-gray-700 text-lg">시험 정보를 찾을 수 없습니다.</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <button
            onClick={() => router.push("/vocab/hub-new")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
          >
            단어 학습으로 이동
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
          <div className="max-w-2xl mx-auto">
            {questions[selectedQuestionIdx] && (
              <TestQuestionPanel
                key={questions[selectedQuestionIdx].id}
                question={questions[selectedQuestionIdx]}
                questionNumber={selectedQuestionIdx + 1}
                totalQuestions={questions.length}
                sessionPoints={sessionPoints}
                correctCount={questions.filter(q => q.is_correct === true).length}
                streak={streak}
                hintReveal={hintReveals[questions[selectedQuestionIdx].id]}
                onAnswerSubmit={(answer) => handleSubmitAnswer(selectedQuestionIdx, answer)}
                onUseHint={() => handleUseHint(selectedQuestionIdx)}
                onSubmitTest={handleSubmitTest}
                onNext={() => setSelectedQuestionIdx(Math.min(selectedQuestionIdx + 1, questions.length - 1))}
                onPrev={() => setSelectedQuestionIdx(Math.max(selectedQuestionIdx - 1, 0))}
              />
            )}
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
