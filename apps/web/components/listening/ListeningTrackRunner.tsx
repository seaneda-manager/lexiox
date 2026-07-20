"use client";

import { useState, useCallback, useMemo } from "react";
import type { LListeningTest2026, LBaseItem, LQuestion } from "@/models/listening";

type Props = {
  test: LListeningTest2026;
  onFinish?: (result: {
    testId: string;
    stage1Correct: number;
    stage1Total: number;
    stage2Correct: number;
    stage2Total: number;
  }) => void;
};

type Phase = "intro" | "track" | "stageSummary" | "final";

function isCorrectChoice(q: LQuestion, choiceId: string) {
  const c = q.choices.find((c) => c.id === choiceId);
  return !!(c && (c.correct || (c as any).is_correct || (c as any).isCorrect));
}

export default function ListeningTrackRunner({ test, onFinish }: Props) {
  const [stage, setStage] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<Phase>("intro");
  const [trackIdx, setTrackIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stage1Score, setStage1Score] = useState<{ correct: number; total: number } | null>(null);
  const [reported, setReported] = useState(false);

  const currentModule = test.modules[stage - 1];
  const tracks = currentModule?.items ?? [];
  const currentTrack = tracks[trackIdx];
  const questions = currentTrack?.questions ?? [];
  const currentQ = questions[qIdx];

  // 전체 진행률
  const { totalQ, answeredQ } = useMemo(() => {
    let total = 0, answered = 0;
    for (const item of tracks) {
      total += item.questions.length;
      for (const q of item.questions) { if (answers[q.id]) answered++; }
    }
    return { totalQ: total, answeredQ: answered };
  }, [tracks, answers]);

  const computeScore = useCallback((stageIdx: 0 | 1) => {
    let correct = 0, total = 0;
    for (const item of test.modules[stageIdx]?.items ?? []) {
      for (const q of item.questions) {
        total++;
        if (answers[q.id] && isCorrectChoice(q, answers[q.id])) correct++;
      }
    }
    return { correct, total };
  }, [answers, test.modules]);

  const handleSelect = (choiceId: string) => {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: choiceId }));
  };

  const handleNext = () => {
    // 다음 문제
    if (qIdx < questions.length - 1) {
      setQIdx(qIdx + 1);
      return;
    }
    // 다음 트랙
    if (trackIdx < tracks.length - 1) {
      setTrackIdx(trackIdx + 1);
      setQIdx(0);
      return;
    }
    // 스테이지 끝
    const score = computeScore((stage - 1) as 0 | 1);
    if (stage === 1) {
      setStage1Score(score);
      setPhase("stageSummary");
    } else {
      setPhase("final");
      if (onFinish && !reported) {
        const s1 = stage1Score ?? computeScore(0);
        onFinish({ testId: test.meta.id, stage1Correct: s1.correct, stage1Total: s1.total, stage2Correct: score.correct, stage2Total: score.total });
        setReported(true);
      }
    }
  };

  const handleStageNext = () => {
    setStage(2);
    setTrackIdx(0);
    setQIdx(0);
    setPhase("intro");
  };

  const isLastQ = trackIdx === tracks.length - 1 && qIdx === questions.length - 1;
  const hasAnswer = currentQ ? !!answers[currentQ.id] : false;

  // ── Intro ──────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-violet-200 bg-white p-8 shadow-md text-center space-y-4">
          <div className="text-4xl">{stage === 1 ? "🎧" : "🎯"}</div>
          <h2 className="text-lg font-bold text-gray-900">
            Stage {stage} — {stage === 1 ? "Routing Module" : "Final Module"}
          </h2>
          <p className="text-sm text-gray-500">
            {stage === 1
              ? "Read the transcripts and answer questions. Audio will be added soon."
              : "Final module. Your Stage 1 performance has shaped this set."}
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-4 py-1.5 text-xs font-medium text-violet-700">
            {tracks.length} tracks · {tracks.reduce((n, t) => n + t.questions.length, 0)} questions
          </div>
          <button
            onClick={() => setPhase("track")}
            className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition"
          >
            Start Stage {stage}
          </button>
        </div>
      </div>
    );
  }

  // ── Stage Summary ──────────────────────────────────────────
  if (phase === "stageSummary") {
    const score = stage1Score ?? computeScore(0);
    const pct = score.total ? Math.round((score.correct / score.total) * 100) : 0;
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-md text-center space-y-4">
          <div className="text-4xl">{pct >= 70 ? "✅" : "📝"}</div>
          <h2 className="text-lg font-bold">Stage 1 Complete</h2>
          <div className="text-3xl font-bold text-violet-700">{score.correct} / {score.total}</div>
          <p className="text-sm text-gray-500">Stage 2 module selected based on your performance.</p>
          <button
            onClick={handleStageNext}
            className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition"
          >
            Continue to Stage 2 →
          </button>
        </div>
      </div>
    );
  }

  // ── Final ──────────────────────────────────────────────────
  if (phase === "final") {
    const s1 = stage1Score ?? computeScore(0);
    const s2 = computeScore(1);
    const total = s1.correct + s2.correct;
    const outOf = s1.total + s2.total;
    const pct = outOf ? Math.round((total / outOf) * 100) : 0;
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-violet-200 bg-white p-8 shadow-md space-y-6">
          <div className="text-center space-y-2">
            <div className="text-4xl">🏁</div>
            <h2 className="text-xl font-bold">Listening Complete</h2>
            <div className="text-4xl font-bold text-violet-700">{pct}%</div>
            <p className="text-sm text-gray-500">{total} / {outOf} correct</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[{ label: "Stage 1", s: s1 }, { label: "Stage 2", s: s2 }].map(({ label, s }) => (
              <div key={label} className="rounded-xl border bg-gray-50 p-3 text-center">
                <div className="text-xs font-semibold text-gray-500 mb-1">{label}</div>
                <div className="text-lg font-bold">{s.correct} / {s.total}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Track Phase: 좌우 분할 ──────────────────────────────────
  const kindLabel = currentTrack?.taskKind === "academic_talk" ? "Lecture" : "Conversation";
  const trackNum = trackIdx + 1;

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <header className="shrink-0 flex items-center justify-between border-b bg-white px-4 py-2 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-violet-700">Listening · Stage {stage} / 2</span>
          <span className="hidden text-xs text-gray-400 sm:block">·</span>
          <span className="hidden text-xs text-gray-500 sm:block">
            {kindLabel} {trackNum} / {tracks.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 sm:block">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: totalQ ? `${(answeredQ / totalQ) * 100}%` : "0%" }}
            />
          </div>
          <span className="text-xs text-gray-500">{answeredQ} / {totalQ}</span>
        </div>
      </header>

      {/* 본문 좌우 분할 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌: 스크립트 */}
        <div className="w-1/2 h-full overflow-y-auto border-r bg-white p-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
              {kindLabel} {trackNum}
            </span>
            {currentTrack?.title && (
              <span className="text-xs text-gray-500">{currentTrack.title}</span>
            )}
          </div>
          {/* 나중에 오디오 영역 */}
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-dashed border-violet-200 bg-violet-50/50 px-4 py-3 text-xs text-violet-500">
            🎧 <span>오디오가 곧 추가됩니다 (ElevenLabs TTS)</span>
          </div>
          {currentTrack?.transcript ? (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {currentTrack.transcript}
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">스크립트 준비 중…</p>
          )}
        </div>

        {/* 우: 문제 */}
        <div className="w-1/2 h-full flex flex-col bg-gray-50">
          {/* 문제 번호 탭 */}
          <div className="shrink-0 flex flex-wrap gap-1 border-b bg-white px-4 py-2">
            {questions.map((q, i) => {
              const done = !!answers[q.id];
              return (
                <button
                  key={q.id}
                  onClick={() => setQIdx(i)}
                  className={`h-7 w-7 rounded text-xs font-medium transition ${
                    i === qIdx
                      ? "bg-violet-600 text-white"
                      : done
                      ? "bg-violet-100 text-violet-800"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {q.number ?? i + 1}
                </button>
              );
            })}
          </div>

          {/* 현재 문제 */}
          <div className="flex-1 overflow-y-auto p-5">
            {currentQ && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-900 leading-snug">
                  {qIdx + 1}. {currentQ.stem ?? currentQ.prompt}
                </p>
                <div className="space-y-2">
                  {currentQ.choices.map((c) => {
                    const selected = answers[currentQ.id] === c.id;
                    return (
                      <label
                        key={c.id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition ${
                          selected
                            ? "border-violet-500 bg-violet-50 text-violet-900"
                            : "border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:bg-violet-50/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={currentQ.id}
                          checked={selected}
                          onChange={() => handleSelect(c.id)}
                          className="mt-0.5 shrink-0 accent-violet-600"
                        />
                        <span>{c.text}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 이전 / 다음 */}
          <div className="shrink-0 flex items-center justify-between border-t bg-white px-4 py-2">
            <button
              disabled={qIdx === 0 && trackIdx === 0}
              onClick={() => {
                if (qIdx > 0) setQIdx(qIdx - 1);
                else if (trackIdx > 0) { setTrackIdx(trackIdx - 1); setQIdx(questions.length - 1); }
              }}
              className="rounded-lg border px-4 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30"
            >
              ← 이전
            </button>
            <span className="text-xs text-gray-400">
              {qIdx + 1} / {questions.length}
            </span>
            <button
              onClick={handleNext}
              className={`rounded-lg border px-4 py-1.5 text-xs font-medium transition ${
                isLastQ
                  ? "border-violet-600 bg-violet-600 text-white hover:bg-violet-700"
                  : "border-violet-400 text-violet-700 hover:bg-violet-50"
              }`}
            >
              {isLastQ ? (stage === 1 ? "Finish Stage 1" : "Finish Listening") : "다음 →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
