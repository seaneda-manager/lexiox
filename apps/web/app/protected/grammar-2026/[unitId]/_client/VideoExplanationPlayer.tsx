"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { VideoSegmentContent, PausePoint } from "@/models/grammar/types";
import BlankFillChallenge from "./BlankFillChallenge";

type Props = {
  content: VideoSegmentContent;
  onDone: () => void;
};

export default function VideoExplanationPlayer({ content, onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [activePause, setActivePause] = useState<PausePoint | null>(null);
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);

  // 타임스탬프 감시 — 아직 통과 안 한 pause_point에 도달하면 일시정지
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || activePause) return;

    const currentTime = video.currentTime;
    const next = content.pause_points
      .filter((p) => !passedIds.has(p.id) && currentTime >= p.timestamp_sec)
      .sort((a, b) => a.timestamp_sec - b.timestamp_sec)[0];

    if (next) {
      video.pause();
      setActivePause(next);
    }
  }, [activePause, passedIds, content.pause_points]);

  const handleVideoEnd = () => setEnded(true);

  const handleBlankDone = () => {
    if (!activePause) return;
    setPassedIds((prev) => new Set([...prev, activePause.id]));
    setActivePause(null);
    videoRef.current?.play();
  };

  useEffect(() => {
    if (ended && !activePause) onDone();
  }, [ended, activePause, onDone]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        설명 영상
      </p>

      {/* 영상 */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          src={content.video_url}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleVideoEnd}
          controls={!activePause}
          playsInline
        />

        {/* 시작 전 오버레이 */}
        {!started && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <button
              onClick={() => { setStarted(true); videoRef.current?.play(); }}
              className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition shadow-lg"
            >
              <svg className="w-7 h-7 text-indigo-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
        )}

        {/* 일시정지 중 오버레이 표시 */}
        {activePause && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] bg-amber-400 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
              ⏸ 빈칸 문제
            </span>
          </div>
        )}
      </div>

      {/* 진행 표시 */}
      {content.pause_points.length > 0 && (
        <div className="flex items-center gap-1.5">
          {content.pause_points.map((p) => (
            <div
              key={p.id}
              className={`w-2 h-2 rounded-full transition-colors ${
                passedIds.has(p.id)
                  ? "bg-green-400"
                  : activePause?.id === p.id
                  ? "bg-amber-400 animate-pulse"
                  : "bg-gray-200"
              }`}
            />
          ))}
          <p className="text-[10px] text-gray-400 ml-1">
            빈칸 {passedIds.size} / {content.pause_points.length}
          </p>
        </div>
      )}

      {/* 빈칸 문제 */}
      {activePause && (
        <BlankFillChallenge
          content={{
            prompt: activePause.prompt,
            answer: activePause.answer,
            hint_ko: activePause.hint_ko,
          }}
          onDone={handleBlankDone}
        />
      )}

      {/* 영상 종료 + 모든 빈칸 통과 */}
      {ended && !activePause && (
        <button
          onClick={onDone}
          className="w-full py-2.5 bg-blue-500 text-white text-sm font-medium rounded-xl hover:bg-blue-600 transition"
        >
          드릴 시작 →
        </button>
      )}
    </div>
  );
}
