// ⚠️ Reserved for Vocab Learning V2 (Session-based Runner)
// Not used in current flow

"use client";

import { useEffect, useState } from "react";
import type {
  VocabWordCore,
  VocabSessionState,
  RecallItem,
} from "@/models/vocab";

const STORAGE_KEY = "lingox_vocab_session";

type Props = {
  words: VocabWordCore[];
  finishHref?: string;
};

export default function LearningLayout3Col({ words, finishHref }: Props) {
  const [session, setSession] = useState<VocabSessionState | null>(null);
  const [currentWord, setCurrentWord] = useState<VocabWordCore | null>(null);
  const [history, setHistory] = useState<VocabWordCore[]>([]);
  const [perk, setPerk] = useState(0);
  const [showMini, setShowMini] = useState(false);

  /* ===============================
     Load session
  =============================== */
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    setSession(JSON.parse(raw));
  }, []);

  /* ===============================
     Pick next word
  =============================== */
  useEffect(() => {
    if (!session) return;

    const nextId = getNextWordId(session);
    const word = words.find((w) => w.id === nextId) ?? null;

    setCurrentWord(word);
    setShowMini(false); // 🔑 reset mini challenge per word

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session, words]);

  /* ===============================
     Go next
  =============================== */
  function goNext() {
    if (!session || !currentWord) return;

    setHistory((prev) => [currentWord, ...prev].slice(0, 4));

    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
      };
    });
  }

  /* ===============================
     Finished
  =============================== */
  if (!session) {
    return <div className="text-sm text-gray-500">Loading session…</div>;
  }

  if (!currentWord) {
    return (
      <div className="rounded-2xl border bg-emerald-50 p-8 text-center">
        <p className="text-lg font-semibold">🎉 학습 완료</p>
        <p className="mt-2 text-sm">Perk 획득: {perk}</p>
        <a
          href={finishHref ?? "/"}
          className="mt-4 inline-block rounded-xl bg-emerald-600 px-4 py-2 text-white"
        >
          다음 단계
        </a>
      </div>
    );
  }

  /* ===============================
     Render
  =============================== */
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {/* LEFT */}
      <aside className="rounded-2xl border bg-gray-50 p-4 text-xs">
        <h3 className="mb-2 font-semibold">⏪ 이전 단어</h3>
        {history.length === 0 ? (
          <p className="text-gray-400">없음</p>
        ) : (
          <ul className="space-y-1">
            {history.map((w) => (
              <li key={w.id} className="rounded bg-white px-2 py-1">
                {w.text}
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* CENTER */}
      <main className="rounded-2xl border bg-white p-8 text-center">
        {/* Visual */}
        <div className="mb-6 flex h-36 items-center justify-center rounded-xl border border-dashed text-xs text-gray-400">
          (Visual / Concept Area)
        </div>

        <h1 className="text-4xl font-bold">{currentWord.text}</h1>

        {currentWord.pos && (
          <p className="mt-1 text-xs text-gray-500">{currentWord.pos}</p>
        )}

        {currentWord.meanings_ko?.length > 0 && (
          <p className="mt-4 text-lg">
            {currentWord.meanings_ko.join(", ")}
          </p>
        )}

        {/* 🔑 Mini Challenge Toggle */}
        <button
          onClick={() => setShowMini(true)}
          className="mt-4 text-xs text-emerald-600 underline"
        >
          🔍 미니 챌린지 (선택)
        </button>

        {/* 🔥 ALWAYS MOUNTED */}
        <div className="mt-4">
          <MiniChallenge
            word={currentWord}
            visible={showMini}
            onCorrect={() => {
              setPerk((p) => p + 1);
              setShowMini(false);
            }}
            onSkip={() => setShowMini(false)}
          />
        </div>

        <button
          onClick={goNext}
          className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-white"
        >
          다음 →
        </button>
      </main>

      {/* RIGHT */}
      <aside className="rounded-2xl border bg-white p-4 text-xs">
        <h3 className="mb-2 font-semibold">📊 진행</h3>
        <p>
          {session.currentIndex + 1} / {session.todayWordIds.length}
        </p>
        <p className="mt-1">Perk: {perk}</p>
      </aside>
    </div>
  );
}

/* ===============================
   Mini Challenge (NON-BLOCKING)
=============================== */
function MiniChallenge({
  word,
  visible,
  onCorrect,
  onSkip,
}: {
  word: VocabWordCore;
  visible: boolean;
  onCorrect: () => void;
  onSkip: () => void;
}) {
  if (!visible) return null;

  const correct = word.meanings_ko?.[0] ?? "";
  const pool = ["증가하다", "줄이다", "옮기다", "숨기다"];

  const choices = shuffle([
    correct,
    ...pool.filter((p) => p !== correct).slice(0, 3),
  ]);

  return (
    <div className="rounded-xl border bg-gray-50 p-4 text-left">
      <p className="mb-2 text-sm font-semibold">
        가장 가까운 의미는?
      </p>
      <div className="space-y-2">
        {choices.map((c) => (
          <button
            key={c}
            onClick={() => (c === correct ? onCorrect() : onSkip())}
            className="w-full rounded-lg border bg-white px-3 py-2 hover:bg-emerald-50"
          >
            {c}
          </button>
        ))}
      </div>
      <button
        onClick={onSkip}
        className="mt-2 text-xs text-gray-500 underline"
      >
        건너뛰기
      </button>
    </div>
  );
}

/* ===============================
   Helpers
=============================== */
function getNextWordId(session: VocabSessionState): string | null {
  if (session.currentIndex < session.todayWordIds.length) {
    return session.todayWordIds[session.currentIndex];
  }
  if (session.recallQueue.length > 0) {
    return session.recallQueue[0].wordId;
  }
  return null;
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}
