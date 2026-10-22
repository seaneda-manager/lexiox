"use client";

import React, { useMemo } from "react";
import {
  buildHint,
  hintLabel,
  type SpellingHintMode,
} from "@/lib/vocab/spellingHint";

type Props = {
  answer: string;
  mode?: SpellingHintMode;
  /** 오답 후 추가로 공개할 글자 수 (full 모드) */
  extraReveal?: number;
  className?: string;
};

/**
 * 정답 힌트 표시: `h _ _ _   o _ _`
 * 구는 단어 사이를 넓게 띄워 몇 단어인지 한눈에 보이게 한다.
 */
export default function SpellingHint({
  answer,
  mode = "full",
  extraReveal = 0,
  className = "",
}: Props) {
  const words = useMemo(
    () => buildHint(answer, mode, extraReveal),
    [answer, mode, extraReveal],
  );

  if (!words.length) return null;

  return (
    <div
      className={`flex flex-wrap items-end justify-center gap-x-8 gap-y-3 ${className}`}
      role="img"
      aria-label={hintLabel(answer, mode)}
    >
      {words.map((w, wi) => (
        <div key={wi} className="flex items-end gap-1.5">
          {w.map((t, ti) => {
            if (t.kind === "fixed") {
              return (
                <span
                  key={ti}
                  className="font-extrabold text-slate-800 leading-none"
                  style={{ fontSize: "clamp(24px, 4cqi, 40px)", minWidth: "0.6em", textAlign: "center" }}
                >
                  {t.char}
                </span>
              );
            }
            if (t.kind === "blank" && t.revealed) {
              return (
                <span
                  key={ti}
                  className="font-extrabold text-[#0F766E] leading-none"
                  style={{ fontSize: "clamp(24px, 4cqi, 40px)", minWidth: "0.6em", textAlign: "center" }}
                >
                  {t.char}
                </span>
              );
            }
            return (
              <span
                key={ti}
                className="inline-block rounded-full bg-slate-300"
                style={{ width: "0.9em", height: "3px", fontSize: "clamp(18px, 3cqi, 30px)" }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
