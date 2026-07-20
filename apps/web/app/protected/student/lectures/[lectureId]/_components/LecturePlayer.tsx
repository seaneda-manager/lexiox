"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type QuizQuestion = {
  id: string;
  timestamp_seconds: number;
  question_text: string;
  blank_answer: string;
  hint: string | null;
};

type Props = {
  lectureId: string;
  youtubeId: string;
  questions: QuizQuestion[];
  onComplete: (score: number, total: number) => void;
};

declare global {
  interface Window {
    YT: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  seekTo: (s: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};

export default function LecturePlayer({ lectureId, youtubeId, questions, onComplete }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 퀴즈 상태
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");
  const [showHint, setShowHint] = useState(false);
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  // 정렬된 퀴즈 목록
  const sortedQ = [...questions].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

  function handleVideoEnded() {
    setFinished(true);
    onComplete(score, sortedQ.length);
  }

  const loadYTApi = useCallback(() => {
    if (window.YT?.Player) return;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }, []);

  const initPlayer = useCallback(() => {
    if (!containerRef.current) return;
    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId: youtubeId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        fs: 1,
        disablekb: 1,
      },
      events: {
        onStateChange: (e) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            handleVideoEnded();
          }
        },
      },
    });
  }, [youtubeId]);

  useEffect(() => {
    loadYTApi();

    const onReady = () => initPlayer();
    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = onReady;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      playerRef.current?.destroy();
    };
  }, [initPlayer, loadYTApi]);

  // 타임스탬프 폴링
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      if (!playerRef.current || activeQuiz) return;
      const current = playerRef.current.getCurrentTime();

      for (const q of sortedQ) {
        if (passedIds.has(q.id)) continue;
        if (current >= q.timestamp_seconds) {
          playerRef.current.pauseVideo();
          setActiveQuiz(q);
          setUserAnswer("");
          setAnswerState("idle");
          setShowHint(false);
          break;
        }
      }
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeQuiz, sortedQ, passedIds]);

  function checkAnswer() {
    if (!activeQuiz) return;
    const correct =
      userAnswer.trim().toLowerCase() === activeQuiz.blank_answer.trim().toLowerCase();

    if (correct) {
      setAnswerState("correct");
      setScore((s) => s + 1);
      setTimeout(() => {
        setPassedIds((prev) => new Set([...prev, activeQuiz.id]));
        setActiveQuiz(null);
        playerRef.current?.playVideo();
      }, 800);
    } else {
      setAnswerState("wrong");
    }
  }

  function handleSkip() {
    if (!activeQuiz) return;
    setPassedIds((prev) => new Set([...prev, activeQuiz.id]));
    setActiveQuiz(null);
    playerRef.current?.playVideo();
  }

  // 빈칸 강조 렌더링
  function renderQuestion(text: string, answer: string) {
    const parts = text.split("___");
    if (parts.length === 1) return <span>{text}</span>;
    return (
      <>
        {parts[0]}
        <span className="inline-block min-w-[80px] border-b-2 border-neutral-900 mx-1 text-center">
          {answerState === "correct" ? (
            <span className="text-emerald-600 font-semibold">{answer}</span>
          ) : (
            <span className="text-neutral-400 text-sm">____</span>
          )}
        </span>
        {parts.slice(1).join("___")}
      </>
    );
  }

  return (
    <div className="relative w-full">
      {/* YouTube 플레이어 */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <div
          ref={containerRef}
          className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden bg-black"
        />
        {/* 퀴즈 오버레이 */}
        {activeQuiz && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-2xl z-10">
            <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                  퀴즈
                </span>
                <span className="text-xs text-neutral-400">
                  {score}/{sortedQ.length}
                </span>
              </div>

              <p className="text-base font-medium text-neutral-900 leading-relaxed">
                {renderQuestion(activeQuiz.question_text, activeQuiz.blank_answer)}
              </p>

              {answerState !== "correct" && (
                <>
                  <input
                    autoFocus
                    value={userAnswer}
                    onChange={(e) => {
                      setUserAnswer(e.target.value);
                      setAnswerState("idle");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && checkAnswer()}
                    placeholder="정답을 입력하세요"
                    className={[
                      "w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2",
                      answerState === "wrong"
                        ? "border-red-300 focus:ring-red-300"
                        : "focus:ring-neutral-900",
                    ].join(" ")}
                  />

                  {answerState === "wrong" && (
                    <p className="text-xs text-red-600">
                      틀렸어요. 다시 시도해보세요.
                      {activeQuiz.hint && !showHint && (
                        <button
                          onClick={() => setShowHint(true)}
                          className="ml-2 underline text-neutral-500"
                        >
                          힌트 보기
                        </button>
                      )}
                    </p>
                  )}

                  {showHint && activeQuiz.hint && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      힌트: {activeQuiz.hint}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={checkAnswer}
                      className="flex-1 rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
                    >
                      확인
                    </button>
                    <button
                      onClick={handleSkip}
                      className="rounded-xl border px-4 py-2.5 text-sm text-neutral-500 hover:bg-neutral-50"
                    >
                      건너뛰기
                    </button>
                  </div>
                </>
              )}

              {answerState === "correct" && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-emerald-700 font-semibold text-sm">
                  정답입니다!
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 완료 배너 */}
      {finished && (
        <div className="mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-1">
          <p className="text-emerald-800 font-semibold">강의 완료!</p>
          <p className="text-sm text-emerald-700">
            퀴즈 {score}/{sortedQ.length}개 정답
          </p>
        </div>
      )}
    </div>
  );
}
