"use client";

import { useState, useCallback } from "react";
import type { RReadingItem, RReadingTest2026 } from "@/models/reading";

type StepKey = "stage1" | "hard" | "easy";

const STEP_ORDER: StepKey[] = ["stage1", "hard", "easy"];

const STEP_LABEL: Record<StepKey, string> = {
  stage1: "Stage 1 (지문 4개 · 20문제)",
  hard: "Stage 2 — Hard (지문 2개 · 15문제)",
  easy: "Stage 2 — Easy (지문 2개 · 15문제)",
};

type FormState = {
  cw: string;
  dlEmail: string;
  dlText: string;
  academic: string;
  academicTitle: string;
};

const EMPTY_FORM: FormState = { cw: "", dlEmail: "", dlText: "", academic: "", academicTitle: "" };

function buildPayload(step: StepKey, form: FormState) {
  if (step === "stage1") {
    return {
      stage: 1 as const,
      items: [
        { taskKind: "complete_words" as const, passageText: form.cw },
        {
          taskKind: "daily_life" as const,
          contextType: "email" as const,
          label: "email",
          questionCount: 2,
          passageText: form.dlEmail,
        },
        {
          taskKind: "daily_life" as const,
          contextType: "other" as const,
          label: "text message chain",
          questionCount: 3,
          passageText: form.dlText,
        },
        { taskKind: "academic_passage" as const, passageText: form.academic, title: form.academicTitle },
      ],
    };
  }
  return {
    stage: 2 as const,
    branch: step, // "hard" | "easy"
    items: [
      { taskKind: "complete_words" as const, passageText: form.cw },
      { taskKind: "academic_passage" as const, passageText: form.academic, title: form.academicTitle },
    ],
  };
}

export default function PassagePasteFlow({
  onComplete,
}: {
  onComplete: (test: RReadingTest2026) => void;
}) {
  const [step, setStep] = useState<StepKey>("stage1");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stage1Items, setStage1Items] = useState<RReadingItem[] | null>(null);
  const [hardItems, setHardItems] = useState<RReadingItem[] | null>(null);
  const [easyItems, setEasyItems] = useState<RReadingItem[] | null>(null);

  const currentResult = step === "stage1" ? stage1Items : step === "hard" ? hardItems : easyItems;

  const handleGenerate = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/updated-reading/generate-from-passages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(step, form)),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "생성 실패");
      const items = data.items as RReadingItem[];
      if (step === "stage1") setStage1Items(items);
      else if (step === "hard") setHardItems(items);
      else setEasyItems(items);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [step, form]);

  const handleNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[idx + 1]);
      setForm(EMPTY_FORM);
      setError(null);
    }
  }, [step]);

  const handleFinish = useCallback(() => {
    if (!stage1Items || !hardItems || !easyItems) return;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `id-${Date.now()}`;
    const test: RReadingTest2026 = {
      meta: { id, label: "Updated Reading – 지문 붙여넣기", examEra: "ibt_2026" },
      modules: [
        { id: "stage1", stage: 1, items: stage1Items },
        { id: "stage2-default", stage: 2, items: [] },
      ],
      stage2Pool: {
        cutScore: 0.7,
        hard: { id: "stage2-hard", stage: 2, items: hardItems },
        easy: { id: "stage2-easy", stage: 2, items: easyItems },
      },
    };
    onComplete(test);
  }, [stage1Items, hardItems, easyItems, onComplete]);

  const isStage1 = step === "stage1";
  const canGenerate = isStage1
    ? form.cw.trim() && form.dlEmail.trim() && form.dlText.trim() && form.academic.trim()
    : form.cw.trim() && form.academic.trim();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs">
        {STEP_ORDER.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 font-medium ${
                s === step
                  ? "bg-emerald-600 text-white"
                  : (s === "stage1" && stage1Items) || (s === "hard" && hardItems) || (s === "easy" && easyItems)
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}. {STEP_LABEL[s]}
            </span>
            {i < STEP_ORDER.length - 1 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">{STEP_LABEL[step]} — 지문 붙여넣기</h2>

        <div>
          <label className="mb-1 block text-xs font-semibold text-sky-700">Complete the Words 지문 (10문제분)</label>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
            placeholder="완결된 문단 텍스트를 붙여넣으세요 (blank는 AI가 자동으로 표시)"
            value={form.cw}
            onChange={(e) => setForm((f) => ({ ...f, cw: e.target.value }))}
            disabled={busy}
          />
        </div>

        {isStage1 && (
          <>
            <div>
              <label className="mb-1 block text-xs font-semibold text-teal-700">Daily Life — Email 지문 (2문제분)</label>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="이메일 본문(HTML 또는 텍스트)을 붙여넣으세요"
                value={form.dlEmail}
                onChange={(e) => setForm((f) => ({ ...f, dlEmail: e.target.value }))}
                disabled={busy}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-teal-700">
                Daily Life — Text Message Chain 지문 (3문제분)
              </label>
              <textarea
                rows={4}
                className="w-full rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                placeholder="문자 메시지 대화(HTML 또는 텍스트)를 붙여넣으세요"
                value={form.dlText}
                onChange={(e) => setForm((f) => ({ ...f, dlText: e.target.value }))}
                disabled={busy}
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-violet-700">Academic Passage 지문 (5문제분)</label>
          <input
            className="mb-2 w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="지문 제목 (선택)"
            value={form.academicTitle}
            onChange={(e) => setForm((f) => ({ ...f, academicTitle: e.target.value }))}
            disabled={busy}
          />
          <textarea
            rows={6}
            className="w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="학술 지문(HTML 또는 텍스트)을 붙여넣으세요"
            value={form.academic}
            onChange={(e) => setForm((f) => ({ ...f, academic: e.target.value }))}
            disabled={busy}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate || busy}
          className="w-full rounded-lg border border-emerald-500 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "문제 생성 중…" : currentResult ? "재생성" : isStage1 ? "20문제 생성" : "15문제 생성"}
        </button>
        {error && <p className="text-xs text-rose-600">{error}</p>}

        {currentResult && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            {currentResult.length}개 항목 생성 완료. ({currentResult
              .map((it) =>
                it.taskKind === "complete_words"
                  ? `단어완성 blanks ${it.blanks.length}`
                  : `${it.taskKind} 문제 ${it.questions.length}`
              )
              .join(" / ")})
          </div>
        )}
      </section>

      <div className="flex justify-end gap-2">
        {step !== "easy" && (
          <button
            onClick={handleNext}
            disabled={!currentResult}
            className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            다음 단계로 →
          </button>
        )}
        {step === "easy" && (
          <button
            onClick={handleFinish}
            disabled={!stage1Items || !hardItems || !easyItems}
            className="rounded-lg border border-emerald-500 bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            전체 조립 완료 → 편집 화면으로
          </button>
        )}
      </div>
    </div>
  );
}
