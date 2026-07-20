// apps/web/models/reading/index.ts

import {
  READING_QTYPES,
  qTypeEnum,
  readingChoiceSchema,
  readingMetaSchema,
  readingQuestionSchema,
  readingPassageSchema,
  readingSetSchema,
  type RChoice,
  type RQuestion,
  type RPassage,
  type RSet,
} from "./zod";

/** -----------------------------
 *  Re-exports (SSOT)
 *  ----------------------------*/
export {
  // consts
  READING_QTYPES,
  qTypeEnum,
  // schemas
  readingChoiceSchema,
  readingMetaSchema,
  readingQuestionSchema,
  readingPassageSchema,
  readingSetSchema,
  // types
  type RChoice,
  type RQuestion,
  type RPassage,
  type RSet,
  };

/** -----------------------------
 *  Helpers (공용)
 *  ----------------------------*/

/** 엄격 검증 + 타입 세이프 파싱 */
export function parseReadingSet(input: unknown): RSet {
  return readingSetSchema.parse(input);
}

/** content → paragraphs (폼/JSON에서 동일 규칙 공유) */
export function splitParagraphs(
  content: string,
  mode: "auto" | "blankline" | "html" = "auto"
): string[] {
  if (!content) return [];
  if (mode === "html") {
    return content
      .split(/<\/p>|<\/div>/i)
      .map((s) => s.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean);
  }
  // auto/blankline: 빈 줄 단위
  return content
    .split(/\n{2,}/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** paragraphs → content (DB 저장 브릿지) */
export function joinParagraphs(paragraphs: string[] | undefined): string {
  return Array.isArray(paragraphs)
    ? paragraphs.filter(Boolean).join("\n\n")
    : "";
}

/** 메타 읽기 보조 (any-safe) */
export function metaView(q: RQuestion) {
  const m = (q.meta ?? {}) as any;
  return {
    summary: (m.summary ?? {}) as {
      candidates?: string[];
      correct?: number[]; // 0-based index list
      selectionCount?: number; // required selection count
    },
    insertion: (m.insertion ?? {}) as {
      anchors?: (string | number)[];
      correctIndex?: number;
      marker?: string; // 예: '[[INS]]' 또는 '[#]'
    },
    pronoun_ref: (m.pronoun_ref ?? {}) as {
      pronoun?: string;
      referents?: string[];
      correctIndex?: number;
    },
    paragraph_highlight: (m.paragraph_highlight ?? {}) as {
      paragraphs?: number[];
    },
  };
}

/** 질문 타입 보정 (레거시 'single' → 'detail') */
export function normalizeQType(t: unknown): RQuestion["type"] {
  const ok: RQuestion["type"][] = [
    "vocab",
    "detail",
    "negative_detail",
    "paraphrasing",
    "inference",
    "purpose",
    "pronoun_ref",
    "insertion",
    "summary",
    "organization",
  ];
  const s = String(t);
  if (s === "single") return "detail";
  return (ok as unknown as string[]).includes(s)
    ? (s as RQuestion["type"])
    : "detail";
}

/** 레거시 is_correct → isCorrect 브릿지 */
export function coerceIsCorrect(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s === "1" || s === "true" || s === "y" || s === "yes";
  }
  return false;
}

/** 간단 Lint (필수 필드/범위/카디널리티 점검) */
export function lintReadingSet(
  set: RSet
): Array<{ level: "error" | "warn"; where: string; msg: string }> {
  const issues: Array<{ level: "error" | "warn"; where: string; msg: string }> =
    [];
  const p0 = set.passages?.[0];
  if (!p0) {
    issues.push({
      level: "error",
      where: "set.passages",
      msg: "At least one passage is required.",
    });
    return issues;
  }
  const paras = Array.isArray(p0.paragraphs) ? p0.paragraphs : [];

  (p0.questions || []).forEach((q, qi) => {
    const where = `Q${q.number}(${q.type})`;
    const m = metaView(q);

    // 번호 연속성
    if (q.number !== qi + 1) {
      issues.push({
        level: "warn",
        where,
        msg: `Question number mismatch. Expected ${qi + 1}, got ${q.number}.`,
      });
    }

    // 선택지
    if (!q.choices?.length)
      issues.push({ level: "error", where, msg: "No choices provided." });
    q.choices?.forEach((c, ci) => {
      if (!String(c.text ?? "").trim())
        issues.push({
          level: "warn",
          where,
          msg: `Choice #${ci + 1} has empty text.`,
        });
    });

    // 유형별 메타
    if (q.type === "summary") {
      const cand = m.summary.candidates ?? [];
      const cor = m.summary.correct ?? [];
      const sel = Number.isFinite(m.summary.selectionCount)
        ? (m.summary.selectionCount as number)
        : NaN;

      if (cand.length === 0)
        issues.push({
          level: "error",
          where,
          msg: "summary.candidates required.",
        });
      if (!Number.isFinite(sel) || sel < 1)
        issues.push({
          level: "error",
          where,
          msg: "summary.selectionCount must be >= 1.",
        });
      if (cor.length !== sel)
        issues.push({
          level: "error",
          where,
          msg: `summary.correct length (${
            cor.length
          }) must equal selectionCount (${Number.isNaN(sel) ? "NaN" : sel}).`,
        });
      if (cor.some((i: number) => i < 0 || i >= cand.length))
        issues.push({
          level: "error",
          where,
          msg: "summary.correct index out of range.",
        });
      if (q.choices.length < sel * 2)
        issues.push({
          level: "warn",
          where,
          msg: `summary needs >= ${sel * 2} choices.`,
        });
    } else if (q.type === "insertion") {
      const ins = m.insertion;
      const anchorsLen = ins.anchors?.length ?? 0;
      if (!anchorsLen)
        issues.push({
          level: "error",
          where,
          msg: "insertion.anchors required.",
        });
      if (
        ins &&
        (ins.correctIndex == null ||
          ins.correctIndex < 0 ||
          ins.correctIndex >= anchorsLen)
      ) {
        issues.push({
          level: "error",
          where,
          msg: "insertion.correctIndex out of range.",
        });
      }
    } else if (q.type === "pronoun_ref") {
      const pr = m.pronoun_ref;
      if (!pr?.pronoun)
        issues.push({
          level: "warn",
          where,
          msg: "pronoun_ref.pronoun is empty.",
        });
      const refLen = pr?.referents?.length ?? 0;
      if (!refLen)
        issues.push({
          level: "error",
          where,
          msg: "pronoun_ref.referents required.",
        });
      if (
        pr &&
        (pr.correctIndex == null ||
          pr.correctIndex < 0 ||
          pr.correctIndex >= refLen)
      ) {
        issues.push({
          level: "error",
          where,
          msg: "pronoun_ref.correctIndex out of range.",
        });
      }
    }

    // 단락 하이라이트 인덱스 범위
    const ph = m.paragraph_highlight.paragraphs ?? [];
    if (ph.some((i: number) => i < 0 || i >= paras.length)) {
      issues.push({
        level: "error",
        where,
        msg: `paragraph_highlight index out of range (passages have ${paras.length} paragraphs).`,
      });
    }

    // summary 외 유형은 정답 1개
    if (q.type !== "summary") {
      const cs = (q.choices || []).filter((c) => (c as any).isCorrect === true);
      if (cs.length !== 1) {
        issues.push({
          level: "error",
          where,
          msg: `Single correct choice required. Found ${cs.length}.`,
        });
      }
    }
  });

  return issues;
}

/** 질문 번호 1..N 정규화 */
export function renumberQuestions(qs: RQuestion[]): RQuestion[] {
  return qs.map((q, i) => ({ ...q, number: i + 1 }));
}

/** 최소 세트 팩토리 (SSR/Node 환경 crypto.randomUUID 사용) */
export function makeMinimalSet(id: string): RSet {
  const uid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    label: "New Reading Set",
    source: "",
    version: 1,
    passages: [
      {
        id: uid,
        title: "Untitled Passage",
        paragraphs: ["Write your passage here..."],
        questions: [],
      },
    ],
  };
}

/** -----------------------------
 *  2026 iBT Adaptive 구조 (beta)
 *  ----------------------------*/

/** 어떤 시험 포맷인지 (기존 vs 2026 개편) */
export type ExamEra = "ibt_legacy" | "ibt_2026";

/** Runner나 대시보드에서 쓸 최소 메타 정보 */
export interface RReadingTestMeta {
  id: string;
  label: string;
  examEra: ExamEra;
  source?: string | null;
}

/** 2026 Reading에서 지원할 Task 타입 */
export type ReadingTaskKind =
  | "complete_words" // Complete the Words
  | "daily_life" // Read in Daily Life
  | "academic_passage"; // Read an Academic Passage

/** 공통 베이스 (stage, 난이도 등) */
export interface RReadingItemBase {
  id: string;
  taskKind: ReadingTaskKind;
  stage: 1 | 2;
  difficulty?: "easy" | "core" | "hard";
}

/** A. Complete the Words (단락 cloze + 철자 단위 정답) */
export interface RCompleteWordsBlank {
  id: string; // questionId와 매핑 (예: "cw-1")
  order: number;
  correctToken: string; // 's', 'to', 'ions' 처럼 채워 넣을 조각
  distractors?: string[]; // 보기형으로 만들 때 오답 후보 (옵션)
}

export interface RCompleteWordsItem extends RReadingItemBase {
  taskKind: "complete_words";
  paragraphHtml: string; // [__] 같은 마킹 포함된 HTML
  blanks: RCompleteWordsBlank[];
}

/** B. Read in Daily Life (공지/이메일/SNS/웹 등) */
export type DailyLifeContextType =
  | "notice"
  | "email"
  | "social_post"
  | "web_article"
  | "other";

export interface RDailyLifeItem extends RReadingItemBase {
  taskKind: "daily_life";
  contextType: DailyLifeContextType;
  contentHtml: string; // 레이아웃 포함 HTML (이메일/공지 카드 등)
  questions: RQuestion[]; // 기존 질문 구조 재사용
}

/** C. Read an Academic Passage (짧은 학술 지문 + 기존 질문들) */
export interface RAcademicPassageItem extends RReadingItemBase {
  taskKind: "academic_passage";
  passageHtml: string;
  questions: RQuestion[];
}

/** 2026 Reading에서 등장하는 모든 item 유니온 */
export type RReadingItem =
  | RCompleteWordsItem
  | RDailyLifeItem
  | RAcademicPassageItem;

/** ETS multistage 구조: Stage 1 / Stage 2 모듈 */
export interface RReadingModule {
  id: string;
  stage: 1 | 2;
  items: RReadingItem[];
  isPretest?: boolean; // 점수에 안 들어가는 pretest item 표시용 (나중 확장)
}

/** Adaptive Stage 2 pool: Stage 1 정답률에 따라 hard/easy 분기 */
export interface RStage2Pool {
  cutScore: number;          // 예: 0.7 (70% 이상 → hard)
  hard: RReadingModule;      // High 모듈
  easy: RReadingModule;      // Low-Mid 모듈
}

/** 2026 형식 전체 Reading 세트 (Runner에서 바로 사용 가능) */
export interface RReadingTest2026 {
  meta: RReadingTestMeta;                      // examEra === 'ibt_2026' 여야 함
  modules: [RReadingModule, RReadingModule];   // [Stage1, Stage2 기본값]
  stage2Pool?: RStage2Pool;                    // 적응형 시험에서 사용
}
export * from "./naesin";