"use client";

// 단어를 듣고 → 스펠링 + 뜻 둘 다 입력.
// TTS는 브라우저 내장 음성(즉시·무료). 정답 공개 시 예문도 함께 노출한다.

import { useCallback, useEffect, useRef, useState } from "react";
import GlossText from "./GlossText";
import type { DrillTask, ListenSpellMeaningSeed } from "./drill.types";

function normEn(s: string): string {
  return String(s ?? "").trim().toLowerCase().replace(/[^a-z'-]/g, "");
}

/** 한글 뜻 비교용: 공백/조사성 기호 제거 */
function normKo(s: string): string {
  return String(s ?? "").trim().toLowerCase().replace(/[\s.,~·/()]/g, "");
}

function meaningMatches(input: string, accepted: string[]): boolean {
  const a = normKo(input);
  if (!a) return false;
  for (const m of accepted ?? []) {
    // "경계하는, 방심하지 않는" 처럼 여러 뜻이 한 줄에 있는 경우까지 분해
    for (const part of String(m ?? "").split(/[,/·]/)) {
      const p = normKo(part);
      if (!p) continue;
      if (a === p || p.includes(a) || a.includes(p)) return true;
    }
  }
  return false;
}

export default function ListenSpellMeaningDrill({
  task,
  onDone,
}: {
  task: DrillTask;
  onDone: (isCorrect: boolean) => void;
}) {
  const seed = task.seed as ListenSpellMeaningSeed;
  const [spelling, setSpelling] = useState("");
  const [meaning, setMeaning] = useState("");
  const [checked, setChecked] = useState(false);
  const spellRef = useRef<HTMLInputElement | null>(null);

  const word = String(seed?.spoken ?? seed?.answerSpelling ?? "");

  const speak = useCallback(() => {
    try {
      const synth = window.speechSynthesis;
      if (!synth || !word) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      u.rate = 0.9;
      synth.speak(u);
    } catch {
      /* 음성 미지원 환경은 조용히 무시 */
    }
  }, [word]);

  // 문항이 뜨면 자동 1회 재생 + 입력 포커스
  useEffect(() => {
    speak();
    spellRef.current?.focus();
  }, [speak]);

  if (!word) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
        이 문항을 표시할 수 없어요.
        <button
          className="mt-3 w-full rounded-xl bg-white py-2 text-sm font-semibold text-black"
          onClick={() => onDone(false)}
          type="button"
        >
          건너뛰기
        </button>
      </div>
    );
  }

  const spellOk = normEn(spelling) === normEn(seed.answerSpelling ?? word);
  const meaningOk = meaningMatches(meaning, seed.acceptedMeaningsKo ?? []);
  const bothOk = spellOk && meaningOk;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (checked) return;
    setChecked(true);
    window.setTimeout(() => onDone(bothOk), 1600);
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6">
        <button
          type="button"
          onClick={speak}
          aria-label="단어 다시 듣기"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
        >
          <span className="text-2xl">🔊</span>
        </button>
        <p className="text-sm text-white/60">듣고 스펠링과 뜻을 쓰세요</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          ref={spellRef}
          value={spelling}
          onChange={(e) => setSpelling(e.target.value)}
          disabled={checked}
          placeholder="스펠링"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className={[
            "w-full rounded-xl border bg-black/40 px-4 py-3 text-base text-white outline-none",
            checked
              ? spellOk
                ? "border-emerald-400/60"
                : "border-rose-400/60"
              : "border-white/15 focus:border-white/50",
          ].join(" ")}
        />
        <input
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          disabled={checked}
          placeholder="뜻 (한국어)"
          autoComplete="off"
          className={[
            "w-full rounded-xl border bg-black/40 px-4 py-3 text-base text-white outline-none",
            checked
              ? meaningOk
                ? "border-emerald-400/60"
                : "border-rose-400/60"
              : "border-white/15 focus:border-white/50",
          ].join(" ")}
        />

        {!checked && (
          <button
            type="submit"
            disabled={!spelling.trim() && !meaning.trim()}
            className="w-full rounded-xl bg-white py-3 text-sm font-semibold text-black disabled:opacity-40"
          >
            확인
          </button>
        )}
      </form>

      {checked && (
        <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-lg font-semibold text-white">
            {seed.answerSpelling ?? word}
            {!spellOk && <span className="ml-2 text-sm font-normal text-rose-300">스펠링 오답</span>}
          </p>
          <p className="text-sm text-emerald-300">{(seed.acceptedMeaningsKo ?? []).join(" · ")}</p>
          {seed.example_en && (
            <p className="border-t border-white/10 pt-2 text-sm leading-7 text-white/70">
              <GlossText text={seed.example_en} gloss={seed.gloss} />
            </p>
          )}
        </div>
      )}
    </div>
  );
}
