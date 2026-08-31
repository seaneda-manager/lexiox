"use client";

import { useEffect, useState } from "react";
import type { BoardSegmentContent, BoardLine } from "@/models/grammar/types";

type Props = {
  content: BoardSegmentContent;
  /** true면 라인을 순차 타이핑 애니메이션, false면 즉시 전부 표시(지난 세그먼트) */
  animate?: boolean;
  /** 전체 애니메이션 목표 시간(ms) — 보통 내레이션 오디오 길이. 없으면 라인당 고정 */
  totalMs?: number;
};

function renderLine(line: BoardLine, revealChars: number) {
  const text = line.text;
  const shown = revealChars >= text.length ? text : text.slice(0, Math.max(0, revealChars));
  const done = revealChars >= text.length;

  if (!done || !line.emphasis || line.emphasis.length === 0) {
    return <span>{shown}</span>;
  }

  // 타이핑 완료 후에만 emphasis 적용
  const marks = [...line.emphasis].sort((a, b) => a.from - b.from);
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  marks.forEach((m, i) => {
    const from = Math.max(0, Math.min(m.from, text.length));
    const to = Math.max(from, Math.min(m.to, text.length));
    if (from > cursor) parts.push(<span key={`p${i}`}>{text.slice(cursor, from)}</span>);
    const seg = text.slice(from, to);
    if (m.kind === "highlight") {
      parts.push(
        <span key={`m${i}`} className="rounded bg-yellow-200/80 px-0.5 box-decoration-clone">
          {seg}
        </span>
      );
    } else if (m.kind === "circle") {
      parts.push(
        <span
          key={`m${i}`}
          className="mx-0.5 inline-block rounded-[50%] border-2 border-rose-500 px-1.5 leading-tight text-rose-700"
        >
          {seg}
        </span>
      );
    } else {
      parts.push(
        <span key={`m${i}`} className="underline decoration-2 decoration-sky-500 underline-offset-4">
          {seg}
        </span>
      );
    }
    cursor = to;
  });
  if (cursor < text.length) parts.push(<span key="tail">{text.slice(cursor)}</span>);
  return <>{parts}</>;
}

export default function BoardSegment({ content, animate = true, totalMs }: Props) {
  const lines = content.lines ?? [];
  const totalChars = lines.reduce((n, l) => n + l.text.length, 0) || 1;

  // 라인별 노출 글자 수
  const [progress, setProgress] = useState<number>(animate ? 0 : totalChars);

  useEffect(() => {
    if (!animate) {
      setProgress(totalChars);
      return;
    }
    setProgress(0);
    const durationMs = Math.max(1200, Math.min(totalMs ?? totalChars * 45, 20000));
    const stepMs = 40;
    const perStep = Math.max(1, Math.round((totalChars / durationMs) * stepMs));
    const id = window.setInterval(() => {
      setProgress((p) => {
        const next = p + perStep;
        if (next >= totalChars) {
          window.clearInterval(id);
          return totalChars;
        }
        return next;
      });
    }, stepMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, animate, totalMs]);

  let consumed = 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      {content.title && (
        <div className="mb-2 text-sm font-bold text-slate-500">{content.title}</div>
      )}
      <div className="space-y-2 font-mono text-[15px] leading-relaxed text-slate-900 sm:text-base">
        {lines.map((line, i) => {
          const start = consumed;
          consumed += line.text.length;
          const revealChars = Math.max(0, progress - start);
          const visible = revealChars > 0 || (i === 0 && progress === 0);
          return (
            <div key={i} className={visible ? "" : "opacity-0"}>
              {renderLine(line, revealChars)}
              {revealChars > 0 && revealChars < line.text.length && (
                <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-slate-400 align-middle" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
