"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  RReadingTest2026,
  RReadingItem,
  RCompleteWordsItem,
  RDailyLifeItem,
  RAcademicPassageItem,
} from "@/models/reading";
import PassagePasteFlow from "./PassagePasteFlow";

type Phase = "input" | "generating" | "edit" | "saving" | "locked";
type Mode = "auto" | "paste";
type GroupKey = "module1" | "hard" | "easy";

const TASK_LABEL: Record<string, string> = {
  complete_words: "Complete the Words",
  daily_life: "Read in Daily Life",
  academic_passage: "Read an Academic Passage",
};

const TASK_COLOR: Record<string, string> = {
  complete_words: "bg-sky-100 text-sky-700",
  daily_life: "bg-amber-100 text-amber-700",
  academic_passage: "bg-violet-100 text-violet-700",
};

function getGroupItems(test: RReadingTest2026, key: GroupKey): RReadingItem[] {
  if (key === "module1") return test.modules?.[0]?.items ?? [];
  if (key === "hard") return test.stage2Pool?.hard?.items ?? [];
  return test.stage2Pool?.easy?.items ?? [];
}

function updateGroupItems(
  test: RReadingTest2026,
  key: GroupKey,
  updater: (items: RReadingItem[]) => RReadingItem[]
): RReadingTest2026 {
  const next = structuredClone(test);
  if (key === "module1") {
    next.modules[0].items = updater(next.modules[0].items) as any;
  } else if (key === "hard" && next.stage2Pool) {
    next.stage2Pool.hard.items = updater(next.stage2Pool.hard.items) as any;
  } else if (key === "easy" && next.stage2Pool) {
    next.stage2Pool.easy.items = updater(next.stage2Pool.easy.items) as any;
  }
  return next;
}

export default function ReadingTestGeneratorClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("auto");
  const [phase, setPhase] = useState<Phase>("input");

  // Module 1 topics (4개: CW 1 + Daily 2 + Academic 1)
  const [cwTopicM1, setCwTopicM1] = useState("");
  const [dailyLifeTopic1, setDailyLifeTopic1] = useState("");
  const [dailyLifeTopic2, setDailyLifeTopic2] = useState("");
  const [academicTopicM1, setAcademicTopicM1] = useState("");

  // Module 2 topics (2개, Hard/Easy 공유: CW 1 + Academic 1)
  const [cwTopicM2, setCwTopicM2] = useState("");
  const [academicTopicM2, setAcademicTopicM2] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<RReadingTest2026 | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const canGenerate =
    cwTopicM1.trim() && dailyLifeTopic1.trim() && dailyLifeTopic2.trim() && academicTopicM1.trim() &&
    cwTopicM2.trim() && academicTopicM2.trim();

  // ── Generate ────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/admin/updated-reading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cwTopicM1, dailyLifeTopic1, dailyLifeTopic2, academicTopicM1,
          cwTopicM2, academicTopicM2,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Generation failed");
      setTest(data.payload as RReadingTest2026);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("input");
    }
  }, [cwTopicM1, dailyLifeTopic1, dailyLifeTopic2, academicTopicM1, cwTopicM2, academicTopicM2, canGenerate]);

  // ── Field helpers ───────────────────────────────────────────
  const setLabel = (label: string) =>
    setTest((prev) => prev ? { ...prev, meta: { ...prev.meta, label } } : prev);

  const setItemField = (group: GroupKey, itemIndex: number, field: string, value: any) =>
    setTest((prev) => {
      if (!prev) return prev;
      return updateGroupItems(prev, group, (items) => {
        const next = [...items];
        (next[itemIndex] as any) = { ...(next[itemIndex] as any), [field]: value };
        return next;
      });
    });

  const setBlankToken = (group: GroupKey, itemIndex: number, blankIndex: number, correctToken: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      return updateGroupItems(prev, group, (items) => {
        const next = [...items];
        const item = { ...(next[itemIndex] as RCompleteWordsItem) };
        item.blanks = item.blanks.map((b, i) => i === blankIndex ? { ...b, correctToken } : b);
        next[itemIndex] = item;
        return next;
      });
    });

  const setQuestionStem = (group: GroupKey, itemIndex: number, qi: number, stem: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      return updateGroupItems(prev, group, (items) => {
        const next = [...items];
        const item = { ...(next[itemIndex] as RDailyLifeItem | RAcademicPassageItem) };
        item.questions = item.questions.map((q, i) => i === qi ? { ...q, stem } : q);
        next[itemIndex] = item as any;
        return next;
      });
    });

  const setChoiceText = (group: GroupKey, itemIndex: number, qi: number, ci: number, text: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      return updateGroupItems(prev, group, (items) => {
        const next = [...items];
        const item = { ...(next[itemIndex] as RDailyLifeItem | RAcademicPassageItem) };
        item.questions = item.questions.map((q, i) => {
          if (i !== qi) return q;
          return { ...q, choices: q.choices.map((c, j) => j === ci ? { ...c, text } : c) };
        });
        next[itemIndex] = item as any;
        return next;
      });
    });

  const setCorrectChoice = (group: GroupKey, itemIndex: number, qi: number, ci: number) =>
    setTest((prev) => {
      if (!prev) return prev;
      return updateGroupItems(prev, group, (items) => {
        const next = [...items];
        const item = { ...(next[itemIndex] as RDailyLifeItem | RAcademicPassageItem) };
        item.questions = item.questions.map((q, i) => {
          if (i !== qi) return q;
          return { ...q, choices: q.choices.map((c, j) => ({ ...c, isCorrect: j === ci } as any)) };
        });
        next[itemIndex] = item as any;
        return next;
      });
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

  // ── Item editor (task kind별 분기) ──────────────────────────
  const renderItem = (group: GroupKey, item: RReadingItem, itemIndex: number) => {
    return (
      <section key={item.id} className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${TASK_COLOR[item.taskKind] ?? "bg-gray-100 text-gray-600"}`}>
            {TASK_LABEL[item.taskKind] ?? item.taskKind}
          </span>
          {item.difficulty && (
            <span className="text-[10px] text-gray-400">난이도: {item.difficulty}</span>
          )}
        </div>

        {item.taskKind === "complete_words" && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">단락 (__ 로 빈칸 표시)</label>
              <textarea
                rows={5}
                className="w-full rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={item.paragraphHtml}
                onChange={(e) => setItemField(group, itemIndex, "paragraphHtml", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {item.blanks.map((b, bi) => (
                <div key={b.id} className="space-y-1">
                  <label className="text-[10px] text-gray-400">빈칸 {b.order}</label>
                  <input
                    className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    value={b.correctToken}
                    onChange={(e) => setBlankToken(group, itemIndex, bi, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {item.taskKind === "daily_life" && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">콘텐츠 HTML ({item.contextType})</label>
              <textarea
                rows={6}
                className="w-full rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={item.contentHtml}
                onChange={(e) => setItemField(group, itemIndex, "contentHtml", e.target.value)}
              />
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer select-none">미리보기</summary>
                <div className="mt-2 rounded-lg border bg-slate-50 p-3" dangerouslySetInnerHTML={{ __html: item.contentHtml }} />
              </details>
            </div>
            {renderQuestions(group, item.questions, itemIndex)}
          </>
        )}

        {item.taskKind === "academic_passage" && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">제목</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={(item as any).title ?? ""}
                onChange={(e) => setItemField(group, itemIndex, "title", e.target.value)}
              />
              <label className="text-xs text-gray-500">지문 HTML</label>
              <textarea
                rows={8}
                className="w-full rounded-lg border px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={item.passageHtml}
                onChange={(e) => setItemField(group, itemIndex, "passageHtml", e.target.value)}
              />
              <details className="text-xs text-gray-500">
                <summary className="cursor-pointer select-none">미리보기</summary>
                <div className="prose prose-sm mt-2 max-w-none rounded-lg border bg-slate-50 p-3" dangerouslySetInnerHTML={{ __html: item.passageHtml }} />
              </details>
            </div>
            {renderQuestions(group, item.questions, itemIndex)}
          </>
        )}
      </section>
    );
  };

  const renderQuestions = (group: GroupKey, questions: any[], itemIndex: number) => (
    <div className="space-y-3">
      {questions.map((q, qi) => (
        <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-500">Q{q.number}</span>
            <span className="rounded-full bg-white border px-2 py-0.5 text-[10px] text-gray-500">{q.type}</span>
          </div>
          <textarea
            rows={2}
            className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
            value={q.stem}
            onChange={(e) => setQuestionStem(group, itemIndex, qi, e.target.value)}
          />
          <div className="space-y-1">
            {q.choices.map((c: any, ci: number) => (
              <label key={c.id} className={`flex items-start gap-2 rounded border px-2 py-1 text-xs cursor-pointer transition ${c.isCorrect ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                <input
                  type="radio"
                  name={`${group}-${itemIndex}-${qi}-correct`}
                  checked={c.isCorrect === true}
                  onChange={() => setCorrectChoice(group, itemIndex, qi, ci)}
                  className="mt-0.5 shrink-0"
                />
                <input
                  className="flex-1 bg-transparent focus:outline-none"
                  value={c.text}
                  onChange={(e) => setChoiceText(group, itemIndex, qi, ci, e.target.value)}
                />
                {c.isCorrect && <span className="shrink-0 text-[10px] font-semibold text-emerald-600">✓ 정답</span>}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderGroup = (group: GroupKey, title: string, bg: string) => {
    if (!test) return null;
    const items = getGroupItems(test, group);
    if (items.length === 0) return null;
    return (
      <div className={`rounded-xl border p-4 shadow-sm ${bg}`}>
        <h3 className="mb-4 text-sm font-bold text-gray-900">{title} ({items.length}개 지문)</h3>
        <div className="space-y-4">
          {items.map((item, i) => renderItem(group, item, i))}
        </div>
      </div>
    );
  };

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
            onClick={() => {
              setPhase("input");
              setCwTopicM1(""); setDailyLifeTopic1(""); setDailyLifeTopic2(""); setAcademicTopicM1("");
              setCwTopicM2(""); setAcademicTopicM2("");
              setTest(null); setSavedId(null);
            }}
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

      {/* Topic input — 6개 (Module1: 4개, Module2: 2개 Hard/Easy 공유) */}
      {mode === "auto" && (
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">📘 Module 1 (공통 Routing) 주제 4가지</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-sky-700">① Complete the Words</label>
              <input
                className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60"
                placeholder="예: university campus life"
                value={cwTopicM1}
                onChange={(e) => setCwTopicM1(e.target.value)}
                disabled={phase === "generating"}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-amber-700">② Daily Life #1</label>
              <input
                className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
                placeholder="예: library overdue notice"
                value={dailyLifeTopic1}
                onChange={(e) => setDailyLifeTopic1(e.target.value)}
                disabled={phase === "generating"}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-amber-700">③ Daily Life #2</label>
              <input
                className="w-full rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-60"
                placeholder="예: dorm cafeteria menu update"
                value={dailyLifeTopic2}
                onChange={(e) => setDailyLifeTopic2(e.target.value)}
                disabled={phase === "generating"}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-violet-700">④ Academic Passage</label>
              <input
                className="w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-60"
                placeholder="예: The history of the printing press"
                value={academicTopicM1}
                onChange={(e) => setAcademicTopicM1(e.target.value)}
                disabled={phase === "generating"}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            🔴🟢 Module 2 (적응형 Upper/Lower) 주제 2가지{" "}
            <span className="text-[11px] font-normal text-gray-400">(Hard/Easy 공유, 난이도만 다르게 생성 · Daily Life 없음)</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-sky-700">⑤ Complete the Words</label>
              <input
                className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-60"
                placeholder="예: marine biology research"
                value={cwTopicM2}
                onChange={(e) => setCwTopicM2(e.target.value)}
                disabled={phase === "generating"}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-violet-700">⑥ Academic Passage</label>
              <input
                className="w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 disabled:opacity-60"
                placeholder="예: Climate change and ocean ecosystems"
                value={academicTopicM2}
                onChange={(e) => setAcademicTopicM2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                disabled={phase === "generating"}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate || phase === "generating"}
          className="w-full rounded-lg border border-emerald-500 bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {phase === "generating" ? "생성 중…" : test ? "재생성 (MST)" : "AI 생성 (MST)"}
        </button>

        {phase === "generating" && (
          <p className="text-xs text-gray-500 animate-pulse">Claude가 Module 1(23문항) + Module 2 Hard/Easy(각 15문항)를 생성 중입니다 (약 60-90초)…</p>
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

          {renderGroup("module1", "📘 Module 1 (공통 Routing)", "bg-violet-50")}
          {renderGroup("hard", "🔴 Module 2 - Upper (Hard)", "bg-amber-50")}
          {renderGroup("easy", "🟢 Module 2 - Lower (Easy)", "bg-blue-50")}

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
