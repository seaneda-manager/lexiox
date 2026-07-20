"use client";

import { useState } from "react";
import type { ExplanationSegment, BlankSegmentContent, TextSegmentContent, AnimationSegmentContent, VideoSegmentContent } from "@/models/grammar/types";
import BlankFillChallenge from "./BlankFillChallenge";
import VideoExplanationPlayer from "./VideoExplanationPlayer";

type Props = {
  segments: ExplanationSegment[];
  onDone: () => void;
};

export default function ExplanationPlayer({ segments, onDone }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  // video 타입 세그먼트가 있으면 VideoExplanationPlayer로 위임
  const videoSeg = segments.find((s) => s.type === "video");
  if (videoSeg) {
    return (
      <VideoExplanationPlayer
        content={videoSeg.content as any}
        onDone={onDone}
      />
    );
  }

  const seg = segments[current];

  if (!seg) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        설명 콘텐츠가 아직 준비되지 않았습니다.
        <br />
        <button onClick={onDone} className="mt-4 px-5 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition">
          드릴 시작
        </button>
      </div>
    );
  }

  const advance = () => {
    if (current + 1 >= segments.length) {
      onDone();
    } else {
      setCurrent((c) => c + 1);
      setPaused(false);
    }
  };

  const handleBlankDone = () => {
    setPaused(false);
    advance();
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
        설명 {current + 1} / {segments.length}
      </p>

      {/* 이전 세그먼트들 (읽기 전용으로 표시) */}
      <div className="space-y-3">
        {segments.slice(0, current).map((s) => (
          <SegmentDisplay key={s.id} segment={s} muted />
        ))}

        {/* 현재 세그먼트 */}
        {seg.type === "blank" ? (
          <BlankFillChallenge
            content={seg.content as BlankSegmentContent}
            onDone={handleBlankDone}
          />
        ) : (
          <div>
            <SegmentDisplay segment={seg} muted={false} />
            <button
              onClick={advance}
              className="mt-4 px-5 py-2 bg-blue-500 text-white text-sm rounded-xl hover:bg-blue-600 transition"
            >
              {current + 1 >= segments.length ? "드릴 시작" : "다음"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SegmentDisplay({
  segment,
  muted,
}: {
  segment: ExplanationSegment;
  muted: boolean;
}) {
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

  // blank — 완료된 것이므로 정답 표시
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
