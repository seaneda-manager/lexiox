// apps/web/models/voca/zod.ts
import { z } from "zod";

/**
 * 개별 단어
 *
 * - pos: 품사 (noun, verb, adj, adv, phrase 등)
 * - tags: 난이도/주제/시험유형 등 자유 태깅
 */
export const zVocaWord = z.object({
  id: z.string(), // DB uuid 또는 문자열 id
  word: z.string().min(1, "word is required"),
  pos: z.string().min(1, "pos is required"),
  meaning_kr: z.string().min(1, "Korean meaning is required"),
  meaning_en: z.string().min(1, "English meaning is required"),
  examples: z.array(z.string()).default([]),
  // 예: ["school", "TOEFL", "junior", "slang", "KR-neo-word"]
  tags: z.array(z.string()).default([]),
  // 앱 내부 레벨 (1~10 / 1~5 / 0~100 등 션이 나중에 의미 정의)
  level: z.number().int().min(1).max(10).default(5),
  created_at: z.string().optional(), // ISO string (DB에서 채워짐)
});

/**
 * Reinforcing Passage
 *
 * - text: 패시지 원문
 * - level: 대략적인 난이도
 * - word_ids: 이 패시지에 "의도적으로" 넣은 단어 id 리스트
 */
export const zVocaReinforcePassage = z.object({
  id: z.string(),
  title: z.string().default(""),
  text: z.string().min(1, "text is required"),
  level: z.number().int().min(1).max(10).default(5),
  word_ids: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  created_at: z.string().optional(),
});

/**
 * Output Task (Speaking / Writing)
 *
 * - required_word_ids: 반드시 사용하게 하고 싶은 단어 id들
 * - suggested_word_ids: 사용하면 좋지만 필수는 아닌 단어들
 */
export const zVocaOutputTask = z.object({
  id: z.string(),
  type: z.enum(["speaking", "writing"]),
  title: z.string().default(""),
  prompt: z.string().min(1, "prompt is required"),
  required_word_ids: z.array(z.string()).default([]),
  suggested_word_ids: z.array(z.string()).default([]),
  level: z.number().int().min(1).max(10).default(5),
  tags: z.array(z.string()).default([]),
  created_at: z.string().optional(),
});

/**
 * 시험/과제용 VOCA 세트
 *
 * - mode: study / test / mixed
 * - word_ids / passage_ids / output_task_ids 조합으로 한 세트를 구성
 */
export const zVocaTestConfig = z.object({
  mode: z.enum(["study", "test", "mixed"]).default("mixed"),
  items_per_round: z.number().int().min(1).max(200).optional(),
  shuffle: z.boolean().default(true),
});

export const zVocaTest = z.object({
  id: z.string(),
  label: z.string().min(1),
  description: z.string().default(""),
  level: z.number().int().min(1).max(10).default(5),
  word_ids: z.array(z.string()).default([]),
  passage_ids: z.array(z.string()).default([]),
  output_task_ids: z.array(z.string()).default([]),
  config: zVocaTestConfig.default({ mode: "mixed", shuffle: true }),
  tags: z.array(z.string()).default([]),
  created_at: z.string().optional(),
});

/**
 * 개별 문항/단어에 대한 응답
 *
 * - item_type: "word" | "passage" | "output"
 * - target_id: word/passage/task id
 */
export const zVocaUserAnswer = z.object({
  item_id: z.string(), // Runner 내부 item id
  item_type: z.enum(["word", "passage", "output"]),
  target_id: z.string(), // 실제 word_id / passage_id / output_task_id
  // 예: 객관식/스펠링/주관식 등 나중 확장 가능
  user_input: z.string().optional(),
  is_correct: z.boolean().optional(),
  // 필요하면 scoring meta를 여기에 JSON으로 쌓기
  meta: z.record(z.string(), z.unknown()).optional(),
});

/**
 * 시험/과제 결과 요약
 *
 * Reading 2026의 reading_results_2026 구조와 비슷하게 맞춤
 */
export const zVocaResult = z.object({
  id: z.string(),
  test_id: z.string(),
  user_id: z.string().nullable(),
  total_items: z.number().int().min(0),
  answers: z.array(zVocaUserAnswer).default([]),
  correct_count: z.number().int().min(0).optional(),
  raw_score: z.number().optional(),
  finished_at: z.string().nullable(),
  created_at: z.string().optional(),
});

/**
 * Study 페이지에서 한 번에 내려줄 수 있는 번들 구조
 * (필요 없으면 나중에 안 써도 됨, 하지만 Runner 만들 때 꽤 편함)
 */
export const zVocaStudyBundle = z.object({
  words: z.array(zVocaWord),
  passages: z.array(zVocaReinforcePassage),
  output_tasks: z.array(zVocaOutputTask),
});
