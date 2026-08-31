"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ExplanationSegment,
  BlankSegmentContent,
  TextSegmentContent,
  AnimationSegmentContent,
  BoardSegmentContent,
} from "@/models/grammar/types";
import BlankFillChallenge from "./BlankFillChallenge";
import BoardSegment from "./BoardSegment";
import VideoExplanationPlayer from "./VideoExplanationPlayer";

type Props = {
  segments: ExplanationSegment[];
  onDone: () => void;
};

export default function ExplanationPlayer({ segments, onDone }: Props) {
  const [current, setCurrent] = useState(0);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [audioMs, setAudioMs] = useState<number | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement>(null);

  // video 타입 세그먼트가 있으면 VideoExplanationPlayer로 위임 (기존 동작 유지)
  const videoSeg = segments.find((s) => s.type === "video");

  const seg = segments[current];
  const hasAudio = !!seg?.audio_url;
  const hasNarratedLecture = segments.some((s) => s.audio_url || s.type === "board");

  const advance = () => {
    if (current + 1 >= segments.length) {
      onDone();
    } else {
      setCurrent((c) => c + 1);
    }
  };
  const goBack = () => setCurrent((c) => Math.max(0, c - 1));

  // 세그먼트 전환 시 오디오 로드/재생
  useEffect(() => {
    setAudioMs(undefined);
    const el = audioRef.current;
    if (!el || !seg?.audio_url) {
      setPlaying(false);
      return;
    }
    el.src = seg.audio_url;
    el.currentTime = 0;
    el.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, seg?.audio_url]);

  const handleAudioEnded = () => {
    setPlaying(false);
    // blank는 학생이 답해야 진행 (자동 진행 안 함)
    if (seg?.type !== "blank") advance();
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  const handleBlankDone = () => {
    advance();
  };

  if (videoSeg) {
    return <VideoExplanationPlayer content={videoSeg.content as any} onDone={onDone} />;
  }

  if (!seg) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        설명 콘텐츠가 아직 준비되지 않았습니다.
        <br />
        <button
          onClick={onDone}
          className="mt-4 px-5 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition"
        >
          드릴 시작
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onLoadedMetadata={(e) => {
          const d = (e.currentTarget as HTMLAudioElement).duration;
          if (Number.isFinite(d)) setAudioMs(d * 1000);
        }}
        preload="auto"
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
          {hasNarratedLecture ? "강의" : "설명"} {current + 1} / {segments.length}
        </p>
        <button
          onClick={() => setShowSubtitle((v) => !v)}
          className="text-[11px] text-gray-400 hover:text-gray-600"
        >
          자막 {showSubtitle ? "끄기" : "켜기"}
        </button>
      </div>

      {/* 이전 세그먼트들 (읽기 전용) */}
      <div className="space-y-3">
        {segments.slice(0, current).map((s) => (
          <SegmentDisplay key={s.id} segment={s} muted />
        ))}

        {/* 현재 세그먼트 */}
        {seg.type === "blank" ? (
          <BlankFillChallenge content={seg.content as BlankSegmentContent} onDone={handleBlankDone} />
        ) : (
          <SegmentDisplay segment={seg} muted={false} animateBoardMs={audioMs} />
        )}
      </div>

      {/* 자막 */}
      {showSubtitle && seg.narration && (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{seg.narration}</p>
      )}

      {/* 컨트롤 */}
      {seg.type !== "blank" && (
        <div className="flex items-center gap-2">
          {hasAudio && (
            <button
              onClick={togglePlay}
              className="rounded-full bg-indigo-100 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-200"
            >
              {playing ? "⏸ 일시정지" : "▶ 재생"}
            </button>
          )}
          {current > 0 && (
            <button
              onClick={goBack}
              className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
            >
              ← 이전
            </button>
          )}
          <button
            onClick={advance}
            className="ml-auto rounded-xl bg-blue-500 px-5 py-2 text-sm text-white transition hover:bg-blue-600"
          >
            {current + 1 >= segments.length ? "드릴 시작" : "다음 →"}
          </button>
        </div>
      )}
    </div>
  );
}

function SegmentDisplay({
  segment,
  muted,
  animateBoardMs,
}: {
  segment: ExplanationSegment;
  muted: boolean;
  animateBoardMs?: number;
}) {
  if (segment.type === "board") {
    return (
      <BoardSegment
        content={segment.content as BoardSegmentContent}
        animate={!muted}
        totalMs={animateBoardMs}
      />
    );
  }

  if (segment.type === "text") {
    const c = segment.content as TextSegmentContent;
    return (
      <p className={`text-base leading-relaxed ${muted ? "text-gray-400" : "text-gray-800"}`}>
        {c.text}
      </p>
    );
  }

  if (segment.type === "animation") {
    const c = segment.content as AnimationSegmentContent;
    return (
      <div
        className={`rounded-xl border-2 border-dashed flex items-center justify-center h-32
          ${muted ? "border-gray-100 bg-gray-50" : "border-blue-200 bg-blue-50"}`}
      >
        <p className={`text-sm ${muted ? "text-gray-300" : "text-blue-400"}`}>
          [애니메이션: {c.key}]
        </p>
      </div>
    );
  }

  if (segment.type === "blank") {
    const c = segment.content as BlankSegmentContent;
    const parts = c.prompt.split("___");
    return (
      <p className={`text-base leading-relaxed ${muted ? "text-gray-400" : "text-gray-800"}`}>
        {parts[0]}
        <span className="font-bold text-green-600 underline">{c.answer}</span>
        {parts[1]}
      </p>
    );
  }

  return null;
}
