// apps/web/components/vocab/learning/LearningSpeedGate.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LearningWord } from "./learning.types";

type Mode = "TYPE" | "MCQ";

type Props = {
  /**
   * ✅ learningWords(=unknown+failed)만 넣는 걸 추천.
   * allWords 전체를 넣고 싶으면 caller에서 그대로 넣어도 됨.
   */
  words: LearningWord[];

  /** 몇 문제만 할지 (기본 3문제) */
  limit?: number;

  /** TYPE(철자 타이핑) / MCQ(4지선다) */
  mode?: Mode;

  /** 정답 기준: meanings_ko[0]을 prompt로 사용 */
  onDone: (summary: { total: number; correct: number; wrongWordIds: string[] }) => void;
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function norm(s: string) {
  return s.trim().toLowerCase();
}

type MsgKind = "OK" | "WRONG" | null;

export default function LearningSpeedGate({
  words,
  limit = 3,
  mode = "TYPE",
  onDone,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const doneRef = useRef(false);

  const questions = useMemo(() => {
    const base = (words ?? []).filter((w) => w?.id && w?.text);
    if (base.length === 0) return [];
    const n = Math.max(1, Number.isFinite(limit) ? limit : 3);
    return shuffle(base).slice(0, n);
  }, [words, limit]);

  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [locked, setLocked] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [msg, setMsg] = useState<{ kind: MsgKind; text: string } | null>(null);

  const current = questions[idx];

  // 질문이 없으면 즉시 종료 (중복 호출 방지)
  useEffect(() => {
    doneRef.current = false; // questions 바뀌면 다시 가능
    if (questions.length === 0 && !doneRef.current) {
      doneRef.current = true;
      onDone({ total: 0, correct: 0, wrongWordIds: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);

  // 매 문제마다 입력/메시지 초기화 + 포커스
  useEffect(() => {
    setValue("");
    setMsg(null);
    setLocked(false);
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [idx]);

  function finish(finalCorrect: number, finalWrongIds: string[]) {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone({ total: questions.length, correct: finalCorrect, wrongWordIds: finalWrongIds });
  }

  function goNext(nextCorrect?: number, nextWrongIds?: string[]) {
    const next = idx + 1;
    if (next >= questions.length) {
      finish(nextCorrect ?? correct, nextWrongIds ?? wrongIds);
      return;
    }
    setIdx(next);
  }

  function checkTyped() {
    if (!current || locked) return;
    setLocked(true);

    const ok = norm(value) === norm(current.text);

    if (ok) {
      setCorrect((c) => {
        const nc = c + 1;
        setMsg({ kind: "OK", text: "Correct" });
        setTimeout(() => goNext(nc, wrongIds), 300);
        return nc;
      });
      return;
    }

    const wid = current.id;
    setWrongIds((prev) => {
      const nw = prev.includes(wid) ? prev : [...prev, wid];
      setMsg({ kind: "WRONG", text: `Wrong · Answer: ${current.text}` });
      setTimeout(() => goNext(correct, nw), 650);
      return nw;
    });
  }

  const mcqChoices = useMemo(() => {
    if (!current) return [];
    // 오답은 현재 questions 안에서 text를 섞는 방식(안전)
    const pool = questions.map((q) => q.text).filter(Boolean);
    const distractors = shuffle(pool.filter((t) => norm(t) !== norm(current.text))).slice(0, 3);
    const all = shuffle([current.text, ...distractors]);
    return Array.from(new Set(all));
  }, [current, questions]);

  // ✅ 공통 패널 클래스: "StageFrame/StageScaffold가 크기를 결정" → 여기선 감옥 금지
  const panelClass =
    "w-full space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm";

  if (!current) {
    return (
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">
        Speed check 준비 중…
      </div>
    );
  }

  const prompt = current.meanings_ko?.[0] ?? "(no meaning)";

  const msgClass =
    msg?.kind === "OK"
      ? "text-emerald-600"
      : msg?.kind === "WRONG"
        ? "text-rose-600"
        : "text-slate-400";

  return (
    <div className={panelClass}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-700">Quick Check</div>
        <div className="text-xs text-slate-500">
          {idx + 1}/{questions.length}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold text-slate-500">Meaning</div>
        <div className="mt-1 text-lg font-semibold text-slate-900">{prompt}</div>
      </div>

      {mode === "TYPE" ? (
        <>
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                checkTyped();
              }
            }}
            placeholder="Type the word…"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <div className="flex items-center justify-between text-xs text-slate-500">
            {msg ? <div className={`font-semibold ${msgClass}`}>{msg.text}</div> : <div />}
            <div>Score: {correct}</div>
          </div>

          <button
            onClick={checkTyped}
            disabled={locked || value.trim().length === 0}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            Check
          </button>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2">
            {mcqChoices.map((c) => (
              <button
                key={c}
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  setLocked(true);

                  const ok = norm(c) === norm(current.text);
                  if (ok) {
                    setCorrect((x) => {
                      const nx = x + 1;
                      setMsg({ kind: "OK", text: "Correct" });
                      setTimeout(() => goNext(nx, wrongIds), 300);
                      return nx;
                    });
                    return;
                  }

                  const wid = current.id;
                  setWrongIds((prev) => {
                    const nw = prev.includes(wid) ? prev : [...prev, wid];
                    setMsg({ kind: "WRONG", text: `Wrong · Answer: ${current.text}` });
                    setTimeout(() => goNext(correct, nw), 650);
                    return nw;
                  });
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm text-slate-900 hover:bg-slate-100 disabled:opacity-50"
              >
                {c}
              </button>
            ))}
          </div>

          {msg ? <div className={`text-xs font-semibold ${msgClass}`}>{msg.text}</div> : null}

          <div className="text-xs text-slate-500">Score: {correct}</div>
        </>
      )}
    </div>
  );
}
