"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { LBaseItem, LListeningTest2026 } from "@/models/listening";

type StepKey = "module1" | "hard" | "easy";
const STEP_ORDER: StepKey[] = ["module1", "hard", "easy"];
const STEP_LABEL: Record<StepKey, string> = {
  module1: "Module 1 (Stage1 · 항상 응시)",
  hard: "Module 2 — Hard",
  easy: "Module 2 — Easy",
};

type Composition = { chooseBestResponse: number; conversation: number; announcement: number; academicLecture: number };
const DEFAULT_COMPOSITION: Record<StepKey, Composition> = {
  module1: { chooseBestResponse: 8, conversation: 4, announcement: 0, academicLecture: 1 },
  hard: { chooseBestResponse: 3, conversation: 2, announcement: 0, academicLecture: 2 },
  easy: { chooseBestResponse: 3, conversation: 2, announcement: 0, academicLecture: 2 },
};
const QPI = { chooseBestResponse: 1, conversation: 2, announcement: 2, academicLecture: 4 } as const;

function totalQuestions(c: Composition) {
  return (
    c.chooseBestResponse * QPI.chooseBestResponse +
    c.conversation * QPI.conversation +
    c.announcement * QPI.announcement +
    c.academicLecture * QPI.academicLecture
  );
}

type ScriptState = { conversations: string[]; announcements: string[]; lectures: string[] };
const emptyScripts = (): ScriptState => ({ conversations: [], announcements: [], lectures: [] });

function resizeArray(arr: string[], n: number): string[] {
  if (arr.length === n) return arr;
  if (arr.length > n) return arr.slice(0, n);
  return [...arr, ...Array(n - arr.length).fill("")];
}

export default function ListeningMstWizard() {
  const router = useRouter();
  const [step, setStep] = useState<StepKey>("module1");
  const [phase, setPhase] = useState<"form" | "saving" | "locked">("form");

  const [topic, setTopic] = useState<Record<StepKey, string>>({ module1: "", hard: "", easy: "" });
  const [composition, setComposition] = useState<Record<StepKey, Composition>>(DEFAULT_COMPOSITION);
  const [useScripts, setUseScripts] = useState<Record<StepKey, boolean>>({ module1: false, hard: false, easy: false });
  const [scripts, setScripts] = useState<Record<StepKey, ScriptState>>({
    module1: emptyScripts(),
    hard: emptyScripts(),
    easy: emptyScripts(),
  });

  const [results, setResults] = useState<Record<StepKey, LBaseItem[] | null>>({ module1: null, hard: null, easy: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("Updated Listening – 적응형 (MST)");
  const [savedId, setSavedId] = useState<string | null>(null);

  const comp = composition[step];
  const qTotal = useMemo(() => totalQuestions(comp), [comp]);
  const sc = scripts[step];

  const setComp = (patch: Partial<Composition>) => {
    setComposition((prev) => {
      const nextComp = { ...prev[step], ...patch };
      return { ...prev, [step]: nextComp };
    });
    setScripts((prev) => ({
      ...prev,
      [step]: {
        conversations: resizeArray(prev[step].conversations, (patch.conversation ?? composition[step].conversation)),
        announcements: resizeArray(prev[step].announcements, (patch.announcement ?? composition[step].announcement)),
        lectures: resizeArray(prev[step].lectures, (patch.academicLecture ?? composition[step].academicLecture)),
      },
    }));
  };

  const handleGenerate = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const endpoint = useScripts[step]
        ? "/api/admin/updated-listening/generate-mst-from-scripts"
        : "/api/admin/updated-listening/generate-mst";
      const body = useScripts[step]
        ? {
            part: step,
            topic: topic[step],
            chooseBestResponseCount: comp.chooseBestResponse,
            conversations: sc.conversations,
            announcements: sc.announcements,
            lectures: sc.lectures,
          }
        : { part: step, topic: topic[step], composition: comp };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "생성 실패");
      setResults((prev) => ({ ...prev, [step]: data.items as LBaseItem[] }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, [step, useScripts, topic, comp, sc]);

  const handleNext = useCallback(() => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx < STEP_ORDER.length - 1) {
      setStep(STEP_ORDER[idx + 1]);
      setError(null);
    }
  }, [step]);

  const handleSaveAndLock = useCallback(
    async (lock: boolean) => {
      if (!results.module1 || !results.hard || !results.easy) return;
      setError(null);
      setPhase("saving");
      const id = savedId ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : `id-${Date.now()}`);
      const test: LListeningTest2026 = {
        meta: { id, label, examEra: "ibt_2026" },
        modules: [
          { id: "stage1", stage: 1, items: results.module1 },
          { id: "stage2-default", stage: 2, items: [] },
        ],
        stage2Pool: {
          cutScore: 0.7,
          hard: { id: "stage2-hard", stage: 2, items: results.hard },
          easy: { id: "stage2-easy", stage: 2, items: results.easy },
        },
      };
      try {
        const saveRes = await fetch("/api/admin/updated-listening/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test }),
        });
        const saveData = await saveRes.json();
        if (!saveData.ok) throw new Error(saveData.error ?? "저장 실패");
        setSavedId(id);

        if (lock) {
          if (!confirm("Lock하면 이후 수정이 불가합니다. 진행할까요?")) {
            setPhase("form");
            return;
          }
          const lockRes = await fetch("/api/admin/updated-listening/lock", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
          });
          const lockData = await lockRes.json();
          if (!lockData.ok) throw new Error(lockData.error ?? "Lock 실패");
          setPhase("locked");
        } else {
          setPhase("form");
        }
      } catch (e: any) {
        setError(e.message);
        setPhase("form");
      }
    },
    [results, label, savedId]
  );

  if (phase === "locked") {
    return (
      <div className="space-y-4 py-12 text-center">
        <div className="text-4xl">🔒</div>
        <p className="text-sm font-semibold text-gray-800">시험이 Lock되었습니다.</p>
        <button
          onClick={() => router.push("/admin/content/updated-listening")}
          className="rounded-lg border border-violet-500 bg-violet-600 px-4 py-2 text-xs text-white hover:bg-violet-700"
        >
          목록으로
        </button>
      </div>
    );
  }

  const allDone = results.module1 && results.hard && results.easy;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs">
        {STEP_ORDER.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setStep(s)}
              className={`rounded-full px-2.5 py-1 font-medium ${
                s === step ? "bg-violet-600 text-white" : results[s] ? "bg-violet-100 text-violet-700" : "bg-gray-100 text-gray-400"
              }`}
            >
              {i + 1}. {STEP_LABEL[s]}
            </button>
            {i < STEP_ORDER.length - 1 && <span className="text-gray-300">→</span>}
          </div>
        ))}
      </div>

      <section className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">{STEP_LABEL[step]}</h2>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">주제 (topic)</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="예: campus life, environmental science"
            value={topic[step]}
            onChange={(e) => setTopic((p) => ({ ...p, [step]: e.target.value }))}
            disabled={busy}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(
            [
              ["chooseBestResponse", "Choose Best Response (1문제/지문)"],
              ["conversation", "Conversation (2문제/지문)"],
              ["announcement", "Announcement (2문제/지문)"],
              ["academicLecture", "Academic Lecture (4문제/지문)"],
            ] as [keyof Composition, string][]
          ).map(([key, lbl]) => (
            <div key={key}>
              <label className="mb-1 block text-[11px] font-medium text-gray-600">{lbl}</label>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={comp[key]}
                onChange={(e) => setComp({ [key]: Math.max(0, parseInt(e.target.value) || 0) })}
                disabled={busy}
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500">총 지문 {comp.chooseBestResponse + comp.conversation + comp.announcement + comp.academicLecture}개 · 총 문제 {qTotal}개</p>

        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={useScripts[step]}
            onChange={(e) => setUseScripts((p) => ({ ...p, [step]: e.target.checked }))}
            disabled={busy}
          />
          Conversation / Announcement / Academic Lecture 스크립트 직접 붙여넣기 (Choose Best Response는 AI가 생성)
        </label>

        {useScripts[step] && (
          <div className="space-y-4 rounded-lg border border-violet-100 bg-violet-50/40 p-3">
            {(["conversations", "announcements", "lectures"] as const).map((field) => {
              const fieldLabel = field === "conversations" ? "Conversation" : field === "announcements" ? "Announcement" : "Academic Lecture";
              return sc[field].map((val, i) => (
                <div key={`${field}-${i}`}>
                  <label className="mb-1 block text-[11px] font-medium text-gray-600">
                    {fieldLabel} 스크립트 #{i + 1}
                  </label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={val}
                    onChange={(e) =>
                      setScripts((prev) => {
                        const arr = [...prev[step][field]];
                        arr[i] = e.target.value;
                        return { ...prev, [step]: { ...prev[step], [field]: arr } };
                      })
                    }
                    disabled={busy}
                  />
                </div>
              ));
            })}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={busy || !topic[step].trim()}
          className="w-full rounded-lg border border-violet-500 bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
        >
          {busy ? "생성 중…" : results[step] ? "재생성" : "생성"}
        </button>
        {error && <p className="text-xs text-rose-600">{error}</p>}

        {results[step] && (
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 text-xs text-violet-800">
            {results[step]!.length}개 항목 생성 완료 (
            {results[step]!.map((it) => `${it.taskKind}:${it.questions.length}`).join(", ")})
          </div>
        )}
      </section>

      <div className="flex justify-end gap-2">
        {step !== "easy" && (
          <button
            onClick={handleNext}
            disabled={!results[step]}
            className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            다음 단계로 →
          </button>
        )}
      </div>

      {allDone && (
        <section className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
          <label className="block text-xs font-semibold text-gray-700">시험 제목</label>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{savedId ? `저장됨 (ID: ${savedId.slice(0, 8)}…)` : "아직 저장되지 않았습니다."}</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveAndLock(false)}
                disabled={phase === "saving"}
                className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {phase === "saving" ? "저장 중…" : "임시 저장"}
              </button>
              <button
                onClick={() => handleSaveAndLock(true)}
                disabled={phase === "saving"}
                className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                🔒 Lock & 완료
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
