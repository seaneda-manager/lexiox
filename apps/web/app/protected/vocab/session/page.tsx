// apps/web/app/(protected)/vocab/session/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { usePenguinMood } from "@/components/mascot/usePenguinMood";

import FocusModeWrapper from "@/components/common/FocusModeWrapper";
import StageIntroScreen from "@/components/common/StageIntroScreen";

import PrescreenBoard from "@/components/vocab/PrescreenBoard";
import PrescreenSpellingBoard from "@/components/vocab/prescreen/PrescreenSpellingBoard";
import SummaryScreen from "@/components/vocab/summary/SummaryScreen";

import LearningRunner from "@/components/vocab/learning/LearningRunner";
import type { LearningWord } from "@/components/vocab/learning/learning.types";

import AsteroidGame from "@/components/vocab/game/AsteroidGame";
import RangeSelectorModal, { type GameRange } from "@/components/vocab/game/RangeSelectorModal";
import DrillRunner from "@/components/vocab/drill/DrillRunner";
import type { DrillTask, DrillType } from "@/components/vocab/drill/drill.types";
import { buildBlockDrillTasksV1, type WordFormRowLike } from "@/lib/vocab/drill/buildBlockDrillTasksV1";

import { createBrowserClient } from "@/lib/supabase/client";
import StageBackground from "@/components/common/StageBackground";
import MascotLayer from "@/components/common/MascotLayer";

import SpeedChallengeRunner from "@/components/vocab/speed/SpeedChallengeRunner";
import type { SpeedQuestion, SpeedAttemptResult } from "@/models/vocab/speed.types";

// ✅ server action (service-role)
import { loadSessionWordsAction, completeVocabDayAction, saveVocabAttemptAction } from "./actions";
import type { LoadSessionWordsActionResult } from "./actions";

import type { PrescreenResult } from "@/models/vocab/session/prescreen";
import type { SpellingResult } from "@/models/vocab/session/spelling";
import type { SessionWord } from "@/models/vocab/SessionWord";

/* =========================================================
 * OPTIONAL DRILL PAGE: storage keys
 * ======================================================= */
const STORAGE_KEY = "lingox_vocab_session";
const SPEED_DRILL_KEY = "pendingDrillTasks";

/* =========================================================
 * DRILL POLICY (v1.0)
 * 1) WORD_FORM_PICK (활용형)
 * 2) SYNONYM (동의어)
 * 3) SENTENCE_BLANK (문장 빈칸)
 * ======================================================= */
const DRILL_TASKS_VERSION = "drill-v1.0-2026-01-28";
const CORE_DRILL_ORDER: DrillType[] = ["WORD_FORM_PICK", "SYNONYM", "SENTENCE_BLANK"];
const MIN_DRILL_WORDS = 6;

/** ✅ Ensure we always fetch FULL word_forms columns when repairing */
const WORD_FORMS_SELECT = [
  "word_id",
  "lemma",
  "base_pos",
  "noun_form",
  "adj_form",
  "adv_form",
  "ed_adj_form",
  "verb_3rd",
  "verb_past",
  "verb_pp",
  "noun_meaning_ko",
  "adj_meaning_ko",
  "adv_meaning_ko",
  "ed_adj_meaning_ko",
].join(",");

function hasAnyWordFormValue(wf: any): boolean {
  if (!wf) return false;
  const keys = ["noun_form", "adj_form", "adv_form", "ed_adj_form", "verb_3rd", "verb_past", "verb_pp"];
  for (const k of keys) {
    const v = typeof wf?.[k] === "string" ? wf[k].trim() : "";
    if (v) return true;
  }
  return false;
}

/* =========================================================
 * FALLBACK WORDS (dev safety net)
 * ======================================================= */
const FALLBACK_WORDS: SessionWord[] = [
  { id: "w1", text: "extend", meanings_ko: ["확장하다", "늘리다"] },
  { id: "w2", text: "impact", meanings_ko: ["영향", "충격"] },
  { id: "w3", text: "maintain", meanings_ko: ["유지하다", "지속하다"] },
  { id: "w4", text: "issue", meanings_ko: ["문제", "발행하다"] },
  { id: "w5", text: "reduce", meanings_ko: ["줄이다", "감소하다"] },
  { id: "w6", text: "require", meanings_ko: ["요구하다", "필요로 하다"] },
  { id: "w7", text: "support", meanings_ko: ["지지하다", "지원하다"] },
];

/* =========================================================
 * STAGE
 * ======================================================= */
type Stage =
  | "LOADING"
  | "PRESCREEN"
  | "SPELLING"
  | "SUMMARY"
  | "QUIZ"
  | "LEARNING_INTRO"
  | "LEARNING"
  | "SPEED"
  | "DRILL_INTRO"
  | "DRILL"
  | "DONE";

/* =========================================================
 * FULL-HEIGHT SHELL
 * ======================================================= */
function PageShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="h-[calc(100vh-64px)] min-h-0">
      <div className="h-full min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}

/* =========================================================
 * CARD WRAPPER (✅ stage-like card mode)
 * - keep FocusModeWrapper variant="card" (known working)
 * - remove max-w + remove extra big white card
 * - enforce lx-panel-wrap as the immediate wrapper
 * ======================================================= */
function CardWrap({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <FocusModeWrapper
      variant="card"
      // ✅ max-w 제거 (이게 초록 bg 대비 학습기가 작아지는 1순위)
      panelWidthClass="max-w-none w-full"
      // ✅ 바깥 “큰 흰 박스”가 있다면 여기서 투명화로 눌러버림
      className={[
        "text-slate-900",
        "!bg-transparent !shadow-none !border-0 !p-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      dim={false}
      blur={false}
    >
      {/* ✅ 네가 요구한 구조의 핵심: wrap은 항상 lx-panel-wrap */}
      <div className="lx-panel-wrap">{children}</div>
    </FocusModeWrapper>
  );
}

/* =========================================================
 * DEBUG PANEL
 * ======================================================= */
type DebugInfo = {
  userId: string;
  academyStudentId: string | null;
  assignmentId: string | null;
  assignmentSetId: string | null;
  assignedAt: string | null;
  loadedCount: number;
  firstWord: string | null;
  usingFallback: boolean;
  note: string | null;
  diag?: any;
};

function DebugPanel({ info }: { info: DebugInfo | null }) {
  if (!info) return null;

  return (
    <details className="rounded-xl border bg-slate-50 p-3 text-xs text-slate-700">
      <summary className="cursor-pointer font-semibold">Debug (session loader)</summary>

      <div className="mt-2 space-y-1">
        <div>
          userId: <code className="break-all">{info.userId}</code>
        </div>
        <div>
          academyStudentId: <code className="break-all">{info.academyStudentId ?? "(none)"}</code>
        </div>
        <div>
          assignmentId: <code className="break-all">{info.assignmentId ?? "(none)"}</code>
        </div>
        <div>
          set_id: <code className="break-all">{info.assignmentSetId ?? "(none)"}</code>
        </div>
        <div>assigned_at: {info.assignedAt ?? "(none)"}</div>
        <div>loadedCount: {info.loadedCount}</div>
        <div>firstWord: {info.firstWord ?? "(none)"}</div>
        <div>
          usingFallback:{" "}
          <span className={info.usingFallback ? "text-red-600" : "text-emerald-700"}>{String(info.usingFallback)}</span>
        </div>
        {info.note && <div className="text-amber-700">note: {info.note}</div>}
        {info.diag && (
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border bg-white p-2 text-[11px] text-slate-700">
            {JSON.stringify(info.diag, null, 2)}
          </pre>
        )}
      </div>
    </details>
  );
}

/* =========================================================
 * Helpers
 * ======================================================= */
function shuffleArray<T>(arr: T[], rnd: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function pickRandomSample<T>(arr: T[], n: number): T[] {
  const copy = shuffleArray(arr);
  return copy.slice(0, Math.max(0, Math.min(n, copy.length)));
}

function makeEmptySpellingResult(): SpellingResult {
  return { spellingFailedIds: [] } as SpellingResult;
}

function countByDrillType(tasks: DrillTask[]) {
  const out: Record<string, number> = {};
  for (const t of tasks) {
    const k = String((t as any)?.drillType ?? "UNKNOWN");
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * Block-order hard lock:
 * - tasks grouped by drillType (order fixed)
 * - within each drillType: shuffle only inside the group
 */
function enforceTypeBlocksAndShuffle(tasks: DrillTask[], typeOrder: DrillType[]): DrillTask[] {
  const byType = new Map<DrillType, DrillTask[]>();

  for (const t of tasks) {
    const dt = t.drillType as DrillType;
    const cur = byType.get(dt) ?? [];
    cur.push(t);
    byType.set(dt, cur);
  }

  const out: DrillTask[] = [];

  for (const dt of typeOrder) {
    const group = byType.get(dt);
    if (!group || group.length === 0) continue;
    out.push(...shuffleArray(group));
    byType.delete(dt);
  }

  // leftover types (should be rare)
  for (const dt of Array.from(byType.keys())) {
    const group = byType.get(dt);
    if (!group || group.length === 0) continue;
    out.push(...shuffleArray(group));
  }

  return out;
}

/** ✅ Hotfix: prevent “same word repeated 5/6 times” inside a type */
function dedupeByTypeAndWord(tasks: DrillTask[]) {
  const seen = new Set<string>();
  const out: DrillTask[] = [];
  for (const t of tasks) {
    const dt = String((t as any)?.drillType ?? "");
    const wid = String((t as any)?.wordId ?? "");
    if (!dt || !wid) continue;
    const key = `${dt}:${wid}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/* =========================================================
 * 🔥 URL Shortcut + Testing knobs
 * ======================================================= */
type ShortcutParams = {
  jump: string;
  only: string;
  setId: string;
  dayIndex: number | null;
  trackId: string;
  n: number; // dev-only
  seed: string; // dev-only
  debug: string; // ✅ debug gating
};

function readShortcutParams(): ShortcutParams {
  if (typeof window === "undefined") return { jump: "", only: "", setId: "", dayIndex: null, trackId: "", n: 0, seed: "", debug: "" };
  const sp = new URL(window.location.href).searchParams;
  const jump = (sp.get("jump") ?? "").trim().toUpperCase();
  const only = (sp.get("only") ?? "").trim().toUpperCase();
  const setId = (sp.get("setId") ?? "").trim();
  const trackId = (sp.get("trackId") ?? "").trim();

  const dayIndexRaw = (sp.get("dayIndex") ?? "").trim();
  const dayIndex = Number.isFinite(Number(dayIndexRaw)) ? Math.max(1, Math.floor(Number(dayIndexRaw))) : null;

  const nRaw = (sp.get("n") ?? sp.get("limit") ?? "").trim();
  const n = Number.isFinite(Number(nRaw)) ? Math.max(0, Math.floor(Number(nRaw))) : 0;

  const seed = (sp.get("seed") ?? "").trim();
  const debug = (sp.get("debug") ?? "").trim();

  return { jump, only, setId, dayIndex, trackId, n, seed, debug };
}

function canonOnlyToDrillType(raw: string): DrillType | "" {
  const v = String(raw ?? "").trim().toUpperCase();
  if (!v) return "";
  if (v === "FILL_IN_THE_BLANKS") return "SENTENCE_BLANK";
  if (v === "WORD_FORM") return "WORD_FORM_PICK";
  if (v === "SENTENCE_BLANK") return "SENTENCE_BLANK";
  if (v === "WORD_FORM_PICK") return "WORD_FORM_PICK";
  if (v === "SYNONYM") return "SYNONYM";
  if (v === "COLLOCATION") return "COLLOCATION";
  return "";
}

function hashStringToInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seedInt: number): T[] {
  const rnd = mulberry32(seedInt);
  return shuffleArray(arr, rnd);
}

function applyDevWordLimit(words: SessionWord[], shortcut: ShortcutParams, contextKey: string) {
  if (process.env.NODE_ENV === "production") return { words, note: "" };
  const n = shortcut.n;
  if (!n || n <= 0) return { words, note: "" };

  const seedKey = shortcut.seed?.trim() ? shortcut.seed.trim() : contextKey ? contextKey : "default";
  const seedInt = hashStringToInt(seedKey);

  const shuffled = seededShuffle(words, seedInt);
  const limited = shuffled.slice(0, Math.min(n, shuffled.length));

  const note = `DEV_LIMIT_WORDS(n=${n}, seedKey=${seedKey})`;
  return { words: limited, note };
}

function synthesizeDevExamples(wordText: string): string[] {
  const w = String(wordText ?? "").trim();
  if (!w) return [];
  return [`We need to ${w} the plan before tomorrow.`, `The ${w} of this change could be significant.`];
}

/* =========================================================
 * ✅ WordMap Normalizer
 * ======================================================= */
type WordMapExample = { en: string; ko: string | null };
type WordMapCollocationPair = {
  id: string | null;
  base: string;
  right: string;
  meaning_ko: string | null;
  relation: string | null;
  score: number | null;
};

type WordMapWord = {
  id: string;
  text: string;
  lemma: string | null;
  pos: string | null;

  meanings_ko: string[];
  meanings_en_simple: string[];

  examples: WordMapExample[];
  examples_easy: string[];

  synonyms_en_simple: string[];

  collocations: string[];
  collocation_pairs: WordMapCollocationPair[];
};

function cleanStr(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeStringArray(v: any): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(cleanStr).filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    return s
      .split(/\s*(?:\/|,|;|\||·|\n)\s*/g)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeExamples(v: any): WordMapExample[] {
  if (v == null) return [];
  if (!Array.isArray(v)) {
    if (typeof v === "string" && v.trim()) return [{ en: v.trim(), ko: null }];
    return [];
  }

  if (v.length === 0) return [];

  const first = v[0] as any;

  if (typeof first === "string") {
    return (v as string[])
      .map((s) => cleanStr(s))
      .filter(Boolean)
      .map((en) => ({ en, ko: null }));
  }

  if (first && typeof first === "object") {
    return (v as any[])
      .map((x) => {
        const en = cleanStr(x?.en ?? x?.sentence_en ?? x?.sentence ?? x?.example ?? "");
        const ko = cleanStr(x?.ko ?? x?.sentence_ko ?? x?.meaning_ko ?? "");
        if (!en) return null;
        return { en, ko: ko || null };
      })
      .filter((x): x is WordMapExample => Boolean(x && x.en));
  }

  return [];
}

function parseCollocationString(s: string): { base: string; right: string } | null {
  const raw = cleanStr(s);
  if (!raw) return null;

  if (raw.includes("|")) {
    const [a, b] = raw.split("|").map((x) => x.trim());
    if (a && b) return { base: a, right: b };
  }

  if (raw.includes("___")) {
    const [a, b] = raw.split("___").map((x) => x.trim());
    if (a && b) return { base: a, right: b };
  }

  const tokens = raw.split(/\s+/).filter(Boolean);
  if (tokens.length >= 2) return { base: tokens[0]!, right: tokens.slice(1).join(" ") };

  return null;
}

function normalizeCollocations(v: any): {
  collocations: string[];
  collocation_pairs: WordMapCollocationPair[];
} {
  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "string") {
    const collocations = (v as string[]).map(cleanStr).filter(Boolean);

    const pairs: WordMapCollocationPair[] = collocations
      .map(parseCollocationString)
      .filter(Boolean)
      .map((p) => ({
        id: null,
        base: p!.base,
        right: p!.right,
        meaning_ko: null,
        relation: null,
        score: null,
      }));

    return { collocations, collocation_pairs: pairs };
  }

  if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") {
    const pairs: WordMapCollocationPair[] = (v as any[])
      .map((x) => {
        const base = cleanStr(x?.base ?? x?.left ?? x?.word ?? "");
        const right = cleanStr(x?.right ?? x?.collocate ?? x?.value ?? x?.text ?? x?.rhs ?? "");
        if (!base || !right) return null;

        const id = cleanStr(x?.id);
        const mk = cleanStr(x?.meaning_ko ?? x?.meaningKo ?? "");
        const rel = cleanStr(x?.relation ?? x?.type ?? x?.kind ?? "");
        const score =
          typeof x?.score === "number" ? x.score : Number.isFinite(Number(x?.score)) ? Number(x?.score) : null;

        return {
          id: id || null,
          base,
          right,
          meaning_ko: mk || null,
          relation: rel || null,
          score,
        } as WordMapCollocationPair;
      })
      .filter((x): x is WordMapCollocationPair => Boolean(x && x.base && x.right));

    const collocations = pairs.map((p) => `${p.base}|${p.right}`);
    return { collocations, collocation_pairs: pairs };
  }

  if (typeof v === "string") {
    const one = cleanStr(v);
    if (!one) return { collocations: [], collocation_pairs: [] };
    const p = parseCollocationString(one);
    if (!p) return { collocations: [one], collocation_pairs: [] };
    return {
      collocations: [`${p.base}|${p.right}`],
      collocation_pairs: [{ id: null, base: p.base, right: p.right, meaning_ko: null, relation: null, score: null }],
    };
  }

  return { collocations: [], collocation_pairs: [] };
}

function pickId(w: any): string {
  return cleanStr(w?.id ?? w?.word_id ?? w?.wordId ?? w?.vocab_word_id ?? w?.vocab_item_id ?? "");
}

function pickText(w: any): string {
  return cleanStr(w?.text ?? w?.word_text ?? w?.word ?? w?.lemma ?? "");
}

function normalizeSessionWordForMap(w: any): WordMapWord {
  const id = pickId(w);
  const text = pickText(w);

  const lemma = cleanStr(w?.lemma ?? "") || null;
  const pos = cleanStr(w?.pos ?? w?.base_pos ?? "") || null;

  const meanings_ko = normalizeStringArray(w?.meanings_ko ?? w?.meaning_ko ?? w?.meanings ?? []);
  const meanings_en_simple = normalizeStringArray(w?.meanings_en_simple ?? w?.meaning_en ?? []);

  const examples = normalizeExamples(w?.examples ?? w?.examples_easy ?? w?.examples_en ?? []);
  const examples_easy = normalizeStringArray(w?.examples_easy ?? []);

  const synonyms_en_simple = normalizeStringArray(w?.synonyms_en_simple ?? w?.synonyms ?? []);

  const { collocations, collocation_pairs } = normalizeCollocations(w?.collocation_pairs ?? w?.collocations ?? []);

  return {
    id,
    text,
    lemma,
    pos,
    meanings_ko,
    meanings_en_simple,
    examples,
    examples_easy,
    synonyms_en_simple,
    collocations,
    collocation_pairs,
  };
}

function examplesToStrings(v: any): string[] {
  const ex = normalizeExamples(v);
  return ex.map((x) => cleanStr(x?.en)).filter(Boolean);
}

function collocationsToStrings(v: any): string[] {
  const { collocations } = normalizeCollocations(v);
  return collocations.map(cleanStr).filter(Boolean);
}

/* =========================================================
 * PAGE
 * ======================================================= */
export default function VocabSessionPage() {
  // 🔍 DEBUG: 페이지 로드 확인
  console.log("🚀 VocabSessionPage loaded!");

  const isDev = process.env.NODE_ENV !== "production";
  const supabase = useMemo(() => createBrowserClient(), []);
  const penguin = usePenguinMood();

  const [stage, setStage] = useState<Stage>("LOADING");

  const [prescreenResult, setPrescreenResult] = useState<PrescreenResult | null>(null);
  const [spellingResult, setSpellingResult] = useState<SpellingResult | null>(null);

  const [learningWords, setLearningWords] = useState<SessionWord[]>([]);
  const [gameRange, setGameRange] = useState<GameRange | null>(null);

  const [userId, setUserId] = useState<string>("__anon__");

  const [allWords, setAllWords] = useState<SessionWord[]>([]);
  const [wordFormsById, setWordFormsById] = useState<Record<string, WordFormRowLike>>({});

  const [loadError, setLoadError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const [wordExamplesById, setWordExamplesById] = useState<Record<string, any>>({});
  const [wordCollocationsById, setWordCollocationsById] = useState<Record<string, any>>({});

  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const [totalDays, setTotalDays] = useState<number | null>(null);

  // ✅ 2 Days Review: 지난 2일 약한 단어들
  const [recentWeakWords, setRecentWeakWords] = useState<SessionWord[]>([]);

  // ✅ Cumulative Quiz: 전체 기간 오답 단어들
  const [cumulativeWeakWords, setCumulativeWeakWords] = useState<SessionWord[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, boolean>>({});

  // ✅ SPEED 최종점검 + 완료
  const [sessionSetId, setSessionSetId] = useState<string | null>(null);
  const [speedWrongIds, setSpeedWrongIds] = useState<string[] | null>(null);
  const [speedTry, setSpeedTry] = useState<number>(1);
  const [completing, setCompleting] = useState<boolean>(false);

  const shortcut = useMemo(() => readShortcutParams(), []);
  const onlyType = useMemo(() => canonOnlyToDrillType(shortcut.only), [shortcut.only]);

  // ✅ Debug visibility:
  const showDebug = useMemo(() => {
    if (!isDev) return false;
    return String(shortcut.debug ?? "").trim() === "1";
  }, [isDev, shortcut.debug]);

  // ✅ DEV: create shell object early
  useEffect(() => {
    if (!isDev) return;
    if (typeof window === "undefined") return;
    (window as any).__vocabSession ||= {};
  }, [isDev]);

  // ✅ prevent infinite repair loop
  const wfRepairKeyRef = useRef<string>("");

  // ✅ cache-bust old pending tasks when drill policy changes
  useEffect(() => {
    try {
      const k = "lingox_drill_tasks_version";
      const prev = localStorage.getItem(k);
      if (prev !== DRILL_TASKS_VERSION) {
        localStorage.setItem(k, DRILL_TASKS_VERSION);

        try {
          localStorage.removeItem(SPEED_DRILL_KEY);
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        try {
          sessionStorage.removeItem(SPEED_DRILL_KEY);
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.clear();
        } catch {}
      }
    } catch {}
  }, []);

  useEffect(() => {
    console.log("[FLOW] /vocab/session page rendered");
  }, []);

  useEffect(() => {
    if (stage === "LOADING") penguin.setDefault();
    if (stage === "PRESCREEN" || stage === "SPELLING") penguin.focus();
    if (stage === "LEARNING" || stage === "DRILL") penguin.focus();
    if (stage === "DONE") penguin.celebrate();
  }, [stage]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        const id = user?.id;

        const forcedSetId = shortcut.setId ? shortcut.setId : null;

        if (!id) {
          if (cancelled) return;

          setUserId("__anon__");

          const limited = applyDevWordLimit(FALLBACK_WORDS, shortcut, "fallback");
          setAllWords(limited.words);
          setWordFormsById({});
          setWordExamplesById({});
          setWordCollocationsById({});

          setDebugInfo({
            userId: "__anon__",
            academyStudentId: null,
            assignmentId: null,
            assignmentSetId: null,
            assignedAt: null,
            loadedCount: limited.words.length,
            firstWord: limited.words[0]?.text ?? null,
            usingFallback: true,
            note: ["not logged in", limited.note].filter(Boolean).join(" / "),
          });

          if (shortcut.jump === "DRILL") {
            setPrescreenResult(
              (prev) => prev ?? ({ knownWordIds: [], unknownWordIds: limited.words.map((w) => w.id) } as any),
            );
            setSpellingResult((prev) => prev ?? makeEmptySpellingResult());
            setStage("DRILL_INTRO");
          } else {
            setStage("PRESCREEN");
          }
          return;
        }

        if (cancelled) return;
        setUserId(id);

        const res: LoadSessionWordsActionResult = await loadSessionWordsAction({
          setId: forcedSetId,
          dayIndex: shortcut.dayIndex,
        } as any);

        if (cancelled) return;

        if (!res.ok) {
          const limited = applyDevWordLimit(FALLBACK_WORDS, shortcut, "fallback");
          setAllWords(limited.words);
          setWordFormsById({});
          setWordExamplesById({});
          setWordCollocationsById({});
          setLoadError("DB에서 vocab 세트/아이템을 못 찾았어요. (fallback WORDS 사용 중)");

          setDebugInfo({
            userId: id,
            academyStudentId: (res as any)?.academyStudentId ?? null,
            assignmentId: null,
            assignmentSetId: (res as any)?.setId ?? null,
            assignedAt: null,
            loadedCount: limited.words.length,
            firstWord: limited.words[0]?.text ?? null,
            usingFallback: true,
            note: [
              `${(res as any)?.error ?? "LOAD_FAILED"} / ${(res as any)?.note ?? ""}${forcedSetId ? ` / setId=${forcedSetId}` : ""}`,
              limited.note,
            ]
              .filter(Boolean)
              .join(" / "),
            diag: (res as any)?.diag ?? null,
          });

          if (shortcut.jump === "DRILL") {
            setPrescreenResult(
              (prev) => prev ?? ({ knownWordIds: [], unknownWordIds: limited.words.map((w) => w.id) } as any),
            );
            setSpellingResult((prev) => prev ?? makeEmptySpellingResult());
            setStage("DRILL_INTRO");
          } else {
            setStage("PRESCREEN");
          }
          return;
        }

        const loaded = Array.isArray((res as any).words) ? ((res as any).words as SessionWord[]) : [];
        const hasWords = loaded.length > 0;

        setWordFormsById((res as any).wordFormsByWordId ?? {});
        setWordExamplesById((res as any).wordExamplesByWordId ?? {});
        setWordCollocationsById((res as any).wordCollocationsByWordId ?? {});

        if (!hasWords) {
          setAllWords([]);
          setLoadError("⚠️ Assigned set has 0 words. Check DebugPanel.diag.");

          setDebugInfo({
            userId: (res as any).userId ?? id,
            academyStudentId: (res as any).academyStudentId ?? null,
            assignmentId: (res as any).assignmentId ?? null,
            assignmentSetId: (res as any).setId ?? null,
            assignedAt: (res as any).assignedAt ?? null,
            loadedCount: 0,
            firstWord: null,
            usingFallback: false,
            note: `LOADED_OK_BUT_EMPTY / ${(res as any).note ?? ""}${forcedSetId ? ` / setId=${forcedSetId}` : ""}`,
            diag: (res as any).diag ?? null,
          });

          if (shortcut.jump === "DRILL") {
            setPrescreenResult((prev) => prev ?? ({ knownWordIds: [], unknownWordIds: [] } as any));
            setSpellingResult((prev) => prev ?? makeEmptySpellingResult());
            setStage("DRILL_INTRO");
          } else {
            setStage("PRESCREEN");
          }
          return;
        }

        const contextKey = String((res as any).assignmentId ?? (res as any).setId ?? forcedSetId ?? id);
        const limited = applyDevWordLimit(loaded, shortcut, contextKey);

        setAllWords(limited.words);
        setSessionSetId((res as any).setId ?? forcedSetId ?? null);
        const tt = (res as any).trackTitle ?? null;
        const di = (res as any).dayIndex ?? null;
        const td = (res as any).totalDays ?? null;
        console.log("🔍 API Response:", { trackTitle: tt, dayIndex: di, totalDays: td, res });
        setTrackTitle(tt);
        setDayIndex(di);
        setTotalDays(td);
        setLoadError(null);

        setDebugInfo({
          userId: (res as any).userId ?? id,
          academyStudentId: (res as any).academyStudentId ?? null,
          assignmentId: (res as any).assignmentId ?? null,
          assignmentSetId: (res as any).setId ?? null,
          assignedAt: (res as any).assignedAt ?? null,
          loadedCount: limited.words.length,
          firstWord: limited.words[0]?.text ?? null,
          usingFallback: false,
          note: [`loaded from DB${forcedSetId ? ` (forced setId=${forcedSetId})` : ""}`, limited.note]
            .filter(Boolean)
            .join(" / "),
          diag: (res as any).diag ?? null,
        });

        if (shortcut.jump === "DRILL") {
          setPrescreenResult(
            (prev) => prev ?? ({ knownWordIds: [], unknownWordIds: limited.words.map((w: any) => w.id) } as any),
          );
          setSpellingResult((prev) => prev ?? makeEmptySpellingResult());
          setStage("DRILL_INTRO");
        } else {
          setStage("PRESCREEN");
        }
      } catch (e: any) {
        if (cancelled) return;

        const limited = applyDevWordLimit(FALLBACK_WORDS, shortcut, "fallback");
        setAllWords(limited.words);
        setWordFormsById({});
        setWordExamplesById({});
        setWordCollocationsById({});
        setLoadError(typeof e?.message === "string" ? e.message : "단어 로드 실패 (fallback 사용)");

        setDebugInfo({
          userId: "__error__",
          academyStudentId: null,
          assignmentId: null,
          assignmentSetId: null,
          assignedAt: null,
          loadedCount: limited.words.length,
          firstWord: limited.words[0]?.text ?? null,
          usingFallback: true,
          note: [typeof e?.message === "string" ? e.message : "exception in loader", limited.note]
            .filter(Boolean)
            .join(" / "),
        });

        if (shortcut.jump === "DRILL") {
          setPrescreenResult(
            (prev) => prev ?? ({ knownWordIds: [], unknownWordIds: limited.words.map((w) => w.id) } as any),
          );
          setSpellingResult((prev) => prev ?? makeEmptySpellingResult());
          setStage("DRILL_INTRO");
        } else {
          setStage("PRESCREEN");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, shortcut.jump, shortcut.setId, shortcut.dayIndex, shortcut.n, shortcut.seed]);

  /* =========================================================
     DERIVED
  ========================================================= */
  const allWordIds = useMemo(() => allWords.map((w) => w.id).filter(Boolean), [allWords]);
  const allWordIdsKey = useMemo(() => allWordIds.join(","), [allWordIds]);

  const wordMap = useMemo(() => {
    return Object.fromEntries(allWords.map((w: any) => [w.id, normalizeSessionWordForMap(w)]));
  }, [allWords]);

  const effectiveDrillOrder: DrillType[] = useMemo(() => {
    const hasWF = Object.values(wordFormsById ?? {}).some(hasAnyWordFormValue);
    return hasWF ? CORE_DRILL_ORDER : CORE_DRILL_ORDER.filter((t) => t !== "WORD_FORM_PICK");
  }, [wordFormsById]);

  const exampleStringsById = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const id of allWordIds) {
      const fromMap = (wordExamplesById as any)?.[id];
      let ex = examplesToStrings(fromMap);

      if (ex.length === 0) {
        const w = (wordMap as any)?.[id];
        ex = examplesToStrings(w?.examples ?? w?.examples_easy ?? []);
      }

      if (ex.length === 0 && isDev) {
        const text = cleanStr((wordMap as any)?.[id]?.text);
        ex = synthesizeDevExamples(text);
      }

      out[id] = ex;
    }
    return out;
  }, [allWordIds, wordMap, wordExamplesById, isDev]);

  const collocationStringsById = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const id of allWordIds) {
      const fromMap = (wordCollocationsById as any)?.[id];
      let cols = collocationsToStrings(fromMap);

      if (cols.length === 0) {
        const w = (wordMap as any)?.[id];
        cols = collocationsToStrings(w?.collocation_pairs ?? w?.collocations ?? []);
      }

      out[id] = cols;
    }
    return out;
  }, [allWordIds, wordMap, wordCollocationsById]);

  useEffect(() => {
    if (!isDev) return;
    if (typeof window === "undefined") return;

    const g = ((window as any).__vocabSession ||= {});
    Object.assign(g, {
      __meta: {
        route: "/vocab/session",
        stage,
        userId,
        updatedAt: new Date().toISOString(),
        allWords: allWords.length,
        wordMapKeys: Object.keys(wordMap ?? {}).length,
        examplesKeys: Object.keys(wordExamplesById ?? {}).length,
        collocationsKeys: Object.keys(wordCollocationsById ?? {}).length,
        wfKeys: Object.keys(wordFormsById ?? {}).length,
      },

      allWordIds,
      effectiveDrillOrder,

      wordFormsById: wordFormsById ?? {},
      wordExamplesById: wordExamplesById ?? {},
      wordCollocationsById: wordCollocationsById ?? {},

      wordFormsByWordId: wordFormsById ?? {},
      wordExamplesByWordId: wordExamplesById ?? {},
      wordCollocationsByWordId: wordCollocationsById ?? {},

      wordMap: wordMap ?? {},
      exampleStringsById,
      collocationStringsById,
      sampleIds: allWordIds.slice(0, 5),
    });
  }, [
    isDev,
    stage,
    userId,
    allWords.length,
    allWordIdsKey,
    effectiveDrillOrder,
    wordFormsById,
    wordExamplesById,
    wordCollocationsById,
    wordMap,
    exampleStringsById,
    collocationStringsById,
  ]);

  // ✅ AUTO-REPAIR WORD_FORMS
  useEffect(() => {
    if (!userId || userId === "__anon__" || userId === "__error__") return;
    if (!allWordIds || allWordIds.length === 0) return;

    // ✅ fallback ID일 때는 repair하지 않기 (fallback id는 "w1", "w2" 형식)
    const isFallbackIds = allWordIds.every(id => /^w\d+$/.test(id));
    if (isFallbackIds) return;

    const existingRows = Object.values(wordFormsById ?? {});
    const validCount = existingRows.filter(hasAnyWordFormValue).length;

    if (validCount > 0) return;

    const repairKey = `${userId}:${allWordIdsKey}`;
    if (wfRepairKeyRef.current === repairKey) return;
    wfRepairKeyRef.current = repairKey;

    (async () => {
      const { data, error } = await supabase.from("word_forms").select(WORD_FORMS_SELECT).in("word_id", allWordIds);

      const fetched = Array.isArray(data) ? data : [];
      const fetchedValid = fetched.filter(hasAnyWordFormValue);

      if (error) {
        setDebugInfo((prev) =>
          prev
            ? {
                ...prev,
                diag: {
                  ...(prev.diag ?? {}),
                  wfRepair: {
                    ok: false,
                    error: String((error as any)?.message ?? error),
                    existingRows: existingRows.length,
                    existingValid: validCount,
                  },
                },
              }
            : prev,
        );
        return;
      }

      if (fetched.length === 0) {
        setDebugInfo((prev) =>
          prev
            ? {
                ...prev,
                diag: {
                  ...(prev.diag ?? {}),
                  wfRepair: {
                    ok: true,
                    fetched: 0,
                    fetchedValid: 0,
                    existingRows: existingRows.length,
                    existingValid: validCount,
                    note: "word_forms rows not found for these wordIds",
                  },
                },
              }
            : prev,
        );
        return;
      }

      const next: Record<string, WordFormRowLike> = {};
      for (const r of fetched as any[]) {
        const wid = String(r?.word_id ?? "").trim();
        if (!wid) continue;
        next[wid] = r as any;
      }

      setWordFormsById(next);

      setDebugInfo((prev) =>
        prev
          ? {
              ...prev,
              diag: {
                ...(prev.diag ?? {}),
                wfRepair: {
                  ok: true,
                  fetched: fetched.length,
                  fetchedValid: fetchedValid.length,
                  existingRows: existingRows.length,
                  existingValid: validCount,
                },
              },
            }
          : prev,
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, userId, allWordIdsKey, Object.keys(wordFormsById ?? {}).length]);

  const prescreenWords = useMemo(
    () =>
      allWords.map((w) => ({
        id: w.id,
        text: w.text,
        meanings_ko: w.meanings_ko,
      })),
    [allWords],
  );

  const spellingWords = useMemo(() => {
    if (!prescreenResult) return [];
    return prescreenResult.knownWordIds
      .map((id: string) => allWords.find((w) => w.id === id))
      .filter((w): w is SessionWord => Boolean(w))
      .map((w) => ({
        id: w.id,
        text: w.text,
        meanings_ko: w.meanings_ko,
      }));
  }, [prescreenResult, allWords]);

  const learningPayload: LearningWord[] = useMemo(
    () =>
      learningWords.map((w) => ({
        id: w.id,
        text: w.text,
        meanings_ko: w.meanings_ko,
        examples: (w as any)?.examples,
      })) as any,
    [learningWords],
  );

  const drillTargetWordIds = useMemo(() => {
    if (shortcut.jump === "DRILL") return allWordIds;

    const unknown = prescreenResult?.unknownWordIds ?? [];
    const failed = (spellingResult as any)?.spellingFailedIds ?? [];

    const core = uniq([...(unknown as string[]), ...(failed as string[])]).filter(Boolean).filter((id) => allWordIds.includes(id));

    if (core.length >= MIN_DRILL_WORDS) return core;

    const need = Math.min(allWordIds.length, MIN_DRILL_WORDS) - core.length;
    const filler = pickRandomSample(allWordIds.filter((id) => !core.includes(id)), need);
    return uniq([...core, ...filler]);
  }, [shortcut.jump, prescreenResult, spellingResult, allWordIds]);

  const drillTasks: DrillTask[] = useMemo(() => {
    const getWordText = (id: string) => ((wordMap as any)?.[id]?.text ? String((wordMap as any)[id].text) : "");

    const getWordForm = (id: string) => {
      const v = (wordFormsById as any)?.[id];
      return v ? v : undefined;
    };

    const getWordExamples = (id: string) => {
      return ((exampleStringsById as any)?.[id] ?? []) as string[];
    };

    const getWordCollocations = (id: string) => {
      return ((collocationStringsById as any)?.[id] ?? []) as string[];
    };

    const base = buildBlockDrillTasksV1({
      wordIds: drillTargetWordIds,
      drillTypes: effectiveDrillOrder,
      shuffleWordsWithinEachBlock: false,

      getWordText,
      getWordForm,
      getWordExamples,
      getWordCollocations,

      getExamples: getWordExamples,
      getCollocations: getWordCollocations,

      getWordSynonyms: (id: string) => (((wordMap as any)?.[id]?.synonyms_en_simple ?? []) as any),
      getWordMeaningsKo: (id: string) => (((wordMap as any)?.[id]?.meanings_ko ?? []) as any),
    } as any);

    const finalTasks = enforceTypeBlocksAndShuffle(base, effectiveDrillOrder);
    const deduped = dedupeByTypeAndWord(finalTasks);

    if (onlyType) return deduped.filter((t) => (t.drillType as any) === onlyType);
    return deduped;
  }, [drillTargetWordIds, effectiveDrillOrder, onlyType, wordMap, wordFormsById, exampleStringsById, collocationStringsById]);

  function seedOptionalDrillEntry(tasksOverride?: DrillTask[]) {
    const tasksToStore = tasksOverride ?? drillTasks;

    try {
      sessionStorage.removeItem(SPEED_DRILL_KEY);
    } catch {}

    try {
      sessionStorage.setItem(SPEED_DRILL_KEY, JSON.stringify(tasksToStore));

      const sessionPayload: any = {
        userId,
        todayWordIds: allWordIds,
        knownWordIds: prescreenResult?.knownWordIds ?? [],
        unknownWordIds: prescreenResult?.unknownWordIds ?? [],
        wordMap,

        wordFormsById: wordFormsById ?? {},
        exampleStringsById: exampleStringsById ?? {},
        collocationStringsById: collocationStringsById ?? {},
      };

      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionPayload));
    } catch {}
  }

  useEffect(() => {
    if (stage !== "SPELLING") return;
    if (!prescreenResult) return;

    if (spellingWords.length === 0) {
      setSpellingResult((prev) => prev ?? makeEmptySpellingResult());
      setStage("SUMMARY");
    }
  }, [stage, prescreenResult, spellingWords.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "production") return;
    if (stage !== "PRESCREEN") return;

    const dev = new URL(window.location.href).searchParams.get("dev");
    if (dev !== "drill") return;

    setPrescreenResult((prev) => prev ?? ({ knownWordIds: [], unknownWordIds: allWordIds } as any));
    setSpellingResult((prev) => prev ?? makeEmptySpellingResult());
    setStage("DRILL_INTRO");
  }, [stage, allWordIds]);

  // ✅ SPEED 최종점검 문항 (양방향)
  //  - 뜻 → 단어 : 타이핑(스펠링)
  //  - 단어 → 뜻 : 객관식(다의어면 정답 보기에 뜻 여러 개), 오답 보기는 다른 단어의 뜻
  const speedQuestions: SpeedQuestion[] = useMemo(() => {
    const meaningOf = (w: SessionWord) =>
      (w.meanings_ko ?? []).map(cleanStr).filter(Boolean).join(", ");

    const pool =
      speedWrongIds && speedWrongIds.length > 0
        ? allWords.filter((w) => speedWrongIds.includes(w.id))
        : allWords;

    const allMeanings = uniq(allWords.map(meaningOf).filter(Boolean));

    const out: SpeedQuestion[] = [];
    for (const w of pool) {
      const word = cleanStr(w.text);
      const meaning = meaningOf(w);
      if (!word || !meaning) continue;

      // 뜻 → 단어 (타이핑)
      out.push({
        id: `${w.id}:M2W`,
        type: "MEANING_TO_WORD",
        wordId: w.id,
        prompt: meaning,
        answer: word,
      });

      // 단어 → 뜻 (객관식)
      const distractors = pickRandomSample(
        allMeanings.filter((m) => m !== meaning),
        3,
      );
      out.push({
        id: `${w.id}:W2M`,
        type: "WORD_TO_MEANING",
        wordId: w.id,
        prompt: word,
        answer: meaning,
        choices: shuffleArray([meaning, ...distractors]),
      });
    }
    return shuffleArray(out);
  }, [allWords, speedWrongIds]);

  async function finishDay() {
    // ✅ DONE 화면을 바로 보여주고, 완료 기록은 백그라운드에서 처리
    setStage("DONE");

    // 백그라운드에서 완료 기록 (기다리지 않음)
    if (sessionSetId) {
      completeVocabDayAction({ setId: sessionSetId }).catch((e) => {
        console.warn("Background: Failed to complete day:", e);
      });
    }
  }

  async function handleSpeedFinish(result: SpeedAttemptResult) {
    const total = Number(result?.totalQuestions ?? 0);
    const correct = Number(result?.correctCount ?? 0);
    const acc = total > 0 ? correct / total : 1;
    const wrong = (result?.wrongWordIds ?? []).filter(Boolean);

    const academyStudentId = debugInfo?.academyStudentId ?? null;

    // ✅ 결과 저장 (know, spelling, speed)
    if (academyStudentId && sessionSetId) {
      try {
        await saveVocabAttemptAction({
          studentId: academyStudentId,
          setId: sessionSetId,
          wordIds: wrong,
          stage: "speed",
          accuracy: acc,
          passed: acc >= 0.7,
          assignmentId: debugInfo?.assignmentId,
        });
      } catch (e) {
        console.warn("Failed to save speed attempt:", e);
        /* non-fatal */
      }
    }

    // 불합격(70% 미만) + 틀린 단어 있으면 → 틀린 것만 재도전
    if (acc < 0.7 && wrong.length > 0) {
      setSpeedWrongIds(wrong);
      setSpeedTry((n) => n + 1);
      return;
    }

    // 통과 → Day 완료 기록 + 다음 Day 오픈
    await finishDay();
  }

  // ✅ 2 Days Review: 지난 2일 약한 단어들 조회
  useEffect(() => {
    if (stage !== "SUMMARY" || !debugInfo?.academyStudentId || allWords.length === 0) {
      return;
    }

    (async () => {
      try {
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

        const { data, error } = await supabase
          .from("vocab_learning_attempts")
          .select("wrong_word_ids")
          .eq("student_id", debugInfo.academyStudentId)
          .gte("attempted_at", twoDaysAgo.toISOString())
          .execute();

        if (error) {
          console.warn("Failed to load 2-days review:", error);
          return;
        }

        // 집계: 모든 wrong_word_ids 수집 후 중복 제거
        const weakWordIds = new Set<string>();
        for (const record of data ?? []) {
          const ids = Array.isArray(record.wrong_word_ids) ? record.wrong_word_ids : [];
          ids.forEach((id) => weakWordIds.add(id));
        }

        // 단어 정보 조회
        const weak = Array.from(weakWordIds)
          .map((id) => allWords.find((w) => w.id === id))
          .filter(Boolean) as SessionWord[];

        setRecentWeakWords(weak);
      } catch (e) {
        console.warn("Error loading 2-days review:", e);
      }
    })();
  }, [stage, debugInfo?.academyStudentId, allWords, supabase]);

  // ✅ Cumulative Quiz: 전체 기간 오답 단어들 조회
  useEffect(() => {
    if (stage !== "QUIZ" || !debugInfo?.academyStudentId || allWords.length === 0) {
      return;
    }

    (async () => {
      try {
        const { data, error } = await supabase
          .from("vocab_learning_attempts")
          .select("wrong_word_ids")
          .eq("student_id", debugInfo.academyStudentId)
          .execute();

        if (error) {
          console.warn("Failed to load cumulative quiz:", error);
          return;
        }

        // 집계: 모든 wrong_word_ids 수집 후 중복 제거
        const weakWordIds = new Set<string>();
        for (const record of data ?? []) {
          const ids = Array.isArray(record.wrong_word_ids) ? record.wrong_word_ids : [];
          ids.forEach((id) => weakWordIds.add(id));
        }

        // 단어 정보 조회
        const weak = Array.from(weakWordIds)
          .map((id) => allWords.find((w) => w.id === id))
          .filter(Boolean) as SessionWord[];

        // 최대 10개 문항 (무작위 선택)
        const shuffled = weak.sort(() => Math.random() - 0.5).slice(0, 10);
        setCumulativeWeakWords(shuffled);
        setQuizAnswers({});
      } catch (e) {
        console.warn("Error loading cumulative quiz:", e);
      }
    })();
  }, [stage, debugInfo?.academyStudentId, allWords, supabase]);

  // ✅ stage renderer
  const renderStage = () => {
    const Debug = null; // DebugPanel 비활성화
    const academyStudentId = debugInfo?.academyStudentId ?? null;

    // ✅ 모든 stage에서 공통으로 보여줄 헤더
    const headerBlock = trackTitle ? (
      <div className="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-6 py-4">
        <div className="text-sm font-semibold text-blue-900">{trackTitle}</div>
        {dayIndex != null && totalDays != null ? (
          <div className="text-2xl font-bold text-blue-700 mt-1">Day {dayIndex} / {totalDays}</div>
        ) : (
          <div className="text-2xl font-bold text-blue-700 mt-1">진도 정보 로딩 중...</div>
        )}
      </div>
    ) : null;

    if (stage === "LOADING") {
      return <div className="mx-auto max-w-xl p-6 text-center text-slate-700">Loading session...</div>;
    }

    if (stage === "PRESCREEN") {
      return (
        <CardWrap>
          {Debug}
          {headerBlock}

          {process.env.NODE_ENV !== "production" && shortcut.n > 0 && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
              DEV TEST MODE: n={shortcut.n} {shortcut.seed ? `(seed=${shortcut.seed})` : "(seed=auto)"}{" "}
              <span className="text-indigo-500">| 새로고침해도 같은 샘플 유지하려면 seed=123 같이 쓰면 돼</span>
            </div>
          )}

          <PrescreenBoard
            words={prescreenWords as any}
            onFinish={(r: PrescreenResult) => {
              setPrescreenResult(r);

              // ✅ 결과 저장: 모르는 단어들 기록
              if (academyStudentId && sessionSetId) {
                try {
                  saveVocabAttemptAction({
                    studentId: academyStudentId,
                    setId: sessionSetId,
                    wordIds: r.unknownWordIds || [],
                    stage: "know",
                    passed: undefined,
                    assignmentId: debugInfo?.assignmentId,
                  }).catch((e) => console.warn("Failed to save prescreen attempt:", e));
                } catch (e) {
                  console.warn("Failed to save prescreen attempt:", e);
                }
              }

              const knownCount = Array.isArray((r as any)?.knownWordIds) ? (r as any).knownWordIds.length : 0;

              if (knownCount === 0) {
                setSpellingResult(makeEmptySpellingResult());
                setStage("SUMMARY");
                return;
              }

              setStage("SPELLING");
            }}
          />
        </CardWrap>
      );
    }

    if (stage === "SPELLING") {
      if (!prescreenResult || spellingWords.length === 0) {
        return (
          <CardWrap>
            {Debug}
            {headerBlock}
            <div className="rounded-2xl border bg-white p-6 text-center text-slate-700">Preparing spelling...</div>
          </CardWrap>
        );
      }

      return (
        <CardWrap>
          {Debug}
          {headerBlock}

          <PrescreenSpellingBoard
            words={spellingWords as any}
            onFinish={(r: SpellingResult) => {
              setSpellingResult(r);

              // ✅ 결과 저장: 철자를 틀린 단어들 기록
              if (academyStudentId && sessionSetId) {
                try {
                  saveVocabAttemptAction({
                    studentId: academyStudentId,
                    setId: sessionSetId,
                    wordIds: r.spellingFailedIds || [],
                    stage: "spelling",
                    passed: undefined,
                    assignmentId: debugInfo?.assignmentId,
                  }).catch((e) => console.warn("Failed to save spelling attempt:", e));
                } catch (e) {
                  console.warn("Failed to save spelling attempt:", e);
                }
              }

              setStage("SUMMARY");
            }}
          />
        </CardWrap>
      );
    }

    if (stage === "SUMMARY") {
      if (!prescreenResult || !spellingResult) {
        return (
          <CardWrap>
            {Debug}
            <div className="rounded-2xl border bg-white p-6 text-center text-slate-700">Missing summary data.</div>
          </CardWrap>
        );
      }

      return (
        <CardWrap>
          {Debug}

          <SummaryScreen
            words={allWords}
            recentWeakWords={recentWeakWords}
            prescreenMap={(() => {
              const m: Record<string, any> = {};
              for (const id of prescreenResult?.knownWordIds ?? []) m[id] = true;
              for (const id of prescreenResult?.unknownWordIds ?? []) m[id] = false;
              return m;
            })()}
            spellPassMap={(() => {
              const m: Record<string, any> = {};
              const failed = new Set<string>((spellingResult?.spellingFailedIds ?? []).filter(Boolean));
              for (const id of prescreenResult?.knownWordIds ?? []) {
                m[id] = failed.has(id) ? false : true;
              }
              return m;
            })()}
            onQuiz={() => setStage("QUIZ")}
            onContinue={(payload: any) => {
              if (payload?.xknowList && Array.isArray(payload.xknowList)) {
                setLearningWords(payload.xknowList);
                setStage("LEARNING_INTRO");
                return;
              }

              const base = prescreenResult.unknownWordIds
                .map((id: string) => allWords.find((w) => w.id === id))
                .filter(Boolean) as SessionWord[];

              const failedArr = (spellingResult as any).spellingFailedIds
                ? (spellingResult as any).spellingFailedIds
                    .map((id: string) => allWords.find((w) => w.id === id))
                    .filter(Boolean)
                : ([] as SessionWord[]);

              const map = new Map<string, SessionWord>();
              [...base, ...failedArr].forEach((w) => map.set(w.id, w));

              const final = [...map.values()];
              setLearningWords(final);
              setStage("LEARNING_INTRO");
            }}
          />
        </CardWrap>
      );
    }

    if (stage === "QUIZ") {
      if (cumulativeWeakWords.length === 0) {
        return (
          <CardWrap>
            {Debug}
            <div className="rounded-2xl border bg-white p-6 text-center text-slate-700">
              <div className="text-lg font-bold mb-4">No Quiz Available</div>
              <p className="mb-6">You haven't accumulated enough vulnerable words yet.</p>
              <button
                type="button"
                onClick={() => setStage("LEARNING_INTRO")}
                className="w-full rounded-xl bg-emerald-600 py-3 text-white font-bold"
              >
                Back to Learning
              </button>
            </div>
          </CardWrap>
        );
      }

      const currentQuizIdx = Object.keys(quizAnswers).length;
      const currentWord = cumulativeWeakWords[currentQuizIdx];
      const isQuizComplete = currentQuizIdx >= cumulativeWeakWords.length;

      if (isQuizComplete) {
        const correct = Object.values(quizAnswers).filter((v) => v === true).length;
        const total = cumulativeWeakWords.length;
        const percentage = Math.round((correct / total) * 100);

        return (
          <CardWrap>
            {Debug}
            <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-center">
              <div className="text-5xl mb-4">✅</div>
              <div className="text-2xl font-bold text-emerald-900 mb-2">Quiz Complete!</div>
              <div className="text-4xl font-bold text-emerald-700 mb-6">{percentage}%</div>
              <div className="text-sm text-emerald-800 mb-6">
                {correct} / {total} correct
              </div>
              <button
                type="button"
                onClick={() => setStage("LEARNING_INTRO")}
                className="w-full rounded-xl bg-emerald-600 py-3 text-white font-bold hover:bg-emerald-700 transition"
              >
                Continue to Learning
              </button>
            </div>
          </CardWrap>
        );
      }

      return (
        <CardWrap>
          {Debug}
          <div className="rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50 p-8">
            <div className="mb-6 text-sm font-semibold text-purple-700">
              Question {currentQuizIdx + 1} / {cumulativeWeakWords.length}
            </div>

            <div className="mb-8 space-y-4">
              <div className="text-3xl font-bold text-purple-900">{currentWord?.text || "?"}</div>
              {currentWord?.meanings_ko && currentWord.meanings_ko.length > 0 ? (
                <div className="text-lg text-purple-700">{currentWord.meanings_ko[0]}</div>
              ) : (
                <div className="text-sm text-slate-500">No meaning available</div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setQuizAnswers({ ...quizAnswers, [currentWord.id]: true });
                }}
                className="flex-1 rounded-xl bg-emerald-500 py-4 text-white font-bold hover:bg-emerald-600 transition text-lg"
              >
                ✓ Correct
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuizAnswers({ ...quizAnswers, [currentWord.id]: false });
                }}
                className="flex-1 rounded-xl bg-red-500 py-4 text-white font-bold hover:bg-red-600 transition text-lg"
              >
                ✕ Wrong
              </button>
            </div>
          </div>
        </CardWrap>
      );
    }

    if (stage === "LEARNING_INTRO") {
      return (
        <CardWrap>
          {Debug}
          <StageIntroScreen title="Pay Attention!" subtitle="집중! 단어를 배워봅시다" onDone={() => setStage("LEARNING")} />
        </CardWrap>
      );
    }

    if (stage === "LEARNING") {
      return (
        <CardWrap>
          {Debug}
          <LearningRunner
            words={learningPayload}
            onFinish={() => setStage("SPEED")}
            trackTitle={trackTitle}
            dayIndex={dayIndex}
            totalDays={totalDays}
          />
        </CardWrap>
      );
    }

    if (stage === "SPEED") {
      // 테스트할 문항이 없으면(뜻 없는 세트 등) 바로 완료 처리
      if (speedQuestions.length === 0) {
        return (
          <CardWrap>
            {Debug}
            {headerBlock}
            <div className="rounded-2xl border bg-white p-6 text-center">
              <div className="text-lg font-bold text-slate-900">최종 점검할 항목이 없어요</div>
              <button
                type="button"
                disabled={completing}
                onClick={finishDay}
                className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {completing ? "완료 처리 중…" : "오늘 학습 완료"}
              </button>
            </div>
          </CardWrap>
        );
      }

      const secondsPerQuestion = speedTry === 1 ? 16 : 11;

      // 🔍 DEBUG
      console.log("📍 session/page.tsx SPEED stage - speedTry:", speedTry, "secondsPerQuestion:", secondsPerQuestion);

      return (
        <CardWrap>
          {Debug}
          {headerBlock}
          {speedTry > 1 && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
              틀린 단어 {speedQuestions.length}개 재도전 ({speedTry}차) — 통과하면 완료돼요
            </div>
          )}
          <SpeedChallengeRunner
            key={speedTry}
            userId={userId}
            questions={speedQuestions}
            tryIndex={speedTry}
            secondsPerQuestion={secondsPerQuestion}
            minPassAccuracy={0.7}
            onFinish={handleSpeedFinish}
          />
        </CardWrap>
      );
    }

    if (stage === "DRILL_INTRO") {
      // 범위를 선택하지 않았으면 RangeSelectorModal 표시
      if (!gameRange) {
        return (
          <>
            <CardWrap>
              {Debug}
              <div className="text-center py-8">
                <div className="text-2xl font-bold mb-4">🎮 Dodge & Match</div>
                <div className="text-gray-600">게임 난이도를 선택하세요...</div>
              </div>
            </CardWrap>
            <RangeSelectorModal
              onSelect={(range) => {
                setGameRange(range);
              }}
            />
          </>
        );
      }

      // 범위에 따라 단어 필터링
      let gameWords: SessionWord[] = [];

      if (gameRange === "TODAY") {
        // 오늘 진도: 학습 단어들
        gameWords = drillTargetWordIds
          .map((id) => allWords.find((w) => w.id === id))
          .filter(Boolean) as SessionWord[];
      } else if (gameRange === "CUMULATIVE") {
        // 누적진도: 모든 단어
        gameWords = allWords;
      }

      if (gameWords.length === 0) {
        return (
          <CardWrap>
            {Debug}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/80">
              <div className="text-xl font-bold mb-2">게임에 사용할 단어가 없습니다.</div>
              <div className="text-sm">다른 범위를 선택해주세요.</div>
            </div>
            <button
              type="button"
              className="w-full rounded-xl bg-emerald-500/90 py-3 text-sm font-semibold text-black mt-4"
              onClick={() => setGameRange(null)}
            >
              ⬅️ 범위 다시 선택
            </button>
          </CardWrap>
        );
      }

      // AsteroidGame 시작
      return (
        <AsteroidGame
          words={gameWords}
          onFinish={(score) => {
            console.log("🎮 Asteroid Game completed! Score:", score);
            setGameRange(null);
            setStage("DONE");
          }}
        />
      );
    }

    if (stage === "DRILL") {
      const canDrill = drillTasks.length > 0;

      if (!canDrill) {
        return (
          <CardWrap>
            {Debug}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/80">
              Drill tasks are empty. (blocked to prevent auto-skip)
            </div>
            <button
              type="button"
              className="w-full rounded-xl bg-emerald-500/90 py-3 text-sm font-semibold text-black"
              onClick={() => setStage("DRILL_INTRO")}
            >
              Back
            </button>
          </CardWrap>
        );
      }

      // Get drill words
      const drillWords = drillTargetWordIds
        .map((id) => allWords.find((w) => w.id === id))
        .filter(Boolean) as SessionWord[];

      if (drillWords.length === 0) {
        return (
          <CardWrap>
            {Debug}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/80">
              No words available for Dodge & Match game.
            </div>
            <button
              type="button"
              className="w-full rounded-xl bg-emerald-500/90 py-3 text-sm font-semibold text-black"
              onClick={() => setStage("DRILL_INTRO")}
            >
              Back
            </button>
          </CardWrap>
        );
      }

      return (
        <AsteroidGame
          words={drillWords}
          onFinish={(score) => {
            console.log("🎮 Asteroid Game completed! Score:", score);
            setStage("DONE");
          }}
        />
      );
    }

    if (stage === "DONE") {
      // ✅ 오답 분석: Spelling 실패 + Speed 오답 단어들
      const spellingFailedIds = new Set<string>((spellingResult?.spellingFailedIds ?? []).filter(Boolean));
      const speedWrongIds_Set = new Set<string>((speedWrongIds ?? []).filter(Boolean));

      const spellingFailedWords = Array.from(spellingFailedIds)
        .map(id => allWords.find(w => w.id === id))
        .filter(Boolean) as SessionWord[];

      const speedWrongWords = Array.from(speedWrongIds_Set)
        .map(id => allWords.find(w => w.id === id))
        .filter(Boolean) as SessionWord[];

      // ✅ 포인트 계산: Speed 정답률 기반
      const totalSpeedQuestions = speedQuestions.length || 1;
      const correctSpeedQuestions = totalSpeedQuestions - (speedWrongIds_Set.size || 0);
      const speedAccuracy = totalSpeedQuestions > 0 ? Math.round((correctSpeedQuestions / totalSpeedQuestions) * 100) : 0;

      let points = 0;
      if (speedAccuracy >= 90) points = 100;
      else if (speedAccuracy >= 80) points = 80;
      else if (speedAccuracy >= 70) points = 60;
      else if (speedAccuracy >= 60) points = 40;
      else if (speedAccuracy >= 50) points = 20;

      // ✅ 전체 정답률 (prescreen + spelling + speed)
      const totalWords = allWords.length;
      const knownWords = prescreenResult?.knownWordIds?.length ?? 0;
      const spellingPassWords = (knownWords - spellingFailedIds.size);
      const speedPassWords = correctSpeedQuestions;
      const totalAttempts = knownWords + speedQuestions.length;
      const totalCorrect = spellingPassWords + speedPassWords;
      const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

      return (
        <CardWrap className="py-10">
          {Debug}

          <div className="rounded-2xl border border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-8 text-black">
            {/* 헤더 */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold">완료! ✅</h2>
              <div className="mt-2 text-slate-600">오늘 세션 완료했어요!</div>
            </div>

            {/* 점수 카드 */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="rounded-xl bg-white p-4 text-center border border-emerald-200">
                <div className="text-sm font-semibold text-slate-600">최종 점검 정확도</div>
                <div className="text-3xl font-bold text-emerald-700 mt-2">{speedAccuracy}%</div>
              </div>
              <div className="rounded-xl bg-white p-4 text-center border border-emerald-200">
                <div className="text-sm font-semibold text-slate-600">획득 포인트</div>
                <div className="text-3xl font-bold text-amber-600 mt-2">{points}P</div>
              </div>
            </div>

            {/* 오답 분석 */}
            {(spellingFailedWords.length > 0 || speedWrongWords.length > 0) && (
              <div className="space-y-4 mb-8">
                <h3 className="font-bold text-lg text-slate-900">다시 확인할 단어들</h3>

                {/* Spelling 실패 */}
                {spellingFailedWords.length > 0 && (
                  <div className="rounded-xl bg-red-50 p-4 border border-red-200">
                    <div className="font-semibold text-red-900 mb-3">철자 오류 ({spellingFailedWords.length}개)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {spellingFailedWords.slice(0, 10).map(word => {
                        const wf = (wordFormsById as any)?.[word.id];
                        const pos = wf?.base_pos || "—";
                        return (
                          <div key={word.id} className="bg-white p-2 rounded border border-red-100 text-sm">
                            <div className="font-bold text-slate-900">{word.text}</div>
                            <div className="text-xs text-slate-600">
                              [{pos}] {(word.meanings_ko?.[0] ?? "—").substring(0, 20)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Speed 오답 */}
                {speedWrongWords.length > 0 && (
                  <div className="rounded-xl bg-amber-50 p-4 border border-amber-200">
                    <div className="font-semibold text-amber-900 mb-3">뜻 오류 ({speedWrongWords.length}개)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {speedWrongWords.slice(0, 10).map(word => {
                        const wf = (wordFormsById as any)?.[word.id];
                        const pos = wf?.base_pos || "—";
                        return (
                          <div key={word.id} className="bg-white p-2 rounded border border-amber-100 text-sm">
                            <div className="font-bold text-slate-900">{word.text}</div>
                            <div className="text-xs text-slate-600">
                              [{pos}] {(word.meanings_ko?.[0] ?? "—").substring(0, 20)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 버튼 */}
            <div className="space-y-2">
              <button
                className="w-full rounded-xl bg-emerald-600 py-3 text-white font-bold hover:bg-emerald-700 transition"
                onClick={() => window.location.reload()}
              >
                다시 시작
              </button>

              <button
                className="w-full rounded-xl border border-emerald-600 bg-white py-3 text-emerald-700 font-bold hover:bg-emerald-50 transition"
                onClick={() => {
                  try {
                    sessionStorage.removeItem(SPEED_DRILL_KEY);
                    sessionStorage.removeItem(STORAGE_KEY);
                  } catch {}
                  window.location.href = "/home";
                }}
              >
                홈으로 돌아가기
              </button>
            </div>
          </div>
        </CardWrap>
      );
    }

    return (
      <CardWrap className="py-10">
        {Debug}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/80">
          Unknown stage: <code className="break-all">{stage}</code>
        </div>
        <button
          className="w-full rounded-xl bg-emerald-500/90 py-3 text-sm font-semibold text-black"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </CardWrap>
    );
  };

  return (
    <PageShell>
      <StageBackground stage={stage} />
      <MascotLayer stage={stage} mood={penguin.mood} />
      <div className="relative z-10">{renderStage()}</div>
    </PageShell>
  );
}
