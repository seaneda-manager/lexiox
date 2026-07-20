"use client";

import React, { useEffect, useMemo, useState } from "react";

type Word = {
  id: string;
  text: string;
  meanings_ko?: string[];
};

type PrescreenResult = {
  knownWordIds: string[];
  unknownWordIds: string[];
};

function safeWords(v: any): Word[] {
  return Array.isArray(v) ? (v as Word[]).filter(Boolean) : [];
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span style={{ color: "#5DCAA5" }}>어휘 확인</span>
        <span>
          <span className="font-bold" style={{ color: "#EF9F27" }}>{current}</span>
          <span className="mx-0.5" style={{ color: "#2d6652" }}>/</span>
          <span style={{ color: "#4da88a" }}>{total}</span>
        </span>
      </div>
      <div className="h-3 w-full rounded-full overflow-hidden" style={{ background: "#153229" }}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%`, background: "#5DCAA5" }}
        />
      </div>
    </div>
  );
}

export default function PrescreenBoard({
  words,
  onFinish,
}: {
  words: Word[];
  onFinish: (r: PrescreenResult) => void;
}) {
  const list = useMemo(() => safeWords(words), [words]);

  const [i, setI] = useState(0);
  const [known, setKnown] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<string[]>([]);
  const [animKey, setAnimKey] = useState(0);

  const cur = list[i] ?? null;
  const total = list.length;

  const commit = (isKnown: boolean) => {
    if (!cur?.id) return;
    const id = cur.id;

    if (isKnown) setKnown((prev) => (prev.includes(id) ? prev : [...prev, id]));
    else setUnknown((prev) => (prev.includes(id) ? prev : [...prev, id]));

    const nextIndex = i + 1;
    if (nextIndex >= total) {
      const knownIds = isKnown ? (known.includes(id) ? known : [...known, id]) : known;
      const unknownIds = !isKnown ? (unknown.includes(id) ? unknown : [...unknown, id]) : unknown;
      onFinish({ knownWordIds: knownIds, unknownWordIds: unknownIds });
      return;
    }

    setAnimKey((k) => k + 1);
    setI(nextIndex);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "1" || e.key === "Enter") commit(true);
      if (e.key === "2") commit(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, cur?.id, total, known, unknown]);

  if (!list.length) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ background: "#1a3d30" }}>
        <div className="rounded-3xl p-8 text-center text-sm" style={{ background: "#22503f", border: "0.5px solid #2d6652", color: "#4da88a" }}>
          단어가 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen flex flex-col z-50" style={{ background: "#1a3d30" }}>
      <div
        className="flex-1 flex flex-col justify-center items-center px-6 py-8"
        key={animKey}
        style={{ animation: "lx-card-in 220ms cubic-bezier(0.22,1,0.36,1) both" }}
      >
        <div className="w-full max-w-sm flex flex-col gap-6">
        {/* 헤더 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold tracking-widest uppercase" style={{ color: "#5DCAA5" }}>
              LEXiOX
            </span>
            <span className="text-sm" style={{ color: "#2d6652" }}>·</span>
            <span className="text-sm font-semibold" style={{ color: "#4da88a" }}>어휘 확인</span>
          </div>
          <ProgressBar current={i + 1} total={total} />
        </div>

        {/* 단어 카드 */}
        <div
          className="rounded-3xl px-8 py-10 text-center space-y-4"
          style={{ background: "#22503f", border: "0.5px solid #2d6652", boxShadow: "0 4px 32px rgba(0,0,0,0.25)" }}
        >
          <p
            className="font-extrabold tracking-tight leading-tight break-words"
            style={{ fontSize: "clamp(36px,6cqi,72px)", color: "#E1F5EE" }}
          >
            {cur?.text ?? ""}
          </p>

          <div className="w-10 h-[2px] mx-auto rounded-full" style={{ background: "#5DCAA5", opacity: 0.5 }} />

          <p className="text-base font-semibold" style={{ color: "#4da88a" }}>
            이 단어를 알고 있나요?
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => commit(true)}
            className="w-full rounded-2xl font-bold text-lg py-5 transition-all duration-150 active:scale-[0.98]"
            style={{ background: "#5DCAA5", color: "#04342C" }}
          >
            알아요 <span className="ml-2 text-xs font-semibold" style={{ opacity: 0.5 }}>(1)</span>
          </button>
          <button
            type="button"
            onClick={() => commit(false)}
            className="w-full rounded-2xl font-bold text-lg py-5 transition-all duration-150 active:scale-[0.98]"
            style={{ background: "transparent", border: "1.5px solid #3d7a63", color: "#9FE1CB" }}
          >
            아직 몰라요 <span className="ml-2 text-xs font-semibold" style={{ opacity: 0.4 }}>(2)</span>
          </button>
        </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes lx-card-in {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
