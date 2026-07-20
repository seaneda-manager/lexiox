"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { RReadingTest2026, RAcademicPassageItem } from "@/models/reading";
import PassagePasteFlow from "./PassagePasteFlow";

type Phase = "input" | "generating" | "edit" | "saving" | "locked";
type Mode = "auto" | "paste";

function getAcademicItem(test: RReadingTest2026, stage: 1 | 2): RAcademicPassageItem | null {
  const mod = test.modules[stage - 1];
  const item = mod?.items?.[0];
  return item?.taskKind === "academic_passage" ? (item as RAcademicPassageItem) : null;
}

export default function ReadingTestGeneratorClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("auto");
  const [phase, setPhase] = useState<Phase>("input");
  const [cwTopic, setCwTopic] = useState("");
  const [dailyLifeTopic, setDailyLifeTopic] = useState("");
  const [academicTopic, setAcademicTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<RReadingTest2026 | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // ── Generate ────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!cwTopic.trim() || !dailyLifeTopic.trim() || !academicTopic.trim()) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/admin/updated-reading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cwTopic, dailyLifeTopic, academicTopic }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Generation failed");
      setTest(data.payload as RReadingTest2026);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("input");
    }
  }, [cwTopic, dailyLifeTopic, academicTopic]);

  // ── Field helpers ───────────────────────────────────────────
  const setLabel = (label: string) =>
    setTest((prev) => prev ? { ...prev, meta: { ...prev.meta, label } } : prev);

  const setPassageHtml = (stage: 1 | 2, html: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const item = next.modules[stage - 1]?.items?.[0] as any;
      if (item) item.passageHtml = html;
      return next;
    });

  const setQuestionStem = (stage: 1 | 2, qi: number, stem: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const item = next.modules[stage - 1]?.items?.[0] as any;
      if (item?.questions?.[qi]) item.questions[qi].stem = stem;
      return next;
    });

  const setChoiceText = (stage: 1 | 2, qi: number, ci: number, text: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const item = next.modules[stage - 1]?.items?.[0] as any;
      if (item?.questions?.[qi]?.choices?.[ci]) item.questions[qi].choices[ci].text = text;
      return next;
    });

  const setCorrectChoice = (stage: 1 | 2, qi: number, ci: number) =>
    setTest((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      const item = next.modules[stage - 1]?.items?.[0] as any;
      const qs = item?.questions?.[qi];
      if (qs) qs.choices.forEach((c: any, i: number) => { c.isCorrect = i === ci; });
      return next;
    });

  // ── Save (draft) ────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!test) return;
    setError(null);
    setPhase("saving");
    try {
      const res = await fetch("/api/admin/updated-reading/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Save failed");
      setSavedId(test.meta.id);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("edit");
    }
  }, [test]);

  // ── Lock ────────────────────────────────────────────────────
  const handleLock = useCallback(async () => {
    const id = savedId ?? test?.meta.id;
    if (!id) { setError("먼저 저장하세요."); return; }
    if (!confirm("Lock하면 이후 수정이 불가합니다. 진행할까요?")) return;
    setError(null);
    setPhase("saving");
    try {
      // save latest first
      await fetch("/api/admin/updated-reading/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const res = await fetch("/api/admin/updated-reading/lock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Lock failed");
      setPhase("locked");
    } catch (e: any) {
      setError(e.message);
      setPhase("edit");
    }
  }, [savedId, test]);

  // ── Render ──────────────────────────────────────────────────

  if (phase === "locked") {
    return (
      <div className="space-y-4 text-center py-12">
        <div className="text-4xl">🔒</div>
        <p className="text-sm font-semibold text-gray-800">시험이 Lock되었습니다.</p>
        <p className="text-xs text-gray-500">학생에게 노출 가능한 상태입니다.</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => router.push("/admin/content/updated-reading")}
            className="rounded-lg border px-4 py-2 text-xs hover:bg-gray-50"
          >
            목록으로
          </button>
          <button
            onClick={() => { setPhase("input"); setCwTopic(""); setDailyLifeTopic(""); setAcademicTopic(""); setTest(null); setSavedId(null); }}
            className="rounded-lg border border-emerald-500 bg-emerald-600 px-4 py-2 text-xs text-white hover:bg-emerald-700"
          >
            새 시험 만들기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      {phase === "input" && (
        <div className="flex gap-2 rounded-xl border bg-white p-1 shadow-sm w-fit text-xs">
          <button
            onClick={() => setMode("auto")}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              mode === "auto" ? "bg-emerald-600 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            AI 자동 생성
          </button>
          <button
            onClick={() => setMode("paste")}
            className={`rounded-lg px-3 py-1.5 font-medium ${
              mode === "paste" ? "bg-emerald-600 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            지문 붙여넣기
          </button>
        </div>
      )}

      {phase === "input" && mode === "paste" && (
        <PassagePasteFlow
          onComplete={(t) => {
            setTest(t);
            setPhase("edit");
          }}
        />
      )}

      {/* Topic input — 3 separate inputs */}
      {mode === "auto" && (
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">토픽 입력 (3개)</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-sky-700">① Complete the Words (단어 완성형)</label>
            <input
              className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60"
              placeholder="예: university campus life, library regulations"
              value={cwTopic}
              onChange={(e) => setCwTopic(e.target.value)}
              disabled={phase === "generating"}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-teal-700">② Read in Daily Life (일상 실무형)</label>
            <input
              className="w-full rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-60"
              placeholder="예: parking permit notice, cafeteria menu update"
              value={dailyLifeTopic}
              onChange={(e) => setDailyLifeTopic(e.target.value)}
              disabled={phase === "generating"}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-violet-700">③ Academic Passage (학술 독해형)</label>
            <input
              className="w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-60"
              placeholder="예: The history of the printing press, Climate change and ocean ecosystems"
              value={academicTopic}
              onChange={(e) => setAcademicTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              disabled={phase === "generating"}
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!cwTopic.trim() || !dailyLifeTopic.trim() || !academicTopic.trim() || phase === "generating"}
          className="w-full rounded-lg border border-emerald-500 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {phase === "generating" ? "생성 중…" : test ? "재생성 (MST)" : "AI 생성 (MST)"}
        </button>

        {phase === "generating" && (
          <p className="text-xs text-gray-500 animate-pulse">Claude가 Stage 1 + Stage 2 (Hard/Easy) 전체를 생성 중입니다 (약 30-60초)…</p>
        )}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </section>
      )}

      {/* Editor */}
      {test && phase !== "generating" && (
        <>
          {/* Label */}
          <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
            <label className="text-xs font-semibold text-gray-700">시험 제목</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              value={test.meta.label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </section>

          {/* Stage 1 + Stage 2 */}
          {([1, 2] as const).map((stage) => {
            const item = getAcademicItem(test, stage);
            if (!item) return null;
            return (
              <section key={stage} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
                <h2 className="text-sm font-semibold text-gray-900">
                  Stage {stage} 지문
                  <span className="ml-2 text-[11px] font-normal text-gray-400">
                    {stage === 1 ? "Routing Module" : "Final Module"}
                  </span>
                </h2>

                {/* Passage */}
                <div className="space-y-1">
                  <label className="text-xs text-gray-500">지문 HTML</label>
                  <textarea
                    rows={8}
                    className="w-full rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={item.passageHtml}
                    onChange={(e) => setPassageHtml(stage, e.target.value)}
                  />
                </div>

                {/* Preview */}
                <details className="text-xs text-gray-500">
                  <summary className="cursor-pointer select-none">미리보기</summary>
                  <div
                    className="mt-2 prose prose-sm max-w-none rounded-lg border bg-slate-50 p-3"
                    dangerouslySetInnerHTML={{ __html: item.passageHtml }}
                  />
                </details>

                {/* Questions */}
                <div className="space-y-4">
                  {item.questions.map((q, qi) => (
                    <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-gray-500">Q{q.number}</span>
                        <span className="rounded-full bg-white border px-2 py-0.5 text-[10px] text-gray-500">{q.type}</span>
                      </div>
                      <textarea
                        rows={2}
                        className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                        value={q.stem}
                        onChange={(e) => setQuestionStem(stage, qi, e.target.value)}
                      />
                      <div className="space-y-1">
                        {q.choices.map((c, ci) => (
                          <label key={c.id} className={`flex items-start gap-2 rounded border px-2 py-1 text-xs cursor-pointer transition ${(c as any).isCorrect ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                            <input
                              type="radio"
                              name={`${stage}-${qi}-correct`}
                              checked={(c as any).isCorrect === true}
                              onChange={() => setCorrectChoice(stage, qi, ci)}
                              className="mt-0.5 shrink-0"
                            />
                            <input
                              className="flex-1 bg-transparent focus:outline-none"
                              value={c.text}
                              onChange={(e) => setChoiceText(stage, qi, ci, e.target.value)}
                            />
                            {(c as any).isCorrect && (
                              <span className="shrink-0 text-[10px] font-semibold text-emerald-600">✓ 정답</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}

          {/* Actions */}
          <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-400">
              {savedId ? `저장됨 (ID: ${savedId.slice(0, 8)}…)` : "아직 저장되지 않았습니다."}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={phase === "saving"}
                className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {phase === "saving" ? "저장 중…" : "임시 저장"}
              </button>
              <button
                onClick={handleLock}
                disabled={phase === "saving"}
                className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                🔒 Lock & 완료
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
