// components/reading/MockTestPlayer.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReadingTestLayout2026 from "./ReadingTestLayout2026";
import type {
  RReadingTest2026,
  RReadingModule,
  RAcademicPassageItem,
  RCompleteWordsItem,
  RDailyLifeItem,
  RQuestion,
  RChoice,
} from "@/models/reading";

// ── Types ──────────────────────────────────────────────────────────────

type FlatQuestion = {
  globalIdx: number;
  passageIdx: number;
  passageTitle: string;
  passageHtml: string;
  passageContentHtml?: string; // daily_life 전용
  passageKind: "academic_passage" | "daily_life";
  id: string;
  number: number;
  stem: string;
  type: RQuestion["type"];
  choices: { id: string; text: string; isCorrect: boolean }[];
  isSummary: boolean;
  summaryCorrectIndices: number[];
  summarySelectionCount: number;
  stage: 1 | 2;
};

/** Stage 1 score decides which Stage 2 module students receive. */
export type AdaptiveConfig = {
  /** Fraction of Stage 1 correct answers required for the Hard module, e.g. 0.7 */
  cutScore: number;
  stage2Easy: RReadingModule;
  stage2Hard: RReadingModule;
};

type Phase =
  | "direction"
  | "complete_words" // Complete the Words tasks before stage1
  | "stage1_testing"
  | "stage_break"   // neutral break between stages; student doesn't see difficulty
  | "stage2_testing"
  | "review"
  | "result";

type ScoreRow = {
  type: string;
  label: string;
  correct: number;
  total: number;
};

// ── Constants ──────────────────────────────────────────────────────────

const STAGE1_SECONDS = 18 * 60;
const STAGE2_SECONDS = 17 * 60;

const Q_TYPE_LABELS: Record<string, string> = {
  vocab: "어휘",
  detail: "세부사항",
  negative_detail: "세부사항(부정)",
  inference: "추론",
  purpose: "수사적 목적",
  pronoun_ref: "지시어",
  insertion: "문장 삽입",
  paraphrasing: "패러프레이징",
  sentence_simplify: "문장 단순화",
  summary: "요약",
  organization: "구성",
};

// ── Helpers ────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function flattenModule(
  mod: RReadingModule,
  stage: 1 | 2,
  passageOffset = 0,
  globalOffset = 0
): FlatQuestion[] {
  const result: FlatQuestion[] = [];
  let passageIdx = passageOffset;
  let globalIdx = globalOffset;

  for (const item of mod.items) {
    if (item.taskKind === "academic_passage") {
      const passage = item as RAcademicPassageItem;
      const title = (passage as any).title ?? `Passage ${passageIdx + 1}`;

      for (const q of passage.questions ?? []) {
        const meta = (q.meta ?? {}) as any;
        const summaryMeta = meta.summary ?? {};
        const isSummary = q.type === "summary";

        result.push({
          globalIdx,
          passageIdx,
          passageTitle: title,
          passageHtml: passage.passageHtml ?? "",
          passageKind: "academic_passage",
          id: q.id,
          number: q.number,
          stem: q.stem,
          type: q.type,
          choices: (q.choices ?? []).map((c: RChoice) => ({
            id: c.id,
            text: c.text,
            isCorrect: !!(c as any).isCorrect,
          })),
          isSummary,
          summaryCorrectIndices: summaryMeta.correct ?? [],
          summarySelectionCount: summaryMeta.selectionCount ?? 3,
          stage,
        });

        globalIdx++;
      }

      passageIdx++;
    } else if (item.taskKind === "daily_life") {
      const dl = item as RDailyLifeItem;
      const title = (dl as any).title ?? `Daily Life ${passageIdx + 1}`;

      for (const q of dl.questions ?? []) {
        const meta = (q.meta ?? {}) as any;
        const summaryMeta = meta.summary ?? {};
        const isSummary = q.type === "summary";

        result.push({
          globalIdx,
          passageIdx,
          passageTitle: title,
          passageHtml: "",
          passageContentHtml: dl.contentHtml ?? "",
          passageKind: "daily_life",
          id: q.id,
          number: q.number,
          stem: q.stem,
          type: q.type,
          choices: (q.choices ?? []).map((c: RChoice) => ({
            id: c.id,
            text: c.text,
            isCorrect: !!(c as any).isCorrect,
          })),
          isSummary,
          summaryCorrectIndices: summaryMeta.correct ?? [],
          summarySelectionCount: summaryMeta.selectionCount ?? 3,
          stage,
        });

        globalIdx++;
      }

      passageIdx++;
    }
  }

  return result;
}

function computeStage1Score(
  questions: FlatQuestion[],
  answers: Record<string, string | string[]>
): { correct: number; total: number } {
  const s1qs = questions.filter((q) => q.stage === 1);
  let correct = 0;
  for (const q of s1qs) {
    const ans = answers[q.id];
    if (q.isSummary) {
      const selected = (Array.isArray(ans) ? ans : []).map((id) =>
        q.choices.findIndex((c) => c.id === id)
      );
      const correctSet = new Set(q.summaryCorrectIndices);
      if (
        selected.length === q.summarySelectionCount &&
        selected.every((i) => correctSet.has(i))
      )
        correct++;
    } else {
      const chosen = q.choices.find((c) => c.id === ans);
      if (chosen?.isCorrect) correct++;
    }
  }
  return { correct, total: s1qs.length };
}

function scoreAnswers(
  questions: FlatQuestion[],
  answers: Record<string, string | string[]>
): { total: number; correct: number; rows: ScoreRow[]; stage1: { correct: number; total: number }; stage2: { correct: number; total: number } } {
  const byType: Record<string, { correct: number; total: number }> = {};
  let totalCorrect = 0;
  let s1Correct = 0, s1Total = 0, s2Correct = 0, s2Total = 0;

  for (const q of questions) {
    const ans = answers[q.id];
    let isCorrect = false;

    if (q.isSummary) {
      const selected = (Array.isArray(ans) ? ans : []).map((id) =>
        q.choices.findIndex((c) => c.id === id)
      );
      const correctSet = new Set(q.summaryCorrectIndices);
      isCorrect =
        selected.length === q.summarySelectionCount &&
        selected.every((i) => correctSet.has(i));
    } else {
      isCorrect = !!q.choices.find((c) => c.id === ans)?.isCorrect;
    }

    if (isCorrect) totalCorrect++;
    if (q.stage === 1) { s1Total++; if (isCorrect) s1Correct++; }
    else { s2Total++; if (isCorrect) s2Correct++; }

    const key = q.type;
    if (!byType[key]) byType[key] = { correct: 0, total: 0 };
    byType[key].total++;
    if (isCorrect) byType[key].correct++;
  }

  const rows: ScoreRow[] = Object.entries(byType).map(([type, v]) => ({
    type,
    label: Q_TYPE_LABELS[type] ?? type,
    correct: v.correct,
    total: v.total,
  }));

  return {
    total: questions.length,
    correct: totalCorrect,
    rows,
    stage1: { correct: s1Correct, total: s1Total },
    stage2: { correct: s2Correct, total: s2Total },
  };
}

// ── Props ──────────────────────────────────────────────────────────────

type Props = {
  testId: string;
  label: string;
  test: RReadingTest2026;
  /** When provided, Stage 1 score routes to Easy or Hard Stage 2 module. */
  adaptiveConfig?: AdaptiveConfig;
  onFinish?: (payload: {
    testId: string;
    isAdaptive: boolean;
    stage2Difficulty?: "easy" | "hard";
    answers: { questionId: string; chosenChoiceId: string | string[] | null }[];
    finishedAt: string;
  }) => void | Promise<void>;
};

// ── Main Component ─────────────────────────────────────────────────────

export default function MockTestPlayer({
  testId,
  label,
  test,
  adaptiveConfig,
  onFinish,
}: Props) {
  // test.stage2Pool이 있으면 adaptive, 없으면 non-adaptive
  const resolvedAdaptiveConfig = adaptiveConfig ?? (test.stage2Pool ? {
    cutScore: test.stage2Pool.cutScore,
    stage2Easy: test.stage2Pool.easy,
    stage2Hard: test.stage2Pool.hard,
  } : undefined);
  const isAdaptive = !!resolvedAdaptiveConfig;

  // Complete the Words items — collected from both modules
  const cwItems = useMemo<RCompleteWordsItem[]>(() => {
    const result: RCompleteWordsItem[] = [];
    for (const mod of test.modules) {
      for (const item of mod.items) {
        if (item.taskKind === "complete_words") result.push(item as RCompleteWordsItem);
      }
    }
    return result;
  }, [test.modules]);

  // Stage 1 questions — always from test.modules[0]
  const stage1Questions = useMemo(
    () => flattenModule(test.modules[0], 1, 0, 0),
    [test.modules]
  );

  const [phase, setPhase] = useState<Phase>(cwItems.length > 0 ? "direction" : "direction");
  const [cwIdx, setCwIdx] = useState(0); // which complete_words item we're on
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(STAGE1_SECONDS);
  const [showNavGrid, setShowNavGrid] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Adaptive: which stage2 module was selected
  const [stage2Difficulty, setStage2Difficulty] = useState<"easy" | "hard" | null>(null);
  const [stage2Questions, setStage2Questions] = useState<FlatQuestion[]>([]);

  // Final flat list (stage1 + decided stage2)
  const allQuestions = useMemo<FlatQuestion[]>(
    () =>
      phase === "stage1_testing" || phase === "stage_break"
        ? stage1Questions
        : [...stage1Questions, ...stage2Questions],
    [phase, stage1Questions, stage2Questions]
  );

  // Questions for the current active stage
  const activeQuestions = useMemo<FlatQuestion[]>(() => {
    if (phase === "stage1_testing") return stage1Questions;
    if (phase === "stage2_testing" || phase === "review" || phase === "result")
      return allQuestions;
    return stage1Questions;
  }, [phase, stage1Questions, allQuestions]);

  const [score, setScore] = useState<ReturnType<typeof scoreAnswers> | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const passagePaneRef = useRef<HTMLDivElement>(null);

  // Timer — resets when stage changes
  useEffect(() => {
    if (phase !== "stage1_testing" && phase !== "stage2_testing") return;

    setSecondsLeft(phase === "stage1_testing" ? STAGE1_SECONDS : STAGE2_SECONDS);

    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          if (phase === "stage1_testing") advanceToBreak();
          else triggerFinish();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Scroll passage to top on passage change
  const currentQ = activeQuestions[currentIdx] as FlatQuestion | undefined;
  const prevPassageIdx = useRef<number>(-1);
  useEffect(() => {
    if (!currentQ) return;
    if (currentQ.passageIdx !== prevPassageIdx.current) {
      passagePaneRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      prevPassageIdx.current = currentQ.passageIdx;
    }
  }, [currentQ]);

  // ── Stage transitions ──────────────────────────────────────────────

  function advanceToBreak() {
    clearInterval(timerRef.current!);

    const passageOffset = (stage1Questions.at(-1)?.passageIdx ?? -1) + 1;
    const qOffset = stage1Questions.length;

    if (!isAdaptive) {
      const s2qs = flattenModule(test.modules[1], 2, passageOffset, qOffset);
      setStage2Questions(s2qs);
      setStage2Difficulty(null);
      setPhase("stage_break");
    } else {
      const { correct, total } = computeStage1Score(stage1Questions, answers);
      const fraction = total > 0 ? correct / total : 0;
      const difficulty = fraction >= resolvedAdaptiveConfig!.cutScore ? "hard" : "easy";
      const mod = difficulty === "hard"
        ? resolvedAdaptiveConfig!.stage2Hard
        : resolvedAdaptiveConfig!.stage2Easy;

      const s2qs = flattenModule(mod, 2, passageOffset, qOffset);
      setStage2Questions(s2qs);
      setStage2Difficulty(difficulty);
      setPhase("stage_break");
    }
  }

  function startStage2() {
    setCurrentIdx(stage1Questions.length); // jump to first stage2 question
    setPhase("stage2_testing");
  }

  const triggerFinish = useCallback(async () => {
    if (phase === "result") return;
    clearInterval(timerRef.current!);

    const finalQs = [...stage1Questions, ...stage2Questions];
    const computed = scoreAnswers(finalQs, answers);
    setScore(computed);
    setPhase("result");

    setSubmitting(true);
    // Complete Words answers: keys starting with "cw__"
    const cwAnswers = Object.entries(answers)
      .filter(([k]) => k.startsWith("cw__"))
      .map(([questionId, chosenChoiceId]) => ({ questionId, chosenChoiceId: chosenChoiceId as string }));

    const payload = {
      testId,
      isAdaptive,
      stage2Difficulty: stage2Difficulty ?? undefined,
      answers: [
        ...cwAnswers,
        ...finalQs.map((q) => ({
          questionId: q.id,
          chosenChoiceId: answers[q.id] ?? null,
        })),
      ],
      finishedAt: new Date().toISOString(),
    };

    try {
      if (onFinish) {
        await onFinish(payload);
      } else {
        await fetch("/api/updated-reading/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }, [phase, stage1Questions, stage2Questions, answers, testId, isAdaptive, stage2Difficulty, onFinish]);

  // ── Answer handlers ────────────────────────────────────────────────

  function handleSelect(choiceId: string) {
    if (!currentQ) return;
    setAnswers((prev) => ({ ...prev, [currentQ.id]: choiceId }));
  }

  function handleSummaryToggle(choiceId: string) {
    if (!currentQ) return;
    setAnswers((prev) => {
      const current = (prev[currentQ.id] as string[] | undefined) ?? [];
      const max = currentQ.summarySelectionCount;
      if (current.includes(choiceId))
        return { ...prev, [currentQ.id]: current.filter((id) => id !== choiceId) };
      if (current.length >= max) return prev;
      return { ...prev, [currentQ.id]: [...current, choiceId] };
    });
  }

  function toggleFlag() {
    if (!currentQ) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) next.delete(currentQ.id);
      else next.add(currentQ.id);
      return next;
    });
  }

  function goTo(idx: number) {
    if (idx < 0 || idx >= activeQuestions.length) return;
    setCurrentIdx(idx);
    setShowNavGrid(false);
  }

  function goNext() {
    const questions = phase === "stage1_testing" ? stage1Questions : activeQuestions;
    const localMax = questions.length - 1;
    const localIdx =
      phase === "stage1_testing" ? currentIdx : currentIdx - stage1Questions.length;

    if (phase === "stage1_testing" && localIdx >= localMax) {
      advanceToBreak();
    } else if (phase === "stage2_testing" && currentIdx >= activeQuestions.length - 1) {
      setPhase("review");
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  function goPrev() {
    if (currentIdx > (phase === "stage2_testing" ? stage1Questions.length : 0)) {
      setCurrentIdx((i) => i - 1);
    }
  }

  const answeredCount = Object.keys(answers).filter((id) =>
    activeQuestions.some((q) => q.id === id)
  ).length;
  const isWarning = secondsLeft <= 300 && (phase === "stage1_testing" || phase === "stage2_testing");

  // ── Direction Screen ───────────────────────────────────────────────

  if (phase === "direction") {
    const totalMinutes = isAdaptive ? 35 : 35;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-12">
        <div className="w-full max-w-xl rounded-xl border bg-white p-8 shadow-sm">
          <h1 className="mb-1 text-xl font-bold">{label}</h1>
          <p className="mb-6 text-sm text-gray-500">TOEFL Reading — Mock Test</p>

          <ul className="mb-8 space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-gray-400">•</span>
              총 <strong>2 Modules</strong>, 제한 시간 <strong>{totalMinutes}분</strong> (Module 1: 18분 · Module 2: 17분)
            </li>
            {isAdaptive && (
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-gray-400">•</span>
                Module 1 성적에 따라 Module 2 난이도가 결정됩니다.
              </li>
            )}
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-gray-400">•</span>
              지문은 왼쪽, 문제는 오른쪽에 표시됩니다.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-gray-400">•</span>
              번호 그리드로 자유롭게 이동하거나 ⚑ 로 플래그를 달 수 있습니다.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-gray-400">•</span>
              시간이 종료되거나 <strong>검토/제출</strong>을 누르면 자동 채점됩니다.
            </li>
          </ul>

          <button
            onClick={() => {
              setCurrentIdx(0);
              if (cwItems.length > 0) {
                setCwIdx(0);
                setPhase("complete_words");
              } else {
                setPhase("stage1_testing");
              }
            }}
            className="w-full rounded-lg bg-black py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            시험 시작
          </button>
        </div>
      </div>
    );
  }

  // ── Complete the Words Screen ──────────────────────────────────────

  if (phase === "complete_words") {
    const cwItem = cwItems[cwIdx];
    if (!cwItem) {
      setPhase("stage1_testing");
      return null;
    }

    function cwKey(blankId: string) {
      return `cw__${cwItem.id}__${blankId}`;
    }

    function setCwAnswer(blankId: string, val: string) {
      setAnswers((prev) => ({ ...prev, [cwKey(blankId)]: val }));
    }

    const allFilled = cwItem.blanks.every((b) => !!((answers[cwKey(b.id)] as string) ?? "").trim());

    function goNextCw() {
      if (cwIdx < cwItems.length - 1) {
        setCwIdx((i) => i + 1);
      } else {
        setPhase("stage1_testing");
      }
    }

    // 지문 내 __ 마커를 인라인 인풋으로 교체
    // 예: "peo__ple" → "peo" + <input maxLength=3> + "ple"
    function renderParagraph() {
      const plain = cwItem.paragraphHtml.replace(/<[^>]+>/g, "");
      const parts = plain.split("__");
      return (
        <p style={{ fontSize: 16, lineHeight: 2, color: "#1A1A1A", whiteSpace: "pre-wrap" }}>
          {parts.map((part, i) => {
            const blank = cwItem.blanks[i];
            const val = (answers[cwKey(blank?.id ?? "")] ?? "") as string;
            const isCorrectLen = blank && val.length === blank.correctToken.length;
            return (
              <span key={i}>
                {part}
                {blank && (
                  <input
                    type="text"
                    maxLength={blank.correctToken.length || 8}
                    value={val}
                    onChange={(e) => setCwAnswer(blank.id, e.target.value)}
                    style={{
                      display: "inline-block",
                      width: Math.max(blank.correctToken.length * 11, 36),
                      height: 24,
                      borderTop: "none", borderLeft: "none", borderRight: "none",
                      borderBottom: `2px solid ${isCorrectLen ? "#22C55E" : "#1A2B4C"}`,
                      backgroundColor: "#F4F6F9",
                      textAlign: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#1A2B4C",
                      outline: "none",
                      margin: "0 2px",
                      verticalAlign: "middle",
                      letterSpacing: 2,
                    }}
                  />
                )}
              </span>
            );
          })}
        </p>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", fontFamily: "Arial, Helvetica, sans-serif" }}>
        {/* ETS Header */}
        <header style={{
          height: 60, backgroundColor: "#1A2B4C",
          display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>{label}</span>
            <span style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "#FFFFFF", fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20 }}>
              COMPLETE THE WORDS {cwIdx + 1}/{cwItems.length}
            </span>
          </div>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>Reading 시작 전</span>
        </header>

        {/* Body */}
        <div style={{ flex: 1, backgroundColor: "#F4F6F9", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ width: "100%", maxWidth: 900, backgroundColor: "#FFFFFF", borderRadius: 8, padding: 48, boxShadow: "0 1px 6px rgba(0,0,0,0.08)" }}>

            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1A2B4C", marginBottom: 6 }}>Complete the Words</h2>
              <p style={{ fontSize: 14, color: "#666" }}>
                각 빈칸에 단어의 나머지 철자를 입력하세요. 빈칸을 모두 채운 뒤 다음으로 이동합니다.
              </p>
            </div>

            {/* 지문 + 인라인 인풋 */}
            <div style={{ backgroundColor: "#F8F9FB", border: "1px solid #E8ECF0", borderRadius: 6, padding: "24px 28px", marginBottom: 32 }}>
              {renderParagraph()}
            </div>

            {/* 진행률 */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#888", marginBottom: 6 }}>
                <span>진행률</span>
                <span>{cwItem.blanks.filter((b) => !!((answers[cwKey(b.id)] as string) ?? "").trim()).length} / {cwItem.blanks.length}</span>
              </div>
              <div style={{ height: 6, backgroundColor: "#E8ECF0", borderRadius: 3, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 3, backgroundColor: "#0073E6",
                  width: `${(cwItem.blanks.filter((b) => !!((answers[cwKey(b.id)] as string) ?? "").trim()).length / cwItem.blanks.length) * 100}%`,
                  transition: "width 0.3s",
                }} />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button
                onClick={() => cwIdx > 0 ? setCwIdx((i) => i - 1) : setPhase("direction")}
                style={{ height: 40, padding: "0 20px", fontSize: 13, fontWeight: 600, border: "1px solid #D0D5DD", borderRadius: 4, backgroundColor: "#FFFFFF", cursor: "pointer" }}
              >
                ← 이전
              </button>
              <button
                onClick={goNextCw}
                style={{ height: 40, padding: "0 28px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: 4, backgroundColor: "#0073E6", color: "#FFFFFF", cursor: "pointer" }}
              >
                {cwIdx < cwItems.length - 1 ? "다음 →" : "Reading 시작 →"}
              </button>
            </div>
          </div>
        </div>

        {/* ETS Footer */}
        <footer style={{ height: 60, backgroundColor: "#F4F6F9", borderTop: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
          <span style={{ fontSize: 14, color: "#555" }}>
            {allFilled ? "✓ 모든 빈칸 완료" : `빈칸 ${cwItem.blanks.filter((b) => !((answers[cwKey(b.id)] as string) ?? "").trim()).length}개 남음`}
          </span>
        </footer>
      </div>
    );
  }

  // ── Stage Break Screen ─────────────────────────────────────────────

  if (phase === "stage_break") {
    const s1Answered = stage1Questions.filter((q) => !!answers[q.id]).length;
    const s1Total = stage1Questions.length;
    const s1Flagged = stage1Questions.filter((q) => flagged.has(q.id)).length;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#f5f7f8] px-4 py-12">
        <div className="w-full max-w-lg">

          {/* 완료 배지 */}
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">완료</p>
              <p className="text-lg font-bold leading-tight">Module 1</p>
            </div>
          </div>

          {/* Module 1 요약 카드 */}
          <div className="mb-4 rounded-xl border bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Module 1 요약</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-gray-50 py-3">
                <p className="text-2xl font-black">{s1Answered}</p>
                <p className="text-[11px] text-gray-500">응답</p>
              </div>
              <div className={[
                "rounded-lg py-3",
                s1Total - s1Answered > 0 ? "bg-amber-50" : "bg-gray-50",
              ].join(" ")}>
                <p className={[
                  "text-2xl font-black",
                  s1Total - s1Answered > 0 ? "text-amber-600" : "",
                ].join(" ")}>
                  {s1Total - s1Answered}
                </p>
                <p className="text-[11px] text-gray-500">미응답</p>
              </div>
              <div className={[
                "rounded-lg py-3",
                s1Flagged > 0 ? "bg-amber-50" : "bg-gray-50",
              ].join(" ")}>
                <p className={[
                  "text-2xl font-black",
                  s1Flagged > 0 ? "text-amber-500" : "",
                ].join(" ")}>
                  {s1Flagged}
                </p>
                <p className="text-[11px] text-gray-500">플래그</p>
              </div>
            </div>

            {/* Module 1으로 돌아가기 — 미응답이 있을 때만 강조 */}
            {(s1Total - s1Answered > 0 || s1Flagged > 0) && (
              <button
                onClick={() => {
                  const firstUnanswered = stage1Questions.find((q) => !answers[q.id]);
                  setCurrentIdx(firstUnanswered ? firstUnanswered.globalIdx : 0);
                  setPhase("stage1_testing");
                }}
                className="mt-3 w-full rounded-lg border border-amber-300 bg-amber-50 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                ← Module 1로 돌아가기
              </button>
            )}
          </div>

          {/* Module 2 예고 카드 */}
          <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">다음</p>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-bold">Module 2</p>
              <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                17:00
              </span>
            </div>
            <ul className="space-y-1.5 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                새로운 지문 1개 · {stage2Questions.length}문항
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                시작 버튼을 누르는 즉시 타이머가 시작됩니다.
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                Module 2 진행 중에는 Module 1으로 돌아갈 수 없습니다.
              </li>
            </ul>
          </div>

          <button
            onClick={startStage2}
            className="w-full rounded-xl bg-black py-3 text-sm font-bold text-white hover:bg-gray-800"
          >
            Module 2 시작 →
          </button>
        </div>
      </div>
    );
  }

  // ── Result Screen ──────────────────────────────────────────────────

  if (phase === "result" && score) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <h2 className="mb-1 text-xl font-bold">채점 완료</h2>
          <p className="mb-6 text-sm text-gray-500">{label}</p>

          {/* 총점 */}
          <div className="mb-6 flex items-end gap-3">
            <span className="text-5xl font-black">{score.correct}</span>
            <span className="mb-1 text-xl text-gray-400">/ {score.total}</span>
            <span className="mb-1 ml-auto text-2xl font-bold text-blue-600">{pct}%</span>
          </div>

          {/* 진행바 */}
          <div className="mb-6 h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Module별 점수 */}
          {score.stage1.total > 0 && (
            <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border bg-gray-50 p-3">
                <p className="mb-1 text-xs font-semibold text-gray-400">Module 1</p>
                <p className="text-lg font-bold">
                  {score.stage1.correct}/{score.stage1.total}
                </p>
                <p className="text-xs text-gray-500">
                  {Math.round((score.stage1.correct / score.stage1.total) * 100)}%
                </p>
              </div>
              <div className={[
                "rounded-lg border p-3",
                stage2Difficulty === "hard" ? "bg-red-50 border-red-200" : "bg-sky-50 border-sky-200",
              ].join(" ")}>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                  Module 2
                  {stage2Difficulty && (
                    <span className={[
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase",
                      stage2Difficulty === "hard"
                        ? "bg-red-100 text-red-600"
                        : "bg-sky-100 text-sky-600",
                    ].join(" ")}>
                      {stage2Difficulty}
                    </span>
                  )}
                </p>
                <p className="text-lg font-bold">
                  {score.stage2.correct}/{score.stage2.total}
                </p>
                <p className="text-xs text-gray-500">
                  {score.stage2.total > 0
                    ? Math.round((score.stage2.correct / score.stage2.total) * 100)
                    : 0}%
                </p>
              </div>
            </div>
          )}

          {/* 유형별 */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="pb-2 font-medium">문제 유형</th>
                <th className="pb-2 text-right font-medium">정답</th>
                <th className="pb-2 text-right font-medium">정답률</th>
              </tr>
            </thead>
            <tbody>
              {score.rows.map((row) => (
                <tr key={row.type} className="border-b last:border-0">
                  <td className="py-2">{row.label}</td>
                  <td className="py-2 text-right">
                    {row.correct}/{row.total}
                  </td>
                  <td className="py-2 text-right font-medium">
                    {Math.round((row.correct / row.total) * 100)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {submitting && (
            <p className="mt-4 text-xs text-gray-400">결과 저장 중…</p>
          )}
        </div>
      </div>
    );
  }

  // ── Review Screen ──────────────────────────────────────────────────

  if (phase === "review") {
    const reviewQs = [...stage1Questions, ...stage2Questions];
    const unanswered = reviewQs.filter((q) => !answers[q.id]);

    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <h2 className="mb-1 text-xl font-bold">검토</h2>
          <p className="mb-6 text-sm text-gray-500">
            제출 전 최종 확인. 미응답 또는 플래그 문제를 확인하세요.
          </p>

          {unanswered.length > 0 && (
            <div className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
              미응답 {unanswered.length}문항:{" "}
              {unanswered.map((q) => q.number).join(", ")}
            </div>
          )}

          {/* Module 1 */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Module 1
          </p>
          <div className="mb-4 grid grid-cols-10 gap-1.5">
            {stage1Questions.map((q) => {
              const answered = !!answers[q.id];
              const isFlagged = flagged.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIdx(q.globalIdx);
                    setPhase("stage1_testing");
                  }}
                  className={[
                    "flex h-8 w-full items-center justify-center rounded text-xs font-medium transition",
                    answered ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500",
                    isFlagged ? "ring-2 ring-amber-400" : "",
                  ].join(" ")}
                >
                  {q.number}
                </button>
              );
            })}
          </div>

          {/* Module 2 */}
          {stage2Questions.length > 0 && (
            <>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Module 2
              </p>
              <div className="mb-6 grid grid-cols-10 gap-1.5">
                {stage2Questions.map((q) => {
                  const answered = !!answers[q.id];
                  const isFlagged = flagged.has(q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIdx(q.globalIdx);
                        setPhase("stage2_testing");
                      }}
                      className={[
                        "flex h-8 w-full items-center justify-center rounded text-xs font-medium transition",
                        answered ? "bg-indigo-500 text-white" : "bg-gray-100 text-gray-500",
                        isFlagged ? "ring-2 ring-amber-400" : "",
                      ].join(" ")}
                    >
                      {q.number}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCurrentIdx(stage1Questions.length);
                setPhase("stage2_testing");
              }}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              돌아가기
            </button>
            <button
              onClick={triggerFinish}
              className="ml-auto rounded-lg bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              제출하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Testing Screen (Stage 1 & 2) ───────────────────────────────────

  if (!currentQ) return null;

  const isStage1 = phase === "stage1_testing";
  const stageQuestions = isStage1 ? stage1Questions : stage2Questions;
  const stageLocalIdx = isStage1
    ? currentIdx
    : currentIdx - stage1Questions.length;
  const stageTotal = stageQuestions.length;

  const currentAnswer = answers[currentQ.id];
  const isFlagged = flagged.has(currentQ.id);
  const isLastInStage = stageLocalIdx >= stageTotal - 1;

  const header = (
    <>
      {/* 좌: 라벨 + 모듈 배지 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>{label}</span>
        <span style={{
          backgroundColor: isStage1 ? "rgba(255,255,255,0.15)" : "#4F6BCD",
          color: "#FFFFFF", fontSize: 11, fontWeight: 700,
          padding: "2px 10px", borderRadius: 20, letterSpacing: 1,
        }}>
          MODULE {isStage1 ? "1" : "2"}
        </span>
      </div>

      {/* 우: 버튼들 */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => setShowNavGrid((v) => !v)}
          style={{
            height: 32, padding: "0 14px", fontSize: 12, fontWeight: 500,
            border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4,
            backgroundColor: "transparent", color: "#FFFFFF", cursor: "pointer",
          }}
        >
          문제 목록
        </button>
        {isStage1 ? (
          <button
            onClick={advanceToBreak}
            style={{
              height: 32, padding: "0 16px", fontSize: 12, fontWeight: 700,
              border: "none", borderRadius: 4,
              backgroundColor: "#0073E6", color: "#FFFFFF", cursor: "pointer",
            }}
          >
            Module 1 완료 →
          </button>
        ) : (
          <button
            onClick={() => setPhase("review")}
            style={{
              height: 32, padding: "0 16px", fontSize: 12, fontWeight: 700,
              border: "none", borderRadius: 4,
              backgroundColor: "#0073E6", color: "#FFFFFF", cursor: "pointer",
            }}
          >
            검토 / 제출
          </button>
        )}
      </div>
    </>
  );

  const passagePane = (
    <div ref={passagePaneRef} style={{ height: "100%", overflowY: "auto" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#888", letterSpacing: 1, textTransform: "uppercase", marginBottom: 16 }}>
        Module {isStage1 ? "1" : "2"} · {currentQ.passageKind === "daily_life" ? "Daily Life" : "Academic Passage"}
      </p>

      {currentQ.passageKind === "daily_life" ? (
        /* Daily Life: graphic card 렌더 */
        <div
          style={{ fontSize: 15, lineHeight: 1.7, color: "#222" }}
          dangerouslySetInnerHTML={{ __html: currentQ.passageContentHtml ?? "" }}
        />
      ) : (
        /* Academic Passage: 기존 prose 렌더 */
        <>
          {currentQ.passageTitle && (
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#111", marginBottom: 20 }}>
              {currentQ.passageTitle}
            </h2>
          )}
          <div
            style={{ fontSize: 16, lineHeight: 1.75, color: "#222" }}
            dangerouslySetInnerHTML={{ __html: currentQ.passageHtml }}
          />
        </>
      )}
    </div>
  );

  const questionPane = (
    <div className="flex h-full flex-col">
      {/* Nav grid overlay */}
      {showNavGrid && (
        <div className="mb-4 rounded-lg border bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium text-gray-500">
            Module {isStage1 ? "1" : "2"} 문제 이동
          </p>
          <div className="grid grid-cols-10 gap-1">
            {stageQuestions.map((q) => {
              const answered = !!answers[q.id];
              const isCurrentQ = q.globalIdx === currentIdx;
              const qFlagged = flagged.has(q.id);
              return (
                <button
                  key={q.id}
                  onClick={() => goTo(q.globalIdx)}
                  className={[
                    "flex h-7 w-full items-center justify-center rounded text-xs font-medium transition",
                    isCurrentQ
                      ? "bg-black text-white"
                      : answered
                      ? isStage1
                        ? "bg-blue-100 text-blue-700"
                        : "bg-indigo-100 text-indigo-700"
                      : "border bg-white text-gray-500",
                    qFlagged ? "ring-2 ring-amber-400" : "",
                  ].join(" ")}
                >
                  {q.number}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className={[
                "inline-block h-3 w-3 rounded",
                isStage1 ? "bg-blue-100" : "bg-indigo-100",
              ].join(" ")} /> 응답
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded border bg-white" /> 미응답
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded ring-2 ring-amber-400" /> 플래그
            </span>
          </div>
        </div>
      )}

      {/* Question header */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="mb-0.5 text-xs text-gray-400">
            Q{currentQ.number} · {Q_TYPE_LABELS[currentQ.type] ?? currentQ.type}
          </p>
          <p className="text-sm font-medium leading-snug">{currentQ.stem}</p>
        </div>
        <button
          onClick={toggleFlag}
          title={isFlagged ? "플래그 제거" : "플래그"}
          className={[
            "mt-0.5 shrink-0 rounded-full p-1 text-lg leading-none transition",
            isFlagged ? "text-amber-500" : "text-gray-300 hover:text-amber-400",
          ].join(" ")}
        >
          ⚑
        </button>
      </div>

      {currentQ.isSummary && (
        <p className="mb-3 text-xs text-blue-600">
          {currentQ.summarySelectionCount}개를 선택하세요 (현재{" "}
          {((currentAnswer as string[]) ?? []).length}개)
        </p>
      )}

      {/* Choices */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {currentQ.choices.map((choice, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const isSelected = currentQ.isSummary
            ? ((currentAnswer as string[]) ?? []).includes(choice.id)
            : currentAnswer === choice.id;

          return (
            <button
              key={choice.id}
              type="button"
              onClick={() =>
                currentQ.isSummary
                  ? handleSummaryToggle(choice.id)
                  : handleSelect(choice.id)
              }
              style={{
                display: "flex", alignItems: "flex-start", gap: 12,
                padding: "14px 18px", textAlign: "left",
                border: `1px solid ${isSelected ? "#0073E6" : "#E0E0E0"}`,
                borderRadius: 6,
                backgroundColor: isSelected ? "#E6F0FA" : "#FFFFFF",
                color: "#333333", cursor: "pointer",
                fontSize: 15, fontWeight: isSelected ? 600 : 400,
                transition: "background-color 0.15s, border-color 0.15s",
              }}
            >
              <span style={{ flexShrink: 0, fontWeight: 700, color: isSelected ? "#0073E6" : "#888", fontSize: 14, marginTop: 1 }}>
                {letter}.
              </span>
              <span style={{ lineHeight: 1.5 }}>{choice.text}</span>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 32 }}>
        <button
          onClick={goPrev}
          disabled={stageLocalIdx === 0}
          style={{
            height: 36, padding: "0 18px", fontSize: 13, fontWeight: 600,
            border: "1px solid #D0D5DD", borderRadius: 4,
            backgroundColor: "#FFFFFF", color: stageLocalIdx === 0 ? "#C0C8D0" : "#333",
            cursor: stageLocalIdx === 0 ? "default" : "pointer", opacity: stageLocalIdx === 0 ? 0.5 : 1,
          }}
        >
          &lt; Back
        </button>

        <button
          onClick={goNext}
          style={{
            height: 36, padding: "0 24px", fontSize: 13, fontWeight: 700,
            border: "none", borderRadius: 4,
            backgroundColor: "#0073E6", color: "#FFFFFF", cursor: "pointer",
          }}
        >
          {isLastInStage
            ? isStage1 ? "Module 2 >" : "검토 >"
            : "Next >"}
        </button>
      </div>
    </div>
  );

  const footer = (
    <>
      <span style={{ fontSize: 15, color: "#333" }}>
        Question {stageLocalIdx + 1} of {stageTotal}
        <span style={{ marginLeft: 8, fontSize: 13, color: "#999" }}>
          (Module {isStage1 ? "1" : "2"})
        </span>
      </span>
      <span style={{
        fontSize: 18, fontWeight: 700, color: isWarning ? "#DC2626" : "#333",
        fontFamily: "monospace",
      }}>
        Time Remaining: {formatTime(secondsLeft)}
      </span>
    </>
  );

  return (
    <ReadingTestLayout2026
      header={header}
      left={passagePane}
      right={questionPane}
      footer={footer}
    />
  );
}
