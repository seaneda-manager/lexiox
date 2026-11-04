"use client";

import React, { useState, useRef, useEffect } from "react";

type TextFlashcardProps = {
  wordId: string;
  word: string;
  pos: string;
  meanings: string[];
  onComplete: (points: number) => void;
  /**
   * 주어지면: 완료 화면에 "다음 단어" 버튼을 보여주고(맞히면 잠깐 뒤 자동으로 넘어감),
   * 그걸 눌렀을 때만 부모가 다음 단어로 넘어간다. onComplete 는 점수 전달용.
   * 없으면 예전 동작 그대로 — 부모가 onComplete 에서 바로 다음 단어로 넘긴다.
   */
  onNext?: () => void;
  nextLabel?: string;
  /** true 면 철자와 함께 뜻(한글)도 써야 맞는 것으로 친다 (단어 깜지). 읽기 게임 등은 false */
  requireMeaning?: boolean;
};

type Attempt = { word: string; meaning: string; wordOk: boolean; meaningOk: boolean };

// 띄어쓰기·문장부호는 무시하고 비교
const norm = (s: string) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[\s,;·/.\-~()[\]{}'"`!?]/g, "");

/**
 * 깜지(3번 쓰기) 학습기.
 * - 철자 + 뜻을 함께 쓴다 (requireMeaning).
 * - 한 화면에 다 들어오도록 높이 기준(vh)으로 글씨 크기를 잡는다.
 * - 단어마다 "시작하기"를 누르게 하지 않고, 단어가 나오면 바로 입력한다.
 */
export function TextFlashcard({
  wordId,
  word,
  meanings,
  onComplete,
  onNext,
  nextLabel = "다음 단어 →",
  requireMeaning = false,
}: TextFlashcardProps) {
  const [stage, setStage] = useState<"attempt" | "complete">("attempt");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [currentWord, setCurrentWord] = useState("");
  const [currentMeaning, setCurrentMeaning] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const wordRef = useRef<HTMLInputElement>(null);
  const meaningRef = useRef<HTMLInputElement>(null);

  const cleanMeanings = (meanings ?? []).map((m) => String(m ?? "").trim()).filter(Boolean);
  const meaningDisplay = cleanMeanings.slice(0, 2).join(", ");

  // 뜻 정답 후보 — 학생이 "핵심 뜻"만 써도 맞게 한다.
  //  예) "(사실이라고) 추정하다[생각하다], (책임·임무 등을) 떠맡다"
  //      → 통째로, "추정하다", "생각하다", "떠맡다" 어느 것을 써도 정답
  const meaningCandidates = (() => {
    const out = new Set<string>();
    const stripNotes = (s: string) => s.replace(/\([^)]*\)|\[[^\]]*\]/g, " ");
    const add = (s: string) => {
      const n = norm(s);
      if (n) out.add(n);
    };
    for (const m of cleanMeanings) {
      add(m);
      add(stripNotes(m));
      // 괄호 설명을 걷어낸 뒤 쉼표/세미콜론/슬래시로 나눈 조각들
      for (const piece of stripNotes(m).split(/[,;/]/)) add(piece);
      // [생각하다] 처럼 대괄호 안에 든 동의 표현도 정답으로 인정
      for (const mm of m.matchAll(/\[([^\]]+)\]/g)) add(mm[1]);
    }
    add(meaningDisplay);
    add(stripNotes(meaningDisplay));
    return out;
  })();

  // 다음 단어로 넘어오면(같은 컴포넌트가 재사용돼도) 처음 상태로 — onNext 흐름에서만.
  // (onNext 가 없는 예전 흐름은 정답 직후 부모가 단어를 바꾸므로, 여기서 리셋하면 완료 화면이 바로 사라진다)
  useEffect(() => {
    if (!onNext) return;
    setStage("attempt");
    setAttempts([]);
    setCurrentWord("");
    setCurrentMeaning("");
    setIsCorrect(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordId]);

  useEffect(() => {
    if (stage === "attempt") wordRef.current?.focus();
  }, [stage, attempts.length, wordId]);

  const handleRetry = () => {
    setStage("attempt");
    setAttempts([]);
    setCurrentWord("");
    setCurrentMeaning("");
    setIsCorrect(false);
  };

  const blockClipboard = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "v" || e.key === "x")) {
      e.preventDefault();
      return true;
    }
    return false;
  };

  const canSubmit = currentWord.trim() !== "" && (!requireMeaning || currentMeaning.trim() !== "");

  const handleSubmitAttempt = () => {
    if (!canSubmit) return;
    const wordOk = currentWord.trim().toLowerCase() === word.toLowerCase();
    const meaningOk = !requireMeaning || meaningCandidates.has(norm(currentMeaning));
    const correct = wordOk && meaningOk;

    const newAttempts = [...attempts, { word: currentWord, meaning: currentMeaning, wordOk, meaningOk }];
    setAttempts(newAttempts);

    if (correct) {
      setIsCorrect(true);
      const points = 5 - Math.max(0, newAttempts.length - 1);
      onComplete(points);
      setStage("complete");
    } else if (newAttempts.length >= 3) {
      setStage("complete");
      onComplete(0);
    } else {
      setCurrentWord("");
      setCurrentMeaning("");
    }
  };

  const onWordKeyDown = (e: React.KeyboardEvent) => {
    if (blockClipboard(e)) return;
    if (e.key === "Enter") {
      e.preventDefault();
      if (requireMeaning) meaningRef.current?.focus();
      else handleSubmitAttempt();
    }
  };

  const onMeaningKeyDown = (e: React.KeyboardEvent) => {
    if (blockClipboard(e)) return;
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmitAttempt();
    }
  };

  const block = (e: React.SyntheticEvent) => e.preventDefault();

  // 완료 화면: 맞혔으면 잠깐 보여주고 자동으로 다음 단어로, Enter 로도 바로 넘어간다
  useEffect(() => {
    if (stage !== "complete" || !onNext) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    const timer = isCorrect ? window.setTimeout(() => onNext(), 1500) : null;
    return () => {
      window.removeEventListener("keydown", onKey);
      if (timer != null) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, isCorrect]);

  const bigWord = { fontSize: "clamp(36px, 8.5vh, 76px)" } as const;
  const bigInput = { fontSize: "clamp(22px, 4.6vh, 38px)" } as const;

  if (stage === "complete") {
    const last = attempts[attempts.length - 1];
    return (
      <div className="flex w-full flex-col items-center gap-3 text-center">
        {isCorrect ? (
          <>
            <p className="text-5xl">🎉</p>
            <p className="text-3xl font-extrabold text-emerald-700">완벽합니다!</p>
            <p className="text-lg text-slate-600">{attempts.length}회 시도 후 정답</p>
          </>
        ) : (
          <>
            <p className="text-5xl">❌</p>
            <p className="text-3xl font-extrabold text-red-700">3회 시도 완료</p>
          </>
        )}
        <div className="w-full rounded-2xl bg-slate-50 px-4 py-3">
          <p className="font-extrabold text-slate-900" style={{ fontSize: "clamp(28px, 6vh, 52px)" }}>
            {word}
          </p>
          {requireMeaning && <p className="mt-1 text-xl font-semibold text-slate-600">{meaningDisplay}</p>}
          {!isCorrect && last && (
            <p className="mt-2 text-sm text-slate-500">
              마지막 입력: {last.word || "(비어있음)"}
              {requireMeaning ? ` / ${last.meaning || "(비어있음)"}` : ""}
            </p>
          )}
        </div>

        {onNext ? (
          <div className="flex w-full flex-row flex-wrap items-center justify-center gap-3">
            <button
              onClick={onNext}
              className="min-w-[200px] rounded-full bg-emerald-600 px-10 py-3 text-lg font-bold text-white shadow-md shadow-emerald-900/15 transition hover:bg-emerald-700 active:scale-[0.97]"
            >
              {nextLabel}
            </button>
            {/* 맞혔는데 다시 하면 점수를 또 받을 수 있으므로, 못 맞힌 경우에만 다시 하기 */}
            {!isCorrect && (
              <button
                onClick={handleRetry}
                className="rounded-full border border-slate-300 bg-white px-7 py-3 text-lg font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                🔄 이 단어 다시 하기
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={handleRetry}
            className="mx-auto rounded-full bg-slate-600 px-10 py-3 text-lg font-bold text-white transition hover:bg-slate-700 active:scale-[0.97]"
          >
            🔄 다시 하기
          </button>
        )}
      </div>
    );
  }

  // ── 입력 단계 ─────────────────────────────────────────
  const n = attempts.length; // 0,1,2
  const wordHint = n === 0 ? word : n === 1 ? word[0] + "*".repeat(Math.max(0, word.length - 1)) : "• • •";
  const meaningHint =
    n === 0
      ? meaningDisplay
      : n === 1
        ? (meaningDisplay[0] ?? "") + "○".repeat(Math.min(8, Math.max(0, meaningDisplay.length - 1)))
        : "• • •";
  const label =
    n === 0
      ? "1/3 · 보고 그대로 쓰세요"
      : n === 1
        ? "2/3 · 첫 글자만 보여요"
        : "3/3 · 완전 암기!";
  const lastAttempt = attempts[attempts.length - 1];

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-lg font-bold text-slate-600">{label}</p>
        <div className="flex items-center gap-3">
          <p className="text-base font-semibold text-slate-500">시도 {n + 1}/3</p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`h-3 w-3 rounded-full ${i < n ? "bg-blue-600" : "bg-slate-300"}`} />
            ))}
          </div>
        </div>
      </div>

      {/* 보여주는 영역: 철자 + 뜻 */}
      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center">
        <p className="font-extrabold leading-tight tracking-wide text-slate-900 break-words" style={bigWord}>
          {wordHint}
        </p>
        {requireMeaning && (
          <p className="mt-1 text-2xl font-bold text-slate-600 break-words">{meaningHint}</p>
        )}
      </div>

      {/* 직전 시도가 틀렸다면 어디가 틀렸는지 */}
      {lastAttempt && (
        <p className="text-center text-base font-semibold text-rose-600">
          {!lastAttempt.wordOk && "철자가 달라요. "}
          {requireMeaning && !lastAttempt.meaningOk && "뜻이 달라요. "}
          다시 써 보세요!
        </p>
      )}

      {/* 입력: 철자 → (Enter) → 뜻 → (Enter) 확인 */}
      <div className="flex flex-col gap-2">
        <input
          ref={wordRef}
          type="text"
          value={currentWord}
          onChange={(e) => setCurrentWord(e.target.value)}
          onContextMenu={block}
          onKeyDown={onWordKeyDown}
          onDragStart={block}
          onPaste={block}
          placeholder="철자"
          className="w-full rounded-2xl border-2 border-slate-300 bg-white px-5 py-2.5 text-center font-bold text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
          style={bigInput}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
        />
        {requireMeaning && (
          <input
            ref={meaningRef}
            type="text"
            value={currentMeaning}
            onChange={(e) => setCurrentMeaning(e.target.value)}
            onContextMenu={block}
            onKeyDown={onMeaningKeyDown}
            onDragStart={block}
            onPaste={block}
            placeholder="뜻"
            className="w-full rounded-2xl border-2 border-slate-300 bg-white px-5 py-2.5 text-center font-bold text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
            style={bigInput}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
          />
        )}
        <p className="text-center text-sm text-slate-500">
          {requireMeaning ? "철자 입력 후 Enter → 뜻 입력 후 Enter로 확인" : "Enter로 확인"} · 복사·붙여넣기 불가
        </p>
      </div>

      <button
        onClick={handleSubmitAttempt}
        disabled={!canSubmit}
        className="mx-auto block min-w-[220px] rounded-full bg-blue-600 px-12 py-3 text-lg font-bold text-white shadow-md shadow-blue-900/15 transition hover:bg-blue-700 active:scale-[0.97] disabled:bg-slate-300 disabled:shadow-none"
      >
        ✓ 확인
      </button>
    </div>
  );
}
