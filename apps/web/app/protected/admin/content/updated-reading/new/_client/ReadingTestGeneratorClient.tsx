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

type Phase = "input" | "generating" | "edit" | "saving";

// fetch가 성공해도 서버리스 타임아웃/크래시 시 Vercel이 JSON이 아닌 HTML 에러 페이지를
// 돌려줄 수 있어 res.json()이 "Unexpected token 'A'..." 같은 파싱 에러로 실패한다.
// content-type을 먼저 확인해서 사람이 읽을 수 있는 에러 메시지로 바꿔준다.
async function safeJson(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    throw new Error(
      res.status === 504 || /timeout/i.test(text)
        ? "생성 시간이 너무 오래 걸려 서버가 타임아웃되었습니다. 잠시 후 다시 시도해주세요."
        : `서버 오류 (${res.status}): ${text.slice(0, 200)}`
    );
  }
  return res.json();
}
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

// ── 주제 입력 필드 설정 (AI 추천 연동) ─────────────────────────

type TopicFieldKey =
  | "cwTopicM1" | "dailyLifeTopic1" | "dailyLifeTopic2" | "dailyLifeTopic3" | "academicTopicM1"
  | "cwTopicM2Lower" | "dailyLifeTopic2L1" | "dailyLifeTopic2L2" | "academicTopicM2Upper";

type TopicFieldConfig = {
  key: TopicFieldKey;
  label: string;
  placeholder: string;
  suggestKind: "complete_words" | "daily_life" | "academic";
  color: "sky" | "amber" | "violet";
};

const MODULE1_TOPIC_FIELDS: TopicFieldConfig[] = [
  { key: "cwTopicM1", label: "📘 Module 1 - Complete the Words (1지문)", placeholder: "예: university campus life", suggestKind: "complete_words", color: "sky" },
  { key: "dailyLifeTopic1", label: "📘 Module 1 - Daily Life #1 (1지문)", placeholder: "예: library overdue notice", suggestKind: "daily_life", color: "amber" },
  { key: "dailyLifeTopic2", label: "📘 Module 1 - Daily Life #2 (1지문)", placeholder: "예: dorm cafeteria menu update", suggestKind: "daily_life", color: "amber" },
  { key: "dailyLifeTopic3", label: "📘 Module 1 - Daily Life #3 (1지문, 선택사항)", placeholder: "예: campus event registration", suggestKind: "daily_life", color: "amber" },
  { key: "academicTopicM1", label: "📘 Module 1 - Academic Passage (1지문)", placeholder: "예: The history of the printing press", suggestKind: "academic", color: "violet" },
];

const MODULE2_TOPIC_FIELDS: TopicFieldConfig[] = [
  { key: "cwTopicM2Lower", label: "🟢 Module 2 Lower - Complete the Words (1지문, 공용)", placeholder: "예: marine biology research", suggestKind: "complete_words", color: "sky" },
  { key: "dailyLifeTopic2L1", label: "🟢 Module 2 Lower - Daily Life #1 (1지문)", placeholder: "예: course schedule change", suggestKind: "daily_life", color: "amber" },
  { key: "dailyLifeTopic2L2", label: "🟢 Module 2 Lower - Daily Life #2 (1지문)", placeholder: "예: parking permit renewal", suggestKind: "daily_life", color: "amber" },
  { key: "academicTopicM2Upper", label: "🔴 Module 2 Upper - Academic Passage (1지문)", placeholder: "예: Climate change and ocean ecosystems", suggestKind: "academic", color: "violet" },
];

const ALL_TOPIC_FIELDS = [...MODULE1_TOPIC_FIELDS, ...MODULE2_TOPIC_FIELDS];

const TOPIC_COLOR_CLASSES: Record<TopicFieldConfig["color"], {
  label: string; border: string; ring: string; bg: string;
  suggestBorder: string; suggestText: string; suggestHover: string;
  chipBorder: string; chipBg: string; chipText: string; chipHover: string;
}> = {
  sky: {
    label: "text-sky-700", border: "border-sky-200", ring: "focus:ring-sky-400", bg: "bg-sky-50",
    suggestBorder: "border-sky-300", suggestText: "text-sky-700", suggestHover: "hover:bg-sky-50",
    chipBorder: "border-sky-200", chipBg: "bg-sky-50", chipText: "text-sky-700", chipHover: "hover:bg-sky-100",
  },
  amber: {
    label: "text-amber-700", border: "border-amber-200", ring: "focus:ring-amber-400", bg: "bg-amber-50",
    suggestBorder: "border-amber-300", suggestText: "text-amber-700", suggestHover: "hover:bg-amber-50",
    chipBorder: "border-amber-200", chipBg: "bg-amber-50", chipText: "text-amber-700", chipHover: "hover:bg-amber-100",
  },
  violet: {
    label: "text-violet-700", border: "border-violet-200", ring: "focus:ring-violet-400", bg: "bg-violet-50",
    suggestBorder: "border-violet-300", suggestText: "text-violet-700", suggestHover: "hover:bg-violet-50",
    chipBorder: "border-violet-200", chipBg: "bg-violet-50", chipText: "text-violet-700", chipHover: "hover:bg-violet-100",
  },
};

function TopicInput({
  field, value, onChange, disabled, loadingSuggestion, onSuggest, suggestionList, onSelectSuggestion,
}: {
  field: TopicFieldConfig;
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
  loadingSuggestion: boolean;
  onSuggest: () => void;
  suggestionList: string[];
  onSelectSuggestion: (topic: string) => void;
}) {
  const c = TOPIC_COLOR_CLASSES[field.color];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-semibold ${c.label}`}>{field.label}</label>
        <button
          type="button"
          onClick={onSuggest}
          disabled={loadingSuggestion || disabled}
          className={`text-[10px] px-2 py-1 rounded border ${c.suggestBorder} ${c.suggestText} ${c.suggestHover} disabled:opacity-50`}
        >
          {loadingSuggestion ? "추천 중…" : "💡 추천"}
        </button>
      </div>
      <input
        className={`w-full rounded-lg border ${c.border} ${c.bg} px-3 py-2 text-sm focus:outline-none focus:ring-2 ${c.ring} disabled:opacity-60`}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {suggestionList.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-0.5">
          {suggestionList.map((topic, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelectSuggestion(topic)}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${c.chipBorder} ${c.chipBg} ${c.chipText} ${c.chipHover} transition cursor-pointer`}
            >
              {topic}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReadingTestGeneratorClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("auto");
  const [phase, setPhase] = useState<Phase>("input");

  const [topics, setTopics] = useState<Record<TopicFieldKey, string>>(
    Object.fromEntries(ALL_TOPIC_FIELDS.map((f) => [f.key, ""])) as Record<TopicFieldKey, string>
  );
  const setTopic = (key: TopicFieldKey, value: string) => setTopics((prev) => ({ ...prev, [key]: value }));

  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<string, boolean>>({});
  const [autoFilling, setAutoFilling] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<RReadingTest2026 | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const canGenerate = ALL_TOPIC_FIELDS.every((f) => topics[f.key]?.trim());

  const handleSuggestTopics = useCallback(
    async (field: TopicFieldConfig) => {
      setLoadingSuggestions((prev) => ({ ...prev, [field.key]: true }));
      setError(null);
      try {
        const avoid = Object.values(topics).filter((v) => v.trim().length > 0);
        const res = await fetch("/api/admin/updated-reading/suggest-topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: field.suggestKind, avoid }),
        });
        const data = await safeJson(res);
        if (!data.ok) throw new Error(data.error ?? "Failed to suggest topics");
        setSuggestions((prev) => ({ ...prev, [field.key]: data.suggestions }));
      } catch (e: any) {
        setError(`주제 추천 실패: ${e.message}`);
      } finally {
        setLoadingSuggestions((prev) => ({ ...prev, [field.key]: false }));
      }
    },
    [topics]
  );

  const handleSelectSuggestion = (key: TopicFieldKey, topic: string) => {
    setTopic(key, topic);
    setSuggestions((prev) => ({ ...prev, [key]: [] }));
  };

  const handleAutoFillAll = useCallback(async () => {
    setAutoFilling(true);
    setError(null);
    try {
      const filled: Record<string, string> = { ...topics };
      for (const field of ALL_TOPIC_FIELDS) {
        if (filled[field.key]?.trim()) continue;
        const avoid = Object.values(filled).filter((v) => v.trim().length > 0);
        const res = await fetch("/api/admin/updated-reading/suggest-topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: field.suggestKind, avoid }),
        });
        const data = await safeJson(res);
        if (!data.ok) throw new Error(data.error ?? "Failed to suggest topics");
        const pick = data.suggestions?.[0];
        if (pick) filled[field.key] = pick;
      }
      setTopics(filled as Record<TopicFieldKey, string>);
    } catch (e: any) {
      setError(`전체 주제 자동채우기 실패: ${e.message}`);
    } finally {
      setAutoFilling(false);
    }
  }, [topics]);

  // ── Generate ────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/admin/updated-reading/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(topics),
      });
      const data = await safeJson(res);
      if (!data.ok) throw new Error(data.error ?? "Generation failed");
      setTest(data.payload as RReadingTest2026);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("input");
    }
  }, [topics, canGenerate]);

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

  const setChoiceExplanation = (group: GroupKey, itemIndex: number, qi: number, ci: number, explanation: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      return updateGroupItems(prev, group, (items) => {
        const next = [...items];
        const item = { ...(next[itemIndex] as RDailyLifeItem | RAcademicPassageItem) };
        item.questions = item.questions.map((q, i) => {
          if (i !== qi) return q;
          return { ...q, choices: q.choices.map((c, j) => j === ci ? { ...c, explanation } : c) };
        });
        next[itemIndex] = item as any;
        return next;
      });
    });

  const [generatingExplanations, setGeneratingExplanations] = useState<Set<string>>(new Set());

  const generateExplanations = useCallback(
    async (group: GroupKey, itemIndex: number, qi: number) => {
      if (!test) return;
      const item = getGroupItems(test, group)[itemIndex] as any;
      const q = item?.questions?.[qi];
      const passage = item?.passageHtml || "";

      if (!q || !passage) {
        setError("지문 또는 문제를 찾을 수 없습니다");
        return;
      }

      const key = `${group}-${itemIndex}-${qi}`;
      setGeneratingExplanations((prev) => new Set([...prev, key]));
      setError(null);

      try {
        const res = await fetch("/api/admin/updated-reading/generate-explanations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            passage: item.passageHtml,
            question: q.stem,
            choices: q.choices,
          }),
        });

        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "Failed to generate explanations");

        // 각 선택지에 해석 할당
        for (let ci = 0; ci < data.explanations.length; ci++) {
          setChoiceExplanation(group, itemIndex, qi, ci, data.explanations[ci]);
        }
      } catch (e: any) {
        setError(`해석 생성 실패: ${e.message}`);
      } finally {
        setGeneratingExplanations((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [test]
  );

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
      const data = await safeJson(res);
      if (!data.ok) throw new Error(data.error ?? "Save failed");
      setSavedId(test.meta.id);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("edit");
    }
  }, [test]);

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
      {questions.map((q, qi) => {
        const isGenerating = generatingExplanations.has(`${group}-${itemIndex}-${qi}`);
        return (
          <div key={q.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-gray-500">Q{q.number}</span>
              <span className="rounded-full bg-white border px-2 py-0.5 text-[10px] text-gray-500">{q.type}</span>
            </div>
            <button
              onClick={() => generateExplanations(group, itemIndex, qi)}
              disabled={isGenerating}
              className="text-[11px] px-2 py-1 rounded bg-violet-100 text-violet-700 hover:bg-violet-200 disabled:opacity-50 font-medium"
            >
              {isGenerating ? "생성 중…" : "🤖 해석 생성"}
            </button>
          </div>
          <textarea
            rows={2}
            className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
            value={q.stem}
            onChange={(e) => setQuestionStem(group, itemIndex, qi, e.target.value)}
          />
          <div className="space-y-2">
            {q.choices.map((c: any, ci: number) => (
              <div key={c.id} className={`rounded border p-2 space-y-1.5 transition ${c.isCorrect ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-white hover:border-gray-300"}`}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`${group}-${itemIndex}-${qi}-correct`}
                    checked={c.isCorrect === true}
                    onChange={() => setCorrectChoice(group, itemIndex, qi, ci)}
                    className="shrink-0"
                  />
                  <input
                    className="flex-1 bg-transparent focus:outline-none text-xs"
                    placeholder="선택지 텍스트"
                    value={c.text}
                    onChange={(e) => setChoiceText(group, itemIndex, qi, ci, e.target.value)}
                  />
                  {c.isCorrect && <span className="shrink-0 text-[10px] font-semibold text-emerald-600">✓ 정답</span>}
                </label>
                <textarea
                  className="w-full rounded border border-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                  rows={2}
                  placeholder="이 선택지에 대한 해석/설명을 입력하세요"
                  value={c.explanation || ""}
                  onChange={(e) => setChoiceExplanation(group, itemIndex, qi, ci, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
        );
      })}
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
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">필드별 💡 추천을 누르거나, 한 번에 전체를 채울 수 있습니다.</p>
          <button
            type="button"
            onClick={handleAutoFillAll}
            disabled={autoFilling || phase === "generating"}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            {autoFilling ? "채우는 중…" : "🎲 빈 주제 전체 자동채우기"}
          </button>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">📘 Module 1 (공통, 20~33문항 가변)</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {MODULE1_TOPIC_FIELDS.map((field) => (
              <TopicInput
                key={field.key}
                field={field}
                value={topics[field.key]}
                onChange={(v) => setTopic(field.key, v)}
                disabled={phase === "generating"}
                loadingSuggestion={!!loadingSuggestions[field.key]}
                onSuggest={() => handleSuggestTopics(field)}
                suggestionList={suggestions[field.key] ?? []}
                onSelectSuggestion={(topic) => handleSelectSuggestion(field.key, topic)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-gray-900">
            🟢 Module 2 - Lower (5~8문항) + 🔴 Module 2 - Upper (5문항){" "}
            <span className="text-[11px] font-normal text-gray-400">(Lower: Daily Life 2개, Upper: Academic 1개)</span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MODULE2_TOPIC_FIELDS.map((field) => (
              <TopicInput
                key={field.key}
                field={field}
                value={topics[field.key]}
                onChange={(v) => setTopic(field.key, v)}
                disabled={phase === "generating"}
                loadingSuggestion={!!loadingSuggestions[field.key]}
                onSuggest={() => handleSuggestTopics(field)}
                suggestionList={suggestions[field.key] ?? []}
                onSelectSuggestion={(topic) => handleSelectSuggestion(field.key, topic)}
              />
            ))}
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
          <p className="text-xs text-gray-500 animate-pulse">Claude가 Module 1(20~33문항) + Module 2 Lower(15문항) + Module 2 Upper(15문항)를 생성 중입니다 (2~3분 정도 걸립니다, 새로고침하지 말고 기다려주세요)…</p>
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

          {renderGroup("module1", "📘 Module 1 (공통 Routing, 20~33문항 가변)", "bg-violet-50")}
          {renderGroup("hard", "🔴 Module 2 - Upper (15문항: CW+Academic)", "bg-amber-50")}
          {renderGroup("easy", "🟢 Module 2 - Lower (15문항: CW+Daily Life)", "bg-blue-50")}

          {/* Actions — 저장 즉시 배정 가능한 상태가 됩니다. 별도 Lock 단계 없음.
              배정이 하나라도 생기면 이후 저장은 서버에서 자동으로 막힙니다. */}
          <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-400">
              {savedId ? `저장됨 (ID: ${savedId.slice(0, 8)}…) · 바로 배정 가능합니다.` : "아직 저장되지 않았습니다."}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={phase === "saving"}
                className="rounded-lg border border-emerald-500 bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {phase === "saving" ? "저장 중…" : "저장"}
              </button>
              {savedId && (
                <button
                  onClick={() => router.push("/admin/content/updated-reading/assign")}
                  className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50"
                >
                  배정하러 가기 →
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
