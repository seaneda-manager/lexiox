// components/reading/MockTestPlayer.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { ReadingETSFrame } from "./ReadingETSFrame";
import { DailyLifeContent } from "./DailyLifeCards";
import { StudyLangToggle, useStudyLang } from "@/lib/ui/studyLang";
import type {
  RReadingTest2026,
  RReadingModule,
  RAcademicPassageItem,
  RCompleteWordsItem,
  RDailyLifeItem,
  DailyLifeContextType,
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
  passageContextType?: DailyLifeContextType; // daily_life 전용 (email/notice/social_post/text_message/advertisement/...)
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
  insertionTargetSentence?: string;
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
const STAGE2_SECONDS = 9 * 60;

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
          number: q.number ?? globalIdx + 1,
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
          insertionTargetSentence: meta.insertion?.targetSentence,
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
          passageContextType: dl.contextType,
          passageKind: "daily_life",
          id: q.id,
          number: q.number ?? globalIdx + 1,
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

// ── 실제 ETS 시험 화면 스타일(사진 기준): 청록 헤더, 흰색 둥근 버튼, 가는 제목 + 구분선 ──
const ETS_TEAL = "#1E7B7D";

function EtsVolumeButton() {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 8, height: 36, padding: "0 16px",
        border: "1px solid rgba(255,255,255,0.85)", borderRadius: 6, color: "#FFFFFF",
        fontSize: 13, fontWeight: 700,
      }}
    >
      Volume
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
        <path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
      </svg>
    </span>
  );
}

function EtsHeaderButtonDark({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, borderRadius: 6, cursor: "pointer", border: "none", backgroundColor: ETS_TEAL, color: "#FFFFFF" }}
    >
      {children}
    </button>
  );
}

function EtsHeaderButton({ onClick, children, outline }: { onClick: () => void; children: ReactNode; outline?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, borderRadius: 6, cursor: "pointer",
        border: outline ? "1px solid rgba(255,255,255,0.85)" : "none",
        backgroundColor: outline ? "transparent" : "#FFFFFF",
        color: outline ? "#FFFFFF" : ETS_TEAL,
      }}
    >
      {children}
    </button>
  );
}

type Props = {
  testId: string;
  label: string;
  test: RReadingTest2026;
  /** When provided, Stage 1 score routes to Easy or Hard Stage 2 module. */
  adaptiveConfig?: AdaptiveConfig;
  /** Present when launched from a student assignment — threaded through to onFinish's caller. */
  assignmentId?: string;
  /** "test"(기본): 실제 시험처럼 영어 고정 + 타이머. "study": 같은 화면, 시간 제한 없음 + 정답 확인 + 한/영 전환. */
  mode?: "test" | "study";
  onFinish?: (payload: {
    testId: string;
    assignmentId?: string;
    isAdaptive: boolean;
    stage2Difficulty?: "easy" | "hard";
    answers: { questionId: string; chosenChoiceId: string | string[] | null }[];
    finishedAt: string;
  }) => void | Promise<void>;
};

// ── Autosave (crash/refresh recovery) ───────────────────────────────────

function autosaveKey(testId: string) {
  return `reading2026_autosave__${testId}`;
}

function loadAutosave(testId: string): { answers: Record<string, string | string[]>; flagged: string[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(autosaveKey(testId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ── Study 진행 저장 (이어 풀기) ──────────────────────────────────────────
// 시험 자동저장과 키를 분리한다. 서버 저장은 SQL 초안(docs/sql)이 적용되면 이 헬퍼 뒤에 붙인다.
type StudyProgress = {
  v: 1;
  savedAt: string;
  phase: "direction" | "complete_words" | "stage1_testing" | "stage_break" | "stage2_testing" | "review";
  currentIdx: number;
  cwIdx: number;
  stage2Difficulty: "easy" | "hard" | null;
  answers: Record<string, string | string[]>;
  flagged: string[];
  checked: string[];
};

function studyKey(testId: string) {
  return `reading2026_study__${testId}`;
}

function loadStudyProgress(testId: string): StudyProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(studyKey(testId));
    const parsed = raw ? (JSON.parse(raw) as StudyProgress) : null;
    return parsed && parsed.v === 1 ? parsed : null;
  } catch {
    return null;
  }
}

// ── Main Component ─────────────────────────────────────────────────────

export default function MockTestPlayer({
  testId,
  label,
  test,
  adaptiveConfig,
  assignmentId,
  mode = "test",
  onFinish,
}: Props) {
  const isStudy = mode === "study";
  const { t: studyT, lang } = useStudyLang();
  /** 시험 모드는 항상 영어, Study 모드는 선택한 언어 */
  const tx = (en: string, ko: string) => (isStudy ? studyT(en, ko) : en);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
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
  const [introStep, setIntroStep] = useState(0); // 0~4: Hardware Check → Volume → Microphone → Reading Section → Module 1
  const [breakStep, setBreakStep] = useState(0); // 0: End of Module 1, 1: Module 2 안내
  const [cwIdx, setCwIdx] = useState(0); // which complete_words item we're on
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    () => (mode === "study" ? {} : loadAutosave(testId)?.answers ?? {})
  );
  const [flagged, setFlagged] = useState<Set<string>>(
    () => new Set(mode === "study" ? [] : loadAutosave(testId)?.flagged ?? [])
  );

  // 새로고침/탭 크래시 대비 자동저장 — 답이 바뀔 때마다 로컬에 저장
  useEffect(() => {
    if (typeof window === "undefined" || isStudy) return; // Study는 별도 저장(studyKey)
    if (Object.keys(answers).length === 0 && flagged.size === 0) return;
    try {
      window.localStorage.setItem(
        autosaveKey(testId),
        JSON.stringify({ answers, flagged: Array.from(flagged) })
      );
    } catch {
      // storage full/unavailable — silently skip, in-memory state is still authoritative
    }
  }, [answers, flagged, testId, isStudy]);
  const [secondsLeft, setSecondsLeft] = useState(STAGE1_SECONDS);
  const [showNavGrid, setShowNavGrid] = useState(false);
  // Study 이어 풀기: 저장된 진행이 있으면 시작 전에 "이어서 / 처음부터"를 묻는다.
  const [resumeOffer, setResumeOffer] = useState<StudyProgress | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  useEffect(() => {
    if (!isStudy) return;
    setResumeOffer(loadStudyProgress(testId));
    setResumeChecked(true);
  }, [isStudy, testId]);
  const [submitting, setSubmitting] = useState(false);

  // Adaptive: which stage2 module was selected
  const [stage2Difficulty, setStage2Difficulty] = useState<"easy" | "hard" | null>(null);
  const [stage2Questions, setStage2Questions] = useState<FlatQuestion[]>([]);

  // Study: 답·위치·깃발·정답확인 상태를 바뀔 때마다 저장 (resume 선택 전에는 덮어쓰지 않는다)
  useEffect(() => {
    if (!isStudy || !resumeChecked || resumeOffer) return;
    const savable =
      phase === "complete_words" || phase === "stage1_testing" || phase === "stage_break" ||
      phase === "stage2_testing" || phase === "review";
    if (!savable) return;
    try {
      const data: StudyProgress = {
        v: 1,
        savedAt: new Date().toISOString(),
        phase: phase as StudyProgress["phase"],
        currentIdx,
        cwIdx,
        stage2Difficulty,
        answers,
        flagged: Array.from(flagged),
        checked: Array.from(checkedIds),
      };
      window.localStorage.setItem(studyKey(testId), JSON.stringify(data));
    } catch {
      /* 저장 공간 부족 등 — 메모리 상태가 기준이므로 무시 */
    }
  }, [isStudy, resumeChecked, resumeOffer, phase, currentIdx, cwIdx, stage2Difficulty, answers, flagged, checkedIds, testId]);

  /** 저장된 진행으로 복원한다. 2단계 문항은 저장된 난이도로 다시 만든다. */
  function applyResume(saved: StudyProgress) {
    setAnswers(saved.answers ?? {});
    setFlagged(new Set(saved.flagged ?? []));
    setCheckedIds(new Set(saved.checked ?? []));
    setCwIdx(saved.cwIdx ?? 0);

    const needsStage2 = saved.phase === "stage_break" || saved.phase === "stage2_testing" || saved.phase === "review";
    if (needsStage2) {
      const passageOffset = (stage1Questions.at(-1)?.passageIdx ?? -1) + 1;
      const qOffset = stage1Questions.length;
      let mod = test.modules[1];
      if (resolvedAdaptiveConfig) {
        mod = saved.stage2Difficulty === "easy" ? resolvedAdaptiveConfig.stage2Easy : resolvedAdaptiveConfig.stage2Hard;
      }
      if (mod) setStage2Questions(flattenModule(mod, 2, passageOffset, qOffset));
      setStage2Difficulty(saved.stage2Difficulty ?? null);
    }
    setCurrentIdx(saved.currentIdx ?? 0);
    setBreakStep(saved.phase === "stage_break" ? 1 : 0);
    setPhase(saved.phase);
    setResumeOffer(null);
  }

  function discardResume() {
    try { window.localStorage.removeItem(studyKey(testId)); } catch { /* noop */ }
    setResumeOffer(null);
  }

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
  const [nextSection, setNextSection] = useState<{ href: string; section: string } | null>(null);
  const [groupCompleted, setGroupCompleted] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const passagePaneRef = useRef<HTMLDivElement>(null);

  // Timer — resets when stage changes
  useEffect(() => {
    if (phase !== "stage1_testing" && phase !== "stage2_testing") return;
    if (isStudy) return; // Study 모드: 시간 제한 없음

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
      assignmentId,
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
        const res = await fetch("/api/updated-reading/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (json?.nextSection) {
          setNextSection({ href: json.nextSection.href, section: json.nextSection.section });
        }
        if (json?.groupCompleted) {
          setGroupCompleted(true);
          setGroupId(json.groupId ?? null);
        }
      }
      if (typeof window !== "undefined") {
        try { window.localStorage.removeItem(autosaveKey(testId)); window.localStorage.removeItem(studyKey(testId)); } catch { /* noop */ }
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  }, [phase, stage1Questions, stage2Questions, answers, testId, assignmentId, isAdaptive, stage2Difficulty, onFinish]);

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
  const isWarning = !isStudy && secondsLeft <= 300 && (phase === "stage1_testing" || phase === "stage2_testing");

  // ── Direction Screen ───────────────────────────────────────────────

  if (phase === "direction" && isStudy && resumeOffer) {
    const answeredN = Object.keys(resumeOffer.answers ?? {}).length;
    const when = new Date(resumeOffer.savedAt).toLocaleString();
    return (
      <ReadingETSFrame>
        <header style={{ height: 60, backgroundColor: ETS_TEAL, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "0 24px", flexShrink: 0 }}>
          <StudyLangToggle className="h-9 rounded-md border border-white/80 bg-transparent px-3 text-xs font-bold text-white hover:bg-white/10" />
        </header>
        <div style={{ height: 40, backgroundColor: "#FFFFFF", borderBottom: "1px solid #E0E0E0", display: "flex", alignItems: "center", padding: "0 36px", fontSize: 14, fontWeight: 700, color: "#222", flexShrink: 0 }}>Reading</div>
        <main style={{ flex: 1, backgroundColor: "#FFFFFF", padding: "28px 36px" }}>
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>
              {tx("Resume your study session?", "이어서 학습할까요?")}
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 6 }}>
              {tx(`You have a saved session (${answeredN} answers saved).`, `저장된 학습이 있습니다 (답 ${answeredN}개 저장).`)}
            </p>
            <p style={{ fontSize: 12, color: "#888", marginBottom: 22 }}>{tx("Last saved: ", "마지막 저장: ")}{when}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <EtsHeaderButtonDark onClick={() => applyResume(resumeOffer)}>{tx("Resume", "이어서 하기")}</EtsHeaderButtonDark>
              <button
                type="button"
                onClick={discardResume}
                style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700, color: ETS_TEAL, backgroundColor: "#FFFFFF", border: `1px solid ${ETS_TEAL}`, borderRadius: 6, cursor: "pointer" }}
              >
                {tx("Start over", "처음부터")}
              </button>
            </div>
          </div>
        </main>
      </ReadingETSFrame>
    );
  }

  if (phase === "direction") {
    const beginTest = () => {
      setCurrentIdx(0);
      if (cwItems.length > 0) {
        setCwIdx(0);
        setPhase("complete_words");
      } else {
        setPhase("stage1_testing");
      }
    };

    const Shell = ({
      heading,
      children,
      onBack,
      onNext,
      nextLabel,
      showLang,
    }: {
      heading: string;
      children: ReactNode;
      onBack?: () => void;
      onNext: () => void;
      nextLabel: string;
      showLang?: boolean;
    }) => (
      <ReadingETSFrame>
        <header style={{
          height: 60, backgroundColor: ETS_TEAL, display: "flex",
          alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "0 24px", flexShrink: 0,
        }}>
          {isStudy && showLang !== false && (
            <StudyLangToggle className="h-9 rounded-md border border-white/80 bg-transparent px-3 text-xs font-bold text-white hover:bg-white/10" />
          )}
          {isStudy && onBack && <EtsHeaderButton outline onClick={onBack}>{tx("< Back", "< 이전")}</EtsHeaderButton>}
          {introStep > 0 && <EtsVolumeButton />}
          <EtsHeaderButton onClick={onNext}>{nextLabel}</EtsHeaderButton>
        </header>
        <div style={{ height: 40, backgroundColor: "#FFFFFF", borderBottom: "1px solid #E0E0E0", display: "flex", alignItems: "center", padding: "0 36px", flexShrink: 0, fontSize: 14, fontWeight: 700, color: "#222" }}>
          Reading
        </div>
        <main style={{ flex: 1, overflowY: "auto", backgroundColor: "#FFFFFF", padding: "28px 36px" }}>
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>{heading}</h2>
            {children}
          </div>
        </main>
      </ReadingETSFrame>
    );

    const P = ({ children }: { children: ReactNode }) => (
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 14 }}>{children}</p>
    );
    const th: CSSProperties = { backgroundColor: ETS_TEAL, color: "#FFFFFF", textAlign: "left", padding: "6px 10px", fontWeight: 500, border: "1px solid #222" };
    const td: CSSProperties = { padding: "6px 10px", color: "#222", border: "1px solid #222", verticalAlign: "top" };

    // 시험 시작 전 순서(실제 화면 기준): Hardware Check → Volume → Microphone → Reading Section → Module 1
    if (introStep === 0) {
      return (
        <Shell heading={tx("Hardware Check", "하드웨어 점검")} onNext={() => setIntroStep(1)} nextLabel={tx("Continue >", "계속 >")}>
          <P>{tx("Before the test begins, we will check the microphone and headset volume.", "시험이 시작되기 전에 마이크와 헤드셋 볼륨을 점검합니다.")}</P>
          <div style={{ display: "flex", gap: 36, margin: "18px 0 22px 10px" }}>
            {[
              <path key="m" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V22h2v-3.1A7 7 0 0 0 19 12h-2z" />,
              <path key="h" d="M12 3a9 9 0 0 0-9 9v6a3 3 0 0 0 3 3h2v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h2a3 3 0 0 0 3-3v-6a9 9 0 0 0-9-9z" />,
              <path key="s" d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />,
            ].map((p, i) => (
              <svg key={i} width="54" height="54" viewBox="0 0 24 24" fill={ETS_TEAL} aria-hidden="true">{p}</svg>
            ))}
          </div>
          <P>{tx("Please make sure your headset is on. Follow the instructions on each screen. Be sure that your microphone is properly positioned and adjusted to allow for the best possible recording. Speak directly into the microphone and in your normal speaking voice.", "헤드셋이 켜져 있는지 확인하세요. 각 화면의 안내를 따르고, 최상의 녹음을 위해 마이크 위치를 알맞게 조정하세요. 마이크에 직접, 평소 목소리로 말하세요.")}</P>
        </Shell>
      );
    }

    if (introStep === 1) {
      return (
        <Shell heading={tx("Adjusting the Volume", "볼륨 조절")} onBack={() => setIntroStep(0)} onNext={() => setIntroStep(2)} nextLabel={tx("Continue >", "계속 >")}>
          <P>{tx("To adjust the volume, select the Volume icon at the top of the screen. The volume control will appear. Move the volume indicator to the left or the right to change the volume.", "볼륨을 조절하려면 화면 위쪽의 Volume 아이콘을 선택하세요. 볼륨 조절 막대가 나타나면 좌우로 움직여 볼륨을 바꿉니다.")}</P>
          <P>{tx("To close the volume control, select the Volume icon again.", "볼륨 조절을 닫으려면 Volume 아이콘을 다시 선택하세요.")}</P>
          <P>{tx("You will be able to change the volume during the test if you need to.", "필요하면 시험 중에도 볼륨을 바꿀 수 있습니다.")}</P>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 6 }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill={ETS_TEAL} aria-hidden="true">
              <path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
            </svg>
            <span style={{ fontSize: 13, color: "#444" }}>{tx("You now have the option to adjust the volume.", "이제 볼륨을 조절할 수 있습니다.")}</span>
          </div>
        </Shell>
      );
    }

    if (introStep === 2) {
      const bars = (color: string, lit: number) => (
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: 22 }).map((_, i) => (
            <span key={i} style={{ width: 9, height: 24, border: `1px solid ${color}`, backgroundColor: i < lit ? color : "transparent" }} />
          ))}
        </div>
      );
      return (
        <Shell heading={tx("Adjusting the Microphone", "마이크 조절")} onBack={() => setIntroStep(1)} onNext={() => setIntroStep(3)} nextLabel={tx("Continue >", "계속 >")}>
          <P>{tx("In order to check your microphone volume, you will speak into the microphone using your normal tone and volume. For best recording results, your voice level should remain generally within the Good Range. While you speak the microphone will adjust automatically.", "마이크 볼륨을 확인하기 위해 평소 목소리 크기로 마이크에 말합니다. 최상의 녹음을 위해 목소리 크기는 대체로 Good 범위 안에 있어야 합니다. 말하는 동안 마이크는 자동으로 조정됩니다.")}</P>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#444", margin: "14px 0 8px" }}>{tx("Example:", "예시:")}</p>
          <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
            <div>{bars(ETS_TEAL, 11)}<div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", marginTop: 4 }}><span>Too Quiet</span><span>Good</span><span>Too Loud</span></div>
              <div style={{ marginTop: 26, fontSize: 22, color: ETS_TEAL }}>✓ <span style={{ color: "#444" }}>Good</span></div></div>
            <div>{bars("#D94B4B", 21)}<div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", marginTop: 4 }}><span>Too Quiet</span><span>Good</span><span>Too Loud</span></div>
              <div style={{ marginTop: 26, fontSize: 22, color: "#D94B4B" }}>✗ <span style={{ color: "#444" }}>Too Loud</span></div></div>
          </div>
        </Shell>
      );
    }

    if (introStep === 3) {
      return (
        <Shell heading={tx("Reading Section", "Reading 섹션")} onBack={() => setIntroStep(2)} onNext={() => setIntroStep(4)} nextLabel={tx("Begin >", "시작 >")}>
          <P>{tx("In the Reading section, you will answer 35-48 questions to demonstrate how well you understand academic and non-academic texts in English. There are three types of tasks.", "Reading 섹션에서는 35-48개 문항으로 학술적·비학술적 영어 글을 얼마나 잘 이해하는지 평가합니다. 문제 유형은 세 가지입니다.")}</P>
          <table style={{ borderCollapse: "collapse", fontSize: 13, marginTop: 4 }}>
            <thead>
              <tr><th style={th}>{tx("Type of Task", "문제 유형")}</th><th style={th}>{tx("Description", "설명")}</th></tr>
            </thead>
            <tbody>
              <tr><td style={td}>Complete the Words</td><td style={td}>{tx("Fill in the missing letters in a paragraph.", "문단 속 단어의 빠진 철자를 채웁니다.")}</td></tr>
              <tr><td style={td}>Read in Daily Life</td><td style={td}>{tx("Answer questions about everyday reading material.", "일상 읽기 자료에 대한 문제에 답합니다.")}</td></tr>
              <tr><td style={td}>Read an Academic Passage</td><td style={td}>{tx("Answer questions about academic passages.", "학술 지문에 대한 문제에 답합니다.")}</td></tr>
            </tbody>
          </table>
        </Shell>
      );
    }

    return (
      <Shell heading="Module 1" onBack={() => setIntroStep(3)} onNext={beginTest} nextLabel={tx("Begin >", "시작 >")}>
        <P>{isStudy ? tx("In Study mode there is no clock, so you can take as much time as you need. In an actual test, the clock will show you how much time you have to complete Module 1.", "Study 모드에는 시계가 없어 시간을 충분히 쓸 수 있습니다. 실제 시험에서는 Module 1을 끝낼 수 있는 남은 시간이 시계로 표시됩니다.") : "In an actual test, the clock will show you how much time you have to complete Module 1."}</P>
        <P>{tx("In an actual test, you WILL NOT be able to return to Module 1 once you have begun Module 2.", "실제 시험에서는 Module 2를 시작한 뒤에는 Module 1로 돌아갈 수 없습니다.")}</P>
      </Shell>
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
        <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333", whiteSpace: "pre-wrap" }}>
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
                      width: Math.max(blank.correctToken.length * 11 + 8, 30),
                      height: 22, border: "none", borderRadius: 0,
                      backgroundColor: "#E4E4E4", textAlign: "left", padding: "0 3px",
                      fontSize: 14, color: "#222", outline: "none",
                      margin: "0 1px", verticalAlign: "baseline", letterSpacing: 1,
                    }}
                  />
                )}
              </span>
            );
          })}
        </p>
      );
    }

    const cwBlanksBefore = cwItems.slice(0, cwIdx).reduce((n, it) => n + it.blanks.length, 0);
    const cwBlanksTotal = cwItems.reduce((n, it) => n + it.blanks.length, 0);
    const module1Total = cwBlanksTotal + stage1Questions.length;

    return (
      <ReadingETSFrame>
        <header style={{
          height: 60, backgroundColor: ETS_TEAL, display: "flex",
          alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "0 24px", flexShrink: 0,
        }}>
          {isStudy && <StudyLangToggle className="h-9 rounded-md border border-white/80 bg-transparent px-3 text-xs font-bold text-white hover:bg-white/10" />}
          <EtsVolumeButton />
          {isStudy && <EtsHeaderButton outline onClick={() => (cwIdx > 0 ? setCwIdx((i) => i - 1) : setPhase("direction"))}>{tx("< Back", "< 이전")}</EtsHeaderButton>}
          <EtsHeaderButton onClick={goNextCw}>{tx("Next >", "다음 >")}</EtsHeaderButton>
        </header>
        <div style={{ height: 40, backgroundColor: "#FFFFFF", borderBottom: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", flexShrink: 0, fontSize: 12, color: "#444" }}>
          <span>
            <strong style={{ fontSize: 14, color: "#222" }}>Reading</strong>
            <span style={{ margin: "0 10px", color: "#BBB" }}>|</span>
            {`Questions ${cwBlanksBefore + 1}–${cwBlanksBefore + cwItem.blanks.length} of ${module1Total}`}
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{isStudy ? tx("No time limit", "시간 제한 없음") : ""}</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#FFFFFF", padding: "22px 44px" }}>
          <h2 style={{ textAlign: "center", fontSize: 21, fontWeight: 700, color: "#222", marginBottom: 70 }}>
            {tx("Fill in the missing letters in the paragraph.", "문단에서 빠진 글자를 채우세요.")}
          </h2>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>{renderParagraph()}</div>
        </div>
      </ReadingETSFrame>
    );
  }

  // ── Stage Break Screen ─────────────────────────────────────────────

  if (phase === "stage_break") {
    // 실제 화면 순서: "End of Module 1" → "Module 2" 안내 → 시작
    const BreakShell = ({
      heading, children, nextLabel, onNext,
    }: { heading: string; children: ReactNode; nextLabel: string; onNext: () => void }) => (
      <ReadingETSFrame>
        <header style={{ height: 60, backgroundColor: ETS_TEAL, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "0 24px", flexShrink: 0 }}>
          {isStudy && <StudyLangToggle className="h-9 rounded-md border border-white/80 bg-transparent px-3 text-xs font-bold text-white hover:bg-white/10" />}
          {breakStep === 1 && <EtsVolumeButton />}
          <EtsHeaderButton onClick={onNext}>{nextLabel}</EtsHeaderButton>
        </header>
        <div style={{ height: 40, backgroundColor: "#FFFFFF", borderBottom: "1px solid #E0E0E0", display: "flex", alignItems: "center", padding: "0 36px", flexShrink: 0, fontSize: 14, fontWeight: 700, color: "#222" }}>
          Reading
        </div>
        <main style={{ flex: 1, overflowY: "auto", backgroundColor: "#FFFFFF", padding: "28px 36px" }}>
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <h2 style={{ fontSize: 22, fontWeight: 400, color: "#333", paddingBottom: 8, marginBottom: 20, borderBottom: "1px solid #DDD" }}>{heading}</h2>
            {children}
          </div>
        </main>
      </ReadingETSFrame>
    );
    const bp: CSSProperties = { fontSize: 14, lineHeight: 1.7, color: "#444", marginBottom: 14 };

    if (breakStep === 0) {
      return (
        <BreakShell heading={tx("End of Module 1", "Module 1 종료")} nextLabel={tx("Next >", "다음 >")} onNext={() => setBreakStep(1)}>
          <p style={bp}>
            {isStudy && lang === "ko"
              ? <>Module 2로 계속하려면 <strong>Next</strong>를 선택하세요.</>
              : <>Select <strong>Next</strong> to continue to Module 2.</>}
          </p>
        </BreakShell>
      );
    }

    return (
      <BreakShell heading="Module 2" nextLabel={tx("Begin >", "시작 >")} onNext={() => { setBreakStep(0); startStage2(); }}>
        <p style={bp}>
          {isStudy
            ? tx("In Study mode there is no clock, so you can take as much time as you need. In an actual test, the clock will show you how much time you have to complete Module 2.", "Study 모드에는 시계가 없어 시간을 충분히 쓸 수 있습니다. 실제 시험에서는 Module 2를 끝낼 수 있는 남은 시간이 시계로 표시됩니다.")
            : "In an actual test, the clock will show you how much time you have to complete Module 2."}
        </p>
      </BreakShell>
    );
  }

  // ── Result Screen ──────────────────────────────────────────────────

  if (phase === "result" && score) {
    const pct = Math.round((score.correct / score.total) * 100);
    return (
      <ReadingETSFrame>
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F6F9" }}>
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

          {nextSection && (
            <Link
              href={nextSection.href}
              className="mt-6 block rounded-lg bg-black py-3 text-center text-sm font-bold text-white hover:bg-gray-800"
            >
              다음 영역: {nextSection.section === "listening" ? "Listening" : nextSection.section} 계속하기 →
            </Link>
          )}
          {groupCompleted && groupId && (
            <Link
              href={`/student/full-tests/${groupId}`}
              className="mt-6 block rounded-lg bg-emerald-600 py-3 text-center text-sm font-bold text-white hover:bg-emerald-700"
            >
              전체 결과 보기 →
            </Link>
          )}
        </div>
      </div>
      </div>
      </ReadingETSFrame>
    );
  }

  // ── Review Screen ──────────────────────────────────────────────────

  if (phase === "review") {
    const reviewQs = [...stage1Questions, ...stage2Questions];
    const unanswered = reviewQs.filter((q) => !answers[q.id]);

    return (
      <ReadingETSFrame>
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: "#F4F6F9" }}>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <h2 className="mb-1 text-xl font-bold">Review</h2>
          <p className="mb-6 text-sm text-gray-500">
            Check your answers before submitting. Review any unanswered or flagged questions.
          </p>

          {unanswered.length > 0 && (
            <div className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Unanswered ({unanswered.length}):{" "}
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
              Back
            </button>
            <button
              onClick={triggerFinish}
              className="ml-auto rounded-lg bg-black px-6 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
      </div>
      </ReadingETSFrame>
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

  // Insert Text (Q_AC_07): click a [■] square in the passage to preview the
  // target sentence there and auto-select the matching choice.
  const isInsertionActive = currentQ.type === "insertion" && currentQ.passageKind === "academic_passage";
  const selectedMarkerIdx = isInsertionActive
    ? currentQ.choices.findIndex((c) => c.id === currentAnswer)
    : -1;

  function renderInsertionPassage() {
    const paraMatches = currentQ!.passageHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    const paragraphs = paraMatches && paraMatches.length > 0
      ? paraMatches.map((p) => p.replace(/<\/?p[^>]*>/gi, ""))
      : [currentQ!.passageHtml];

    return (
      <>
        {paragraphs.map((para, pi) => {
          const plain = para.replace(/<[^>]+>/g, "");
          const parts = plain.split(/\[\[INS:(\d)\]\]/g);
          return (
            <p key={pi} style={{ fontSize: 16, lineHeight: 1.9, color: "#222", marginBottom: 16 }}>
              {parts.map((part, i) => {
                if (i % 2 === 1) {
                  const markerIdx = Number(part);
                  const isSelected = selectedMarkerIdx === markerIdx;
                  const choice = currentQ!.choices[markerIdx];
                  return (
                    <span key={i}>
                      <button
                        type="button"
                        onClick={() => choice && handleSelect(choice.id)}
                        title="Insert sentence here"
                        style={{
                          display: "inline-block",
                          margin: "0 3px",
                          padding: "1px 8px",
                          fontSize: 15,
                          fontWeight: 900,
                          color: isSelected ? "#fff" : "#0073E6",
                          backgroundColor: isSelected ? "#0073E6" : "transparent",
                          border: "1.5px solid #0073E6",
                          borderRadius: 3,
                          cursor: "pointer",
                          lineHeight: 1.4,
                        }}
                      >
                        ■
                      </button>
                      {isSelected && currentQ!.insertionTargetSentence && (
                        <span style={{ backgroundColor: "#FFF3B0", padding: "1px 4px", fontWeight: 600 }}>
                          {" "}{currentQ!.insertionTargetSentence}{" "}
                        </span>
                      )}
                    </span>
                  );
                }
                return <span key={i}>{part}</span>;
              })}
            </p>
          );
        })}
      </>
    );
  }

  // ── 실제 ETS 문제 화면: 청록 헤더(Volume/Back/Next), "Reading | Question X of Y", 가운데 제목, 좌 지문 / 우 문제 ──
  const cwBlankCount = cwItems.reduce((n, it) => n + it.blanks.length, 0);
  const questionOffset = isStage1 ? cwBlankCount : 0;
  const questionTotal = questionOffset + stageTotal;
  const questionNo = questionOffset + stageLocalIdx + 1;

  const DAILY_TITLES: Record<string, string> = {
    email: "Read an email.",
    notice: "Read a notice.",
    social_post: "Read a social media post.",
    text_message: "Read a text message chain.",
    advertisement: "Read an advertisement.",
    web_article: "Read a web page.",
  };
  const passageHeading =
    currentQ.passageKind === "daily_life"
      ? DAILY_TITLES[currentQ.passageContextType ?? ""] ?? "Read the text."
      : currentQ.passageTitle ?? "";

  const canGoBack = stageLocalIdx > 0;
  const nextClick = goNext;

  return (
    <ReadingETSFrame>
      <header style={{
        height: 60, backgroundColor: ETS_TEAL, display: "flex",
        alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "0 24px", flexShrink: 0,
      }}>
        {isStudy && <StudyLangToggle className="h-9 rounded-md border border-white/80 bg-transparent px-3 text-xs font-bold text-white hover:bg-white/10" />}
        {isStudy && <EtsHeaderButton outline onClick={() => setShowNavGrid((v) => !v)}>{tx("Questions", "문제 목록")}</EtsHeaderButton>}
        {isStudy && <EtsHeaderButton outline onClick={() => { window.location.href = "/student"; }}>{tx("Save & Exit", "저장하고 나가기")}</EtsHeaderButton>}
        <EtsVolumeButton />
        {canGoBack && <EtsHeaderButton outline onClick={goPrev}>{tx("< Back", "< 이전")}</EtsHeaderButton>}
        <EtsHeaderButton onClick={nextClick}>{tx("Next >", "다음 >")}</EtsHeaderButton>
      </header>

      <div style={{ height: 40, backgroundColor: "#FFFFFF", borderBottom: "1px solid #E0E0E0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", flexShrink: 0, fontSize: 12, color: "#444" }}>
        <span>
          <strong style={{ fontSize: 14, color: "#222" }}>Reading</strong>
          <span style={{ margin: "0 10px", color: "#BBB" }}>|</span>
          {`Question ${questionNo} of ${questionTotal}`}
        </span>
        <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: isWarning ? "#DC2626" : "#444" }}>
          {isStudy ? tx("No time limit", "시간 제한 없음") : formatTime(secondsLeft)}
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, backgroundColor: "#FFFFFF", padding: "18px 36px 0", display: "flex", flexDirection: "column", position: "relative" }}>
        {isStudy && showNavGrid && (
          <div style={{ position: "absolute", top: 8, right: 36, zIndex: 10, width: 330, backgroundColor: "#FFFFFF", border: "1px solid #D0D5DD", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.18)", padding: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#333", marginBottom: 8 }}>
              {tx(`Module ${isStage1 ? 1 : 2} questions`, `Module ${isStage1 ? 1 : 2} 문제 목록`)}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 5 }}>
              {stageQuestions.map((q, qi) => {
                const done = !!answers[q.id];
                const cur = q.globalIdx === currentIdx;
                const fl = flagged.has(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => goTo(q.globalIdx)}
                    style={{
                      height: 28, fontSize: 12, fontWeight: 700, borderRadius: 4, cursor: "pointer",
                      border: fl ? "2px solid #F59E0B" : "1px solid #C9D1D9",
                      backgroundColor: cur ? ETS_TEAL : done ? "#D7ECEC" : "#FFFFFF",
                      color: cur ? "#FFFFFF" : "#333",
                    }}
                  >
                    {questionOffset + qi + 1}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: 11, color: "#777", marginTop: 8 }}>
              {tx("Teal = current · light = answered · orange = flagged", "청록 = 현재 · 연한색 = 답함 · 주황 테두리 = 깃발")}
            </p>
          </div>
        )}
        <h2 style={{ textAlign: "center", fontSize: 21, fontWeight: 700, color: "#222", marginBottom: 18, flexShrink: 0 }}>
          {passageHeading}
        </h2>

        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 36 }}>
          {/* 좌: 지문 */}
          <div ref={passagePaneRef} style={{ minHeight: 0, overflowY: "auto", paddingRight: 14, paddingBottom: 16 }}>
            {currentQ.passageKind === "daily_life" ? (
              <DailyLifeContent
                contextType={currentQ.passageContextType ?? "other"}
                contentHtml={currentQ.passageContentHtml ?? ""}
              />
            ) : isInsertionActive ? (
              <div style={{ color: "#333" }}>{renderInsertionPassage()}</div>
            ) : (
              <div
                className="ets-passage"
                style={{ fontSize: 14, lineHeight: 1.45, color: "#333" }}
                dangerouslySetInnerHTML={{ __html: currentQ.passageHtml.replace(/\[\[INS:\d\]\]/g, "") }}
              />
            )}
          </div>

          {/* 우: 문제 */}
          <div style={{ minHeight: 0, overflowY: "auto", paddingBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "#222", marginBottom: 14 }}>{currentQ.stem}</p>

            {currentQ.isSummary && (
              <p style={{ fontSize: 12, color: "#0A6C74", marginBottom: 10 }}>
                Select {currentQ.summarySelectionCount} answers ({((currentAnswer as string[]) ?? []).length} selected)
              </p>
            )}
            {isInsertionActive && (
              <p style={{ fontSize: 12, color: "#0A6C74", marginBottom: 10 }}>
                Click a black square [■] in the passage to place the sentence.
              </p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {currentQ.choices.map((choice, idx) => {
                const isSelected = currentQ.isSummary
                  ? ((currentAnswer as string[]) ?? []).includes(choice.id)
                  : currentAnswer === choice.id;
                const isChecked = isStudy && checkedIds.has(currentQ.id);
                const isRight = currentQ.isSummary
                  ? currentQ.summaryCorrectIndices.includes(idx)
                  : choice.isCorrect;
                const textColor = isChecked && isRight ? "#15803D" : isChecked && isSelected ? "#DC2626" : "#333";
                return (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => (currentQ.isSummary ? handleSummaryToggle(choice.id) : handleSelect(choice.id))}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, background: "none", border: "none", padding: 0, textAlign: "left", cursor: "pointer", color: textColor, fontSize: 14, lineHeight: 1.4, fontWeight: isChecked && (isRight || isSelected) ? 700 : 400 }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: 0, width: 17, height: 17, borderRadius: currentQ.isSummary ? 3 : "50%",
                        border: `1.5px solid ${isSelected ? ETS_TEAL : "#555"}`, marginTop: 1,
                        backgroundColor: isSelected ? ETS_TEAL : "#FFFFFF",
                        boxShadow: isSelected ? "inset 0 0 0 3px #FFFFFF" : "none",
                      }}
                    />
                    <span>{choice.text}</span>
                  </button>
                );
              })}
            </div>

            {isStudy && (
              <div style={{ marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setCheckedIds((prev) => new Set(prev).add(currentQ.id))}
                  style={{ height: 34, padding: "0 16px", fontSize: 13, fontWeight: 700, border: `1px solid ${ETS_TEAL}`, borderRadius: 6, backgroundColor: "#FFFFFF", color: ETS_TEAL, cursor: "pointer" }}
                >
                  {tx("Check Answer", "정답 확인")}
                </button>
                <button
                  type="button"
                  onClick={toggleFlag}
                  style={{ marginLeft: 8, height: 34, padding: "0 14px", fontSize: 13, fontWeight: 700, border: `1px solid ${isFlagged ? "#F59E0B" : "#C9D1D9"}`, borderRadius: 6, backgroundColor: isFlagged ? "#FEF3C7" : "#FFFFFF", color: "#8A5A00", cursor: "pointer" }}
                >
                  {isFlagged ? tx("Flagged", "깃발 표시됨") : tx("Flag for review", "나중에 볼 문제")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ReadingETSFrame>
  );
}
