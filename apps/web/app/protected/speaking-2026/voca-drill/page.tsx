// apps/web/app/(protected)/speaking-2026/voca-drill/page.tsx
"use client";

import { useMemo, useState } from "react";
import { demoVocabWords } from "@/models/vocab-demo";
import type { VocabWordCore } from "@/models/vocab";

type Phase = "PREVIEW" | "PROMPT" | "SCRIPT" | "SUMMARY";

const PHASE_ORDER: Phase[] = ["PREVIEW", "PROMPT", "SCRIPT", "SUMMARY"];

export default function SpeakingVocaDrillPage() {
  const [phase, setPhase] = useState<Phase>("PREVIEW");

  // 데모용: 오늘 단어 3개 정도만 Speaking에 연결
  const todayWords: VocabWordCore[] = useMemo(
    () => demoVocabWords.slice(0, 3),
    [],
  );

  const goNextPhase = () => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < 0 || idx === PHASE_ORDER.length - 1) return;
    setPhase(PHASE_ORDER[idx + 1]);
  };

  const goPrevPhase = () => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx <= 0) return;
    setPhase(PHASE_ORDER[idx - 1]);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
      {/* 헤더 */}
      <header className="space-y-1">
        <h1 className="text-xl font-bold">
          Speaking – Voca 기반 Task 1 Drill
        </h1>
        <p className="text-xs text-gray-500">
          오늘 단어를 실제 TOEFL Speaking Task 1 스타일 답변에
          연결하는 연습 흐름입니다.
        </p>
      </header>

      {/* 단계 인디케이터 */}
      <SpeakingPhaseIndicator current={phase} />

      {/* 본문 섹션 */}
      {phase === "PREVIEW" && (
        <SpeakingPreviewSection
          words={todayWords}
          onNext={goNextPhase}
        />
      )}

      {phase === "PROMPT" && (
        <SpeakingPromptSection
          words={todayWords}
          onNext={goNextPhase}
          onPrev={goPrevPhase}
        />
      )}

      {phase === "SCRIPT" && (
        <SpeakingScriptSection
          words={todayWords}
          onNext={goNextPhase}
          onPrev={goPrevPhase}
        />
      )}

      {phase === "SUMMARY" && (
        <SpeakingSummarySection
          words={todayWords}
          onPrev={goPrevPhase}
        />
      )}
    </main>
  );
}

// ─────────────────────────────
// 상단 단계 표시 (A / B / C / D)
// ─────────────────────────────

type SpeakingPhaseIndicatorProps = {
  current: Phase;
};

function SpeakingPhaseIndicator({ current }: SpeakingPhaseIndicatorProps) {
  const steps: { phase: Phase; label: string; desc: string }[] = [
    {
      phase: "PREVIEW",
      label: "A. Voca",
      desc: "오늘 단어 훑어보기",
    },
    {
      phase: "PROMPT",
      label: "B. Prompt",
      desc: "Task 1 질문 확인",
    },
    {
      phase: "SCRIPT",
      label: "C. Script",
      desc: "답변 문장 만들기",
    },
    {
      phase: "SUMMARY",
      label: "완료",
      desc: "오늘 Speaking 정리",
    },
  ];

  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {steps.map((step, idx) => {
        const isActive = step.phase === current;
        const isDone =
          PHASE_ORDER.indexOf(step.phase) < PHASE_ORDER.indexOf(current);

        return (
          <li key={step.phase} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 rounded-full border px-3 py-1 ${
                isActive
                  ? "border-indigo-500 bg-indigo-50 text-indigo-800"
                  : isDone
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-gray-50 text-gray-500"
              }`}
            >
              <span className="text-[10px] font-semibold">
                {step.label}
              </span>
              <span className="text-[10px]">{step.desc}</span>
            </div>
            {idx < steps.length - 1 && (
              <span className="text-[10px] text-gray-300">→</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─────────────────────────────
// A. Voca Preview – 오늘 단어 훑기
// ─────────────────────────────

type SpeakingPreviewProps = {
  words: VocabWordCore[];
  onNext: () => void;
};

function SpeakingPreviewSection({ words, onNext }: SpeakingPreviewProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-indigo-200 bg-white px-4 py-6 shadow-sm">
      <header className="space-y-1">
        <p className="text-xs font-semibold text-indigo-700">
          A. Voca Preview – 오늘 Speaking에 반드시 쓸 단어
        </p>
        <p className="text-[11px] text-gray-500">
          아래 단어들 중 최소 2개 이상을 Task 1 답변에서 반드시 사용할
          예정입니다.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        {words.map((w) => {
          const meaning = w.meanings_ko[0] ?? "";
          const easySyn = w.meanings_en_simple[0] ?? "";
          return (
            <div
              key={w.id}
              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
            >
              <p className="text-sm font-semibold">{w.text}</p>
              <p className="mt-1 text-[11px] text-gray-700">{meaning}</p>
              {easySyn && (
                <p className="mt-0.5 text-[10px] text-gray-500">
                  ({easySyn})
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
        >
          단어 확인 완료 → B. Prompt
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────
// B. Speaking Prompt – Task 1 스타일 질문
// ─────────────────────────────

type SpeakingPromptProps = {
  words: VocabWordCore[];
  onNext: () => void;
  onPrev: () => void;
};

function SpeakingPromptSection({
  words,
  onNext,
  onPrev,
}: SpeakingPromptProps) {
  const mustUseWords = words.map((w) => w.text);

  const promptText = `Some students prefer studying alone at home, while others like studying with friends in a library or a café. Which do you prefer, and why? Use specific reasons and details in your response.`;

  return (
    <section className="space-y-4 rounded-2xl border border-purple-200 bg-white px-4 py-6 shadow-sm">
      <header className="space-y-1">
        <p className="text-xs font-semibold text-purple-700">
          B. Speaking Prompt – TOEFL Task 1 스타일
        </p>
        <p className="text-[11px] text-gray-500">
          아래 질문에 45초 정도 말한다고 생각하고 아이디어를 떠올려 보게
          할 수 있어요.
        </p>
      </header>

      <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm leading-relaxed text-gray-800">
        {promptText}
      </div>

      <div className="rounded-xl border border-purple-100 bg-purple-50 px-3 py-2 text-xs text-purple-900">
        <p className="text-[11px] font-semibold">Must-use words</p>
        <p className="mt-1 text-[11px]">
          아래 단어 중 최소 <b>2개 이상</b>을 반드시 사용해서 답하도록
          안내:
        </p>
        <p className="mt-1 text-[11px] font-semibold">
          {mustUseWords.join(", ")}
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>※ 나중에는 여기서 바로 타이머/녹음 버튼이 붙을 예정.</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-full bg-gray-100 px-4 py-1.5 text-[11px] text-gray-700 hover:bg-gray-200"
          >
            ← A. Voca로
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-full bg-purple-600 px-5 py-1.5 text-[11px] font-semibold text-white hover:bg-purple-700"
          >
            아이디어 떠올림 완료 → C. Script
          </button>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────
// C. Script – 답변 문장 써보기 (Recording 준비)
// ─────────────────────────────

type SpeakingScriptProps = {
  words: VocabWordCore[];
  onNext: () => void;
  onPrev: () => void;
};

function SpeakingScriptSection({
  words,
  onNext,
  onPrev,
}: SpeakingScriptProps) {
  const [script, setScript] = useState("");
  const mustUseWords = words.map((w) => w.text);

  const approxSentences =
    script.trim().length === 0
      ? 0
      : script.split(/[.!?]/).filter((s) => s.trim().length > 0).length;

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white px-4 py-6 shadow-sm">
      <header className="space-y-1">
        <p className="text-xs font-semibold text-emerald-700">
          C. Script – 말하기 전에 문장으로 정리하기
        </p>
        <p className="text-[11px] text-gray-500">
          학생에게 4~6문장 정도의 답변을 먼저 글로 써 보게 하고, 나중에
          실제 녹음 페이지에서 이 스크립트를 참고하게 만들 수 있어요.
        </p>
      </header>

      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
        <p className="font-semibold">조건</p>
        <ul className="ml-4 mt-1 list-disc space-y-1">
          <li>
            아래 단어 중 최소 <b>2개 이상</b>을 반드시 포함해서 쓰기
          </li>
          <li>최소 4문장 이상 쓰기 (TOEFL Task 1 느낌)</li>
        </ul>
        <p className="mt-1 text-[11px] font-semibold">
          Must-use words: {mustUseWords.join(", ")}
        </p>
      </div>

      <div className="space-y-1">
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          placeholder="예시: I prefer studying in a quiet library because..."
        />
        <p className="text-[10px] text-gray-500">
          추정 문장 수:{" "}
          <span className="font-semibold">{approxSentences}</span> 문장
        </p>
      </div>

      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-full bg-gray-100 px-4 py-1.5 text-[11px] text-gray-700 hover:bg-gray-200"
        >
          ← B. Prompt로
        </button>

        <button
          type="button"
          onClick={onNext}
          className="rounded-full bg-emerald-600 px-5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
        >
          Script 작성 완료 → 요약 보기
        </button>
      </div>
    </section>
  );
}

// ─────────────────────────────
// D. Summary – 오늘 Speaking Drill 정리
// ─────────────────────────────

type SpeakingSummaryProps = {
  words: VocabWordCore[];
  onPrev: () => void;
};

function SpeakingSummarySection({ words, onPrev }: SpeakingSummaryProps) {
  const mustUseWords = words.map((w) => w.text);

  return (
    <section className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-5 text-xs text-gray-700">
      <p className="text-sm font-semibold text-gray-800">
        오늘 Speaking Voca Drill 요약
      </p>

      <ul className="ml-4 list-disc space-y-1">
        <li>오늘 Speaking에 연결한 단어: {mustUseWords.join(", ")}</li>
        <li>A: 단어 의미/예문을 다시 보면서 &quot;입에 올릴 준비&quot;</li>
        <li>B: Task 1 질문과 필수 단어 조건 확인</li>
        <li>C: 4~6문장 정도의 답변 Script 작성</li>
      </ul>

      <p className="mt-2 text-[11px] text-gray-500">
        다음 단계에서는 이 페이지에서 작성한 Script와 나중에 녹음한
        음성을 Supabase에 저장해서, &quot;단어 사용 여부 + 발음 + 유창성&quot;
        리포트를 자동으로 만드는 구조로 확장할 수 있어요.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-full bg-gray-200 px-4 py-1.5 text-[11px] text-gray-700 hover:bg-gray-300"
        >
          ← C. Script로 돌아가기
        </button>
      </div>
    </section>
  );
}
