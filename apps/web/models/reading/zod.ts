// apps/web/models/reading/zod.ts
import { z } from "zod";

/** -----------------------------
 *  Question type (SSOT)
 *  ----------------------------*/
export const READING_QTYPES = [
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
] as const;

export const qTypeEnum = z.enum(READING_QTYPES);

/** -----------------------------
 *  Choice
 *  ----------------------------*/
export const readingChoiceSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, "choice.text is required"),
  /** summary 외엔 meta.correctCount(기본 1)만큼 true 허용 */
  isCorrect: z.boolean().optional().default(false),
});
export type RChoice = z.infer<typeof readingChoiceSchema>;

/** -----------------------------
 *  Meta per type (loosely typed)
 *  ----------------------------*/
// summary
const summaryMetaSchema = z.object({
  candidates: z.array(z.string()).default([]),
  /** 0-based indices */
  correct: z.array(z.number().int().nonnegative()).default([]),
  selectionCount: z.number().int().positive().default(2),
});

// insertion
const insertionMetaSchema = z.object({
  anchors: z.array(z.union([z.string(), z.number()])).default([]),
  correctIndex: z.number().int().nonnegative().optional(),
});

// pronoun_ref
const pronounRefMetaSchema = z.object({
  pronoun: z.string().optional(),
  referents: z.array(z.string()).default([]),
  correctIndex: z.number().int().nonnegative().optional(),
});

// paragraph_highlight
const paragraphHighlightMetaSchema = z.object({
  paragraphs: z.array(z.number().int().nonnegative()).default([]),
});

/** NEW: 요약(summary) 제외 모든 유형에서 허용할 정답 개수(1~3, 기본 1) */
const correctCountSchema = z.number().int().min(1).max(3).default(1);

/** 전체 meta 컨테이너 (유형별 서브키를 선택적으로 보유) */
export const readingMetaSchema = z
  .object({
    summary: summaryMetaSchema.optional(),
    insertion: insertionMetaSchema.optional(),
    pronoun_ref: pronounRefMetaSchema.optional(),
    paragraph_highlight: paragraphHighlightMetaSchema.optional(),
    /** NEW */
    correctCount: correctCountSchema.optional(),
  })
  .passthrough(); // 유연성 확보
export type RMeta = z.infer<typeof readingMetaSchema>;

/** -----------------------------
 *  Question
 *  ----------------------------*/
const baseQuestionSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().positive(),
  type: qTypeEnum,
  stem: z.string().min(1, "stem is required"),
  /** 보기 2~6개 (A–F) */
  choices: z
    .array(readingChoiceSchema)
    .min(2, "At least 2 choices are required")
    .max(6, "At most 6 choices are allowed"),
  meta: readingMetaSchema.optional(),
});

export const readingQuestionSchema = baseQuestionSchema.superRefine(
  (q, ctx) => {
    // summary는 selectionCount 규칙으로 별도 검증
    if (q.type === "summary") {
      const s = q.meta?.summary;
      if (!s) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "summary.meta is required for summary type",
          path: ["meta", "summary"],
        });
        return;
      }
      const candLen = (s.candidates ?? []).length;
      const need = s.selectionCount ?? 2;
      const correct = s.correct ?? [];

      if (need < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "summary.selectionCount must be >= 1",
          path: ["meta", "summary", "selectionCount"],
        });
      }
      if (candLen < need) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `summary.candidates must have at least ${need} items`,
          path: ["meta", "summary", "candidates"],
        });
      }
      if (correct.length !== need) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `summary.correct length (${correct.length}) must equal selectionCount (${need})`,
          path: ["meta", "summary", "correct"],
        });
      }
      if (correct.some((i) => i < 0 || i >= candLen)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "summary.correct index out of range",
          path: ["meta", "summary", "correct"],
        });
      }
      return;
    }

    // summary 외: correctCount(기본 1) 만큼 isCorrect=true
    const want = Math.max(1, Math.min(3, q.meta?.correctCount ?? 1));
    const have = (q.choices ?? []).filter((c) => !!c.isCorrect).length;
    if (have !== want) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Exactly ${want} correct choice(s) required, found ${have}.`,
        path: ["choices"],
      });
    }
  }
);
export type RQuestion = z.infer<typeof readingQuestionSchema>;

/** -----------------------------
 *  Passage
 *  ----------------------------*/
export const readingPassageSchema = z.object({
  id: z.string().min(1),
  title: z.string().default(""),
  paragraphs: z.array(z.string().min(1)).min(1, "at least 1 paragraph"),
  questions: z.array(readingQuestionSchema).default([]),
});
export type RPassage = z.infer<typeof readingPassageSchema>;

/** -----------------------------
 *  Reading Set (SSOT 루트)
 *  ----------------------------*/
export const readingSetSchema = z.object({
  id: z.string().min(1),
  label: z.string().default(""),
  source: z.string().default(""),
  version: z.number().int().nonnegative().default(1),
  passages: z.array(readingPassageSchema).min(1, "at least 1 passage"),
});
export type RSet = z.infer<typeof readingSetSchema>;
