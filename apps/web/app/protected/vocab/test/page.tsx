"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { VocabTestQuestion, TestSubmitResponse } from "@/models/vocab/test.types";
import MascotLayer from "@/components/common/MascotLayer";
import TestQuestionPanel from "./_components/TestQuestionPanel";
import TestResultsScreen from "./_components/TestResultsScreen";
import TestStartScreen from "./_components/TestStartScreen";
import { scoreAnswer } from "@/lib/vocab/test/scoring";
import { scoreShortAnswer, scoreMultipleChoice } from "@/lib/vocab/test/questionGenerator";

// 전체 화면을 덮고, 내용은 항상 가로 중앙에 둔다 (예전 3:2 고정 무대는 창 크기에 따라 한쪽으로 치우쳤다)
function TestShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className={["relative mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center px-4 py-8", className].join(" ")}>
        {children}
      </div>
    </div>
  );
}

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
  // 답변/시험 제출 중 표시 + 실패 안내 (응답을 기다리는 동안 중복 클릭 방지)
  const [pending, setPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // 답변은 화면에서 먼저 채점해 바로 다음 문제로 넘기고, 서버 저장은 순서대로 뒤에서 처리한다.
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  const unsynced = useRef<Map<string, string>>(new Map()); // question_id -> answer (아직 서버에 못 올린 것)
  const streakRef = useRef(0);

  // 새로고침해도 처음으로 돌아가지 않게: 같은 Day 의 진행 중 시험이 있으면 이어서 보여준다
  const tryResume = async (track: string, day: string): Promise<boolean> => {
    try {
      const res = await fetch(
        `/api/vocab/test/resume?track_id=${encodeURIComponent(track)}&day=${encodeURIComponent(day)}&wrong_only=${useWrongOnly}`,
        { cache: "no-store" },
      );
      if (!res.ok) return false;
      const d = await res.json();
      if (!d?.session_id || !Array.isArray(d.questions) || d.questions.length === 0) return false;
      const qs = d.questions as VocabTestQuestion[];
      const firstOpen = qs.findIndex(q => q.is_correct === null);
      setSessionId(d.session_id);
      setQuestions(qs);
      setSelectedQuestionIdx(firstOpen === -1 ? qs.length - 1 : firstOpen);
      streakRef.current = d.current_streak ?? 0;
      setStreak(d.current_streak ?? 0);
      setBestStreak(d.best_streak ?? 0);
      setSessionPoints(d.total_points ?? 0);
      setState("testing");
      return true;
    } catch {
      return false;
    }
  };

  // 답을 아직 서버에 못 올렸는데 창을 닫으려 하면 경고
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (state === "testing" && unsynced.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    if (urlTrackId && urlDay) {
      setTrackId(urlTrackId);
      setDayNumber(urlDay);
      (async () => {
        const resumed = await tryResume(urlTrackId, urlDay);
        if (!cancelled && !resumed) setState("start");
      })();
      return () => {
        cancelled = true;
      };
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
        const resumed = await tryResume(bookId, String(elig.day));
        if (!cancelled && !resumed) setState("start");
      } catch {
        if (!cancelled) setError("시험 정보를 불러오지 못했어요.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [urlTrackId, urlDay]);

  // 응답이 오래 걸리면 멈춘 것처럼 보이므로 시간 제한(20초) + 네트워크 오류 시 1회 재시도
  const postJson = async (url: string, body: unknown, retries = 1): Promise<Response> => {
    for (let attempt = 0; ; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 20000);
      try {
        return await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: ctrl.signal,
        });
      } catch (err) {
        if (attempt >= retries) throw err;
      } finally {
        clearTimeout(timer);
      }
    }
  };

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
      streakRef.current = 0;
      unsynced.current.clear();
      setBestStreak(0);
      setSessionPoints(0);
      setHintReveals({});
      setState("testing");
    } catch (err: any) {
      setError(err.message || "Failed to start test");
      setState("start");
    }
  };

  /** 서버에 답 저장 → 서버 채점 결과(정답/점수/연속)로 화면 값을 맞춘다. 실패하면 unsynced 에 남긴다. */
  const syncAnswer = async (questionIdx: number, questionId: string, answer: string): Promise<boolean> => {
    try {
      // 서버는 이미 채점된 문제엔 저장된 결과를 돌려주므로 재시도해도 이중 채점되지 않는다
      const response = await postJson("/api/vocab/test/answer", {
        session_id: sessionId,
        question_id: questionId,
        answer,
      });
      if (!response.ok) throw new Error(`answer ${response.status}`);
      const r = await response.json();
      unsynced.current.delete(questionId);
      setQuestions(prev => {
        const next = [...prev];
        next[questionIdx] = {
          ...next[questionIdx],
          is_correct: r.is_correct,
          points_earned: r.points_earned,
          streak_bonus: r.streak_bonus,
        };
        return next;
      });
      streakRef.current = r.current_streak;
      setStreak(r.current_streak);
      setBestStreak(r.best_streak);
      setSessionPoints(r.session_total_points);
      return true;
    } catch (err) {
      console.error("Answer sync error:", err);
      return false;
    }
  };

  const handleSubmitAnswer = (questionIdx: number, answer: string) => {
    if (!sessionId || !questions[questionIdx]) return;
    const q = questions[questionIdx];
    if (q.is_correct !== null) return;

    // 서버와 같은 규칙으로 즉시 채점 (정답/보기는 문제 데이터에 이미 들어 있다)
    let ok = false;
    if (q.question_type === "word_to_meaning" && q.options) {
      ok = scoreMultipleChoice(answer, q.correct_answer, q.options);
    } else if (q.question_type === "word_to_meaning") {
      const acceptable =
        Array.isArray(q.meaning_ko) && q.meaning_ko.length > 0 ? q.meaning_ko : [q.correct_answer];
      ok = scoreShortAnswer(answer, acceptable, true);
    } else if (q.question_type === "meaning_to_word") {
      ok = scoreShortAnswer(answer, q.correct_answer);
    } else if (q.question_type === "synonym" || q.question_type === "listening") {
      ok = scoreMultipleChoice(answer, q.correct_answer, q.options ?? []);
    }
    const sc = scoreAnswer({
      questionType: q.question_type,
      isCorrect: ok,
      hintLevel: q.hint_level ?? 0,
      streakBefore: streakRef.current,
    });

    setQuestions(prev => {
      const next = [...prev];
      next[questionIdx] = {
        ...next[questionIdx],
        student_answer: answer,
        is_correct: sc.is_correct,
        points_earned: sc.points_earned,
        streak_bonus: sc.streak_bonus,
      };
      return next;
    });
    streakRef.current = sc.streak_after;
    setStreak(sc.streak_after);
    setBestStreak(b => Math.max(b, sc.streak_after));
    setSessionPoints(p => p + sc.points_earned);
    setSubmitError(null);

    unsynced.current.set(q.id, answer);
    syncQueue.current = syncQueue.current.then(async () => {
      await syncAnswer(questionIdx, q.id, answer);
    });
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
    if (!sessionId || pending) return;
    setPending(true);
    setSubmitError(null);
    try {
      // 아직 서버에 못 올린 답이 있으면 먼저 올린다 (순서대로)
      await syncQueue.current;
      for (const [qid, ans] of Array.from(unsynced.current.entries())) {
        const idx = questions.findIndex(x => x.id === qid);
        if (idx >= 0) await syncAnswer(idx, qid, ans);
      }
      if (unsynced.current.size > 0) throw new Error("unsynced answers");
      // 서버는 이미 채점된 세션이면 저장된 결과를 그대로 돌려주므로 재시도해도 안전하다
      const response = await postJson("/api/vocab/test/submit", { session_id: sessionId }, 2);
      if (!response.ok) throw new Error(`submit ${response.status}`);
      const data = await response.json();
      setResults(data);
      setState("results");
    } catch (err: any) {
      console.error("Test submit error:", err);
      // 시험 화면에 그대로 남겨 다시 제출할 수 있게 한다 (예전엔 오류 화면으로 빠져 멈춘 듯 보임)
      setSubmitError("시험 제출이 지연되고 있어요. 답은 저장되어 있으니 '시험 제출'을 다시 눌러 주세요.");
    } finally {
      setPending(false);
    }
  };

  if (notReady) {
    return (
      <TestShell>
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
      </TestShell>
    );
  }

  if (error) {
    return (
      <TestShell>
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
      </TestShell>
    );
  }

  return (
    <TestShell>
      <div className="relative z-10 w-full">
        {state === "loading" && (
          <div className="py-24 text-center text-gray-500 animate-pulse">시험을 준비하고 있어요…</div>
        )}
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
                pending={pending}
                submitError={submitError}
                onAnswerSubmit={(answer) => handleSubmitAnswer(selectedQuestionIdx, answer)}
                onUseHint={() => handleUseHint(selectedQuestionIdx)}
                onSubmitTest={handleSubmitTest}
                onNext={() => { setSubmitError(null); setSelectedQuestionIdx(Math.min(selectedQuestionIdx + 1, questions.length - 1)); }}
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
    </TestShell>
  );
}
