"use client";

// 영어 텍스트 안의 내용어에 뜻 툴팁을 붙인다.
// - 데스크톱: hover / 모바일: 탭
// - gloss 에 없는 단어는 그냥 평범한 텍스트로 지나간다 (기능어 등)

import { useState } from "react";
import type { GlossMap } from "./drill.types";

function keyOf(token: string): string {
  return token.toLowerCase().replace(/[^a-z'-]/g, "");
}

export default function GlossText({
  text,
  gloss,
  className,
}: {
  text: string;
  gloss?: GlossMap;
  className?: string;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const tokens = String(text ?? "").split(/(\s+)/);

  return (
    <span className={className}>
      {tokens.map((tok, i) => {
        const g = gloss?.[keyOf(tok)];
        if (!g || !tok.trim()) return <span key={i}>{tok}</span>;

        const open = openIdx === i;
        return (
          <span
            key={i}
            className="group relative inline-block"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIdx(open ? null : i);
            }}
          >
            <span className="cursor-help border-b border-dotted border-current/60">{tok}</span>
            <span
              className={[
                "pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap",
                "rounded-lg border border-white/15 bg-neutral-900 px-3 py-1.5 shadow-lg transition-opacity",
                "group-hover:opacity-100",
                open ? "opacity-100" : "opacity-0",
              ].join(" ")}
            >
              <span className="block text-[13px] font-semibold text-white">
                {tok.replace(/[^A-Za-z'-]/g, "")}
                {g.pos && <span className="ml-1.5 text-[11px] font-normal text-white/50">{g.pos}</span>}
              </span>
              <span className="block text-[13px] text-emerald-300">{g.ko}</span>
            </span>
          </span>
        );
      })}
    </span>
  );
}
