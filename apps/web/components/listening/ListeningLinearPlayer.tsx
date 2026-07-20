"use client";

import { useState } from "react";
import type { LListeningTest2026 } from "@/models/listening";

type Props = {
  test: LListeningTest2026;
};

type Phase = "listening" | "review";

export default function ListeningLinearPlayer({ test }: Props) {
  const [currentTrackIdx, setCurrentTrackIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("listening");

  const tracks = test.tracks ?? [];
  if (tracks.length === 0) {
    return <div className="p-6 text-center text-gray-600">트랙이 없습니다.</div>;
  }

  const currentTrack = tracks[currentTrackIdx];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* 진행률 & 단계 표시 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">
            {currentTrackIdx + 1} / {tracks.length}
          </span>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
            phase === "listening"
              ? "bg-blue-100 text-blue-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {phase === "listening" ? "🎧 Listening" : "📖 Review"}
          </span>
        </div>
        <div className="h-2 flex-1 mx-4 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-violet-600 transition-all"
            style={{ width: `${((currentTrackIdx + 1) / tracks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 현재 트랙 */}
      <div className="rounded-lg border-2 border-violet-200 bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{currentTrack.title}</h2>
          <p className="mt-1 text-xs text-gray-500">{currentTrack.taskKind}</p>
        </div>

        {/* 음성 플레이어 */}
        <div className="mb-6">
          {!currentTrack.audioUrl ? (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              ⚠️ 음성 파일이 없습니다. (audioUrl: {currentTrack.audioUrl})
            </div>
          ) : (
            <audio
              controls
              className="w-full"
              src={currentTrack.audioUrl}
              style={{ height: "40px" }}
              onError={(e) => {
                console.error("Audio loading error:", e);
                console.error("Audio source:", currentTrack.audioUrl);
              }}
            />
          )}
        </div>

        {/* 트랜스크립트 - Review 단계에서만 표시 */}
        {phase === "review" && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-xs font-semibold text-yellow-700 mb-2">📝 스크립트</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
              {currentTrack.transcript}
            </p>
          </div>
        )}

        {/* 문제들 */}
        {currentTrack.questions && currentTrack.questions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">문제</h3>
            {currentTrack.questions.map((q, idx) => (
              <div key={q.id} className={`rounded-lg p-3 ${
                phase === "review"
                  ? "bg-amber-50 border border-amber-200"
                  : "bg-blue-50"
              }`}>
                <p className="text-sm font-medium text-gray-900">
                  {idx + 1}. {q.text}
                </p>
                <div className="mt-2 space-y-2">
                  {q.choices.map((choice) => {
                    const isCorrect = (q as any).correctIndices?.includes(q.choices.indexOf(choice));
                    return (
                      <label
                        key={choice.id}
                        className={`flex items-center gap-2 text-sm px-2 py-1 rounded transition ${
                          phase === "review" && isCorrect
                            ? "bg-green-100 text-green-800 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          disabled
                          className="cursor-not-allowed"
                        />
                        {choice.text}
                        {phase === "review" && isCorrect && <span className="ml-auto">✓</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Review 버튼 */}
        {phase === "listening" && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setPhase("review")}
              className="rounded-lg bg-amber-600 px-6 py-2 text-sm font-semibold text-white hover:bg-amber-700"
            >
              📖 검토하기
            </button>
          </div>
        )}

        {/* 다시 풀기 버튼 */}
        {phase === "review" && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => setPhase("listening")}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              🎧 다시 풀기
            </button>
          </div>
        )}
      </div>

      {/* 네비게이션 */}
      <div className="flex justify-between gap-3">
        <button
          onClick={() => setCurrentTrackIdx(Math.max(0, currentTrackIdx - 1))}
          disabled={currentTrackIdx === 0}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          이전
        </button>

        <div className="flex gap-2">
          {tracks.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentTrackIdx(idx)}
              className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                idx === currentTrackIdx
                  ? "bg-violet-600 text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentTrackIdx(Math.min(tracks.length - 1, currentTrackIdx + 1))}
          disabled={currentTrackIdx === tracks.length - 1}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          다음
        </button>
      </div>
    </div>
  );
}
