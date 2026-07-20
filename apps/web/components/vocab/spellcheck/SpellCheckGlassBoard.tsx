"use client";

import React, { useEffect, useMemo } from "react";
import Image from "next/image";

type AnyProps = Record<string, any>;

function pickFirst<T>(...candidates: any[]): T | null {
  for (const c of candidates) if (c !== undefined && c !== null) return c as T;
  return null;
}

function safeCall(fn: any, argSets: any[][]) {
  if (typeof fn !== "function") return false;
  for (const args of argSets) {
    try {
      fn(...args);
      return true;
    } catch {}
  }
  return false;
}

function getWordText(word: any) {
  return String(word?.text ?? word?.lemma ?? word?.target ?? word ?? "").trim();
}

export default function SpellCheckGlassBoard(props: AnyProps) {
  // ✅ put this file at: apps/web/public/lingox/ui/spellcheck.png
  const BG_SRC = "/lingox/ui/spellcheck.png";

  const wordObj =
    pickFirst<any>(
      props.word,
      props.currentWord,
      props.item,
      props.question?.word,
      props.question,
    ) ?? null;

  const index =
    pickFirst<number>(props.index, props.currentIndex, props.i, props.progressIndex) ?? 0;

  const total =
    pickFirst<number>(props.total, props.count, props.totalCount, props.progressTotal) ?? 0;

  const progressText = total && total > 0 ? `${index + 1} / ${total}` : "";

  // callbacks (super tolerant)
  const onSubmit =
    props.onSubmit ??
    props.onNext ??
    props.onContinue ??
    props.onAnswer ??
    props.onSelect ??
    null;

  const onAccent =
    props.onAccent ?? props.onVoice ?? props.onDialect ?? null; // (optional)

  // values
  const wordText = useMemo(() => getWordText(wordObj), [wordObj]);
  const accent = pickFirst<string>(props.accent, props.voice, props.dialect) ?? "US";

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") safeCall(onSubmit, [[{ word: wordText }], [wordText], []]);
      if (e.key.toLowerCase() === "u") safeCall(onAccent, [["US"], [{ accent: "US" }]]);
      if (e.key.toLowerCase() === "k") safeCall(onAccent, [["UK"], [{ accent: "UK" }]]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSubmit, onAccent, wordText]);

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#dbe8f5] p-4">
      {/* Keep original ratio (1536x1024 => 3:2) */}
      <div
        className="relative w-[min(94vw,1200px)] overflow-hidden rounded-[28px] shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
        style={{ aspectRatio: "3 / 2" }}
      >
        <Image
          src={BG_SRC}
          alt="LingoX SpellCheck"
          fill
          priority
          sizes="(max-width: 768px) 94vw, 1200px"
          className="object-cover select-none"
        />

        {/* Progress (top-left) */}
        {progressText ? (
          <div className="absolute left-[5.2%] top-[6.4%] text-[14px] sm:text-[16px] font-bold text-slate-700 tabular-nums">
            {progressText}
          </div>
        ) : null}

        {/* Accent click areas (top-right flags) */}
        <button
          type="button"
          aria-label="US Accent"
          onClick={() => safeCall(onAccent, [["US"], [{ accent: "US" }]])}
          className="absolute right-[14.2%] top-[7%] h-[7%] w-[8%] rounded-[14px] bg-transparent focus:outline-none focus:ring-2 focus:ring-white/70"
        />
        <button
          type="button"
          aria-label="UK Accent"
          onClick={() => safeCall(onAccent, [["UK"], [{ accent: "UK" }]])}
          className="absolute right-[5.2%] top-[7%] h-[7%] w-[8%] rounded-[14px] bg-transparent focus:outline-none focus:ring-2 focus:ring-white/70"
        />

        {/* ==============================
           5 Glass Forms (overlay only)
           - WORD (1)
           - MEANING (2)
           - SYN (2)
        ============================== */}

        {/* 1) WORD (big center) */}
        <div className="glass wordBox">
          <input
            value={pickFirst<string>(props.wordInput, props.value, props.spelling) ?? ""}
            onChange={(e) => safeCall(props.onWordChange ?? props.onChange, [[e.target.value], [e]])}
            placeholder=""
            className="glassInput wordInput"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
          />
        </div>

        {/* 2) MEANING left */}
        <div className="glass meaningLeft">
          <input
            value={pickFirst<string>(props.meaningA, props.meaningLeft) ?? ""}
            onChange={(e) =>
              safeCall(props.onMeaningAChange ?? props.onMeaningLeftChange, [[e.target.value], [e]])
            }
            placeholder=""
            className="glassInput meaningInput"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* 3) MEANING right */}
        <div className="glass meaningRight">
          <input
            value={pickFirst<string>(props.meaningB, props.meaningRight) ?? ""}
            onChange={(e) =>
              safeCall(
                props.onMeaningBChange ?? props.onMeaningRightChange,
                [[e.target.value], [e]],
              )
            }
            placeholder=""
            className="glassInput meaningInput"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* 4) SYN left (bigger + lower + spaced) */}
        <div className="glass synLeft">
          <input
            value={pickFirst<string>(props.synA, props.synLeft) ?? ""}
            onChange={(e) => safeCall(props.onSynAChange ?? props.onSynLeftChange, [[e.target.value], [e]])}
            placeholder=""
            className="glassInput synInput"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* 5) SYN right */}
        <div className="glass synRight">
          <input
            value={pickFirst<string>(props.synB, props.synRight) ?? ""}
            onChange={(e) => safeCall(props.onSynBChange ?? props.onSynRightChange, [[e.target.value], [e]])}
            placeholder=""
            className="glassInput synInput"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {/* Next button click area (image button) */}
        <button
          type="button"
          aria-label="Next"
          onClick={() =>
            safeCall(onSubmit, [
              [{ word: wordText, accent }],
              [wordText],
              [],
            ])
          }
          className="absolute left-1/2 top-[72%] -translate-x-1/2 h-[10%] w-[26%] rounded-full bg-transparent focus:outline-none focus:ring-2 focus:ring-white/70"
        />

        {/* ===== styles (scoped) ===== */}
        <style jsx>{`
          .glass {
            position: absolute;
            background: rgba(255, 255, 255, 0.18);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.38);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.10);
          }

          .glassInput {
            width: 100%;
            height: 100%;
            background: transparent;
            outline: none;
            border: 0;
            text-align: center;
          }

          /* Desktop-ish coordinates (3:2) */
          .wordBox {
            left: 50%;
            top: 36%;
            transform: translateX(-50%);
            width: 52%;
            height: 12%;
            border-radius: 24px;
          }
          .meaningLeft {
            left: 22%;
            top: 50%;
            width: 30%;
            height: 10%;
            border-radius: 20px;
          }
          .meaningRight {
            right: 22%;
            top: 50%;
            width: 30%;
            height: 10%;
            border-radius: 20px;
          }

          /* Syn: bigger + more spacing (your request) */
          .synLeft {
            left: 25%;
            top: 64%;
            width: 26%;
            height: 8.5%;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.15);
          }
          .synRight {
            right: 25%;
            top: 64%;
            width: 26%;
            height: 8.5%;
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.15);
          }

          /* Typography */
          .wordInput {
            font-weight: 900;
            letter-spacing: -0.02em;
            color: rgb(30, 41, 59);
            font-size: clamp(28px, 3.2vw, 48px);
          }
          .meaningInput {
            font-weight: 700;
            color: rgba(51, 65, 85, 0.95);
            font-size: clamp(16px, 1.7vw, 26px);
          }
          .synInput {
            font-weight: 700;
            color: rgba(71, 85, 105, 0.95);
            font-size: clamp(14px, 1.35vw, 20px);
          }

          /* Mobile-ish tweak */
          @media (max-width: 640px) {
            .wordBox {
              width: 78%;
              height: 12.5%;
              top: 38%;
            }
            .meaningLeft,
            .meaningRight {
              width: 36%;
              height: 10%;
              top: 52%;
            }
            .meaningLeft {
              left: 10%;
            }
            .meaningRight {
              right: 10%;
            }
            .synLeft,
            .synRight {
              width: 34%;
              height: 9%;
              top: 66%;
            }
            .synLeft {
              left: 12%;
            }
            .synRight {
              right: 12%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
