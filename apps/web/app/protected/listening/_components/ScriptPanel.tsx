"use client";

import { useEffect, useMemo, useRef } from "react";
import { buildScriptLines, activeLineIndex } from "@/lib/listening/script-timing";
import type { ScriptSegment } from "@/models/listening";

interface ScriptPanelProps {
  transcript?: string;
  scriptSegments?: ScriptSegment[];
  /** 오디오 전체 길이(초). 추정 타이밍 계산에 필요하다. */
  duration: number;
  /** 현재 재생 위치(초). */
  currentTime: number;
  /** 문장을 클릭하면 그 지점으로 이동. 없으면 클릭 비활성. */
  onSeek?: (seconds: number) => void;
}

export default function ScriptPanel({
  transcript,
  scriptSegments,
  duration,
  currentTime,
  onSeek,
}: ScriptPanelProps) {
  const lines = useMemo(
    () => buildScriptLines(transcript, duration, scriptSegments),
    [transcript, duration, scriptSegments],
  );

  const activeIndex = activeLineIndex(lines, currentTime);
  const activeRef = useRef<HTMLButtonElement>(null);

  // 재생이 진행되면 현재 문장이 화면 밖으로 나가지 않게 따라간다.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  if (!lines.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400">
        이 오디오에는 스크립트가 없습니다.
      </div>
    );
  }

  const isEstimated = lines[0].estimated && duration > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
        <span className="text-xs font-semibold text-gray-600">Script</span>
        {isEstimated && (
          <span
            className="text-[10px] text-gray-400"
            title="문장별 실제 타임스탬프가 없어 단어 수 비율로 위치를 추정합니다."
          >
            위치는 대략적입니다
          </span>
        )}
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto px-3 py-3">
        {lines.map((line, i) => {
          const isActive = i === activeIndex;
          const seekable = !!onSeek && line.endTime > line.startTime;

          return (
            <button
              key={line.id}
              ref={isActive ? activeRef : undefined}
              type="button"
              disabled={!seekable}
              onClick={() => seekable && onSeek!(line.startTime)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm leading-relaxed transition-colors ${
                isActive
                  ? "bg-blue-100 font-semibold text-blue-900"
                  : "text-gray-600 hover:bg-gray-50"
              } ${seekable ? "cursor-pointer" : "cursor-default"}`}
            >
              {line.speaker && (
                <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {line.speaker}
                </span>
              )}
              {line.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
