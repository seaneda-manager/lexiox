"use client";

import { useEffect, useRef, useState } from "react";
import ScriptPanel from "./ScriptPanel";
import type { ScriptSegment } from "@/models/listening";

interface StudyAudioPlayerProps {
  audioUrl: string;
  transcript?: string;
  scriptSegments?: ScriptSegment[];
  /** 듣기 화면에서는 자동 재생, 문제 화면에서는 학생이 직접 누르게 둔다. */
  autoPlay?: boolean;
  onEnded?: () => void;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function StudyAudioPlayer({
  audioUrl,
  transcript,
  scriptSegments,
  autoPlay = false,
  onEnded,
}: StudyAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showScript, setShowScript] = useState(false);

  useEffect(() => {
    if (!autoPlay) return;
    audioRef.current?.play().catch(() => setIsPlaying(false));
  }, [autoPlay, audioUrl]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => setIsPlaying(false));
    else el.pause();
  };

  const seekTo = (seconds: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(seconds, duration || seconds));
    setCurrentTime(el.currentTime);
  };

  const restart = () => {
    seekTo(0);
    audioRef.current?.play().catch(() => setIsPlaying(false));
  };

  const skip = (delta: number) => seekTo(currentTime + delta);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="w-full max-w-2xl space-y-3">
      <div className="flex items-center justify-between px-1 text-sm text-gray-600">
        <span className="font-mono">{formatTime(currentTime)}</span>
        <span className="font-mono">{formatTime(duration)}</span>
      </div>

      {/* 탐색 가능한 진행 바 */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={currentTime}
        onChange={(e) => seekTo(Number(e.target.value))}
        aria-label="재생 위치"
        className="h-2 w-full cursor-pointer accent-blue-600"
        style={{
          background: `linear-gradient(to right, #2563eb ${progressPercent}%, #e5e7eb ${progressPercent}%)`,
        }}
      />

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => skip(-5)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          ← 5초
        </button>
        <button
          type="button"
          onClick={togglePlay}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {isPlaying ? "일시정지" : "재생"}
        </button>
        <button
          type="button"
          onClick={() => skip(5)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          5초 →
        </button>
        <button
          type="button"
          onClick={restart}
          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          처음부터
        </button>
        <button
          type="button"
          onClick={() => setShowScript((v) => !v)}
          className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
            showScript
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          TEXT
        </button>
      </div>

      {showScript && (
        <ScriptPanel
          transcript={transcript}
          scriptSegments={scriptSegments}
          duration={duration}
          currentTime={currentTime}
          onSeek={seekTo}
        />
      )}

      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
      />
    </div>
  );
}
