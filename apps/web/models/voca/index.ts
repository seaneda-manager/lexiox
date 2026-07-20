// apps/web/models/voca/index.ts
import type { z } from "zod";
import {
  zVocaWord,
  zVocaReinforcePassage,
  zVocaOutputTask,
  zVocaTestConfig,
  zVocaTest,
  zVocaUserAnswer,
  zVocaResult,
  zVocaStudyBundle,
} from "./zod";

export {
  zVocaWord,
  zVocaReinforcePassage,
  zVocaOutputTask,
  zVocaTestConfig,
  zVocaTest,
  zVocaUserAnswer,
  zVocaResult,
  zVocaStudyBundle,
};

// ✅ 타입은 항상 Zod 스키마 기준으로만 infer (SSOT)
export type TVocaWord = z.infer<typeof zVocaWord>;
export type TVocaReinforcePassage = z.infer<typeof zVocaReinforcePassage>;
export type TVocaOutputTask = z.infer<typeof zVocaOutputTask>;
export type TVocaTestConfig = z.infer<typeof zVocaTestConfig>;
export type TVocaTest = z.infer<typeof zVocaTest>;
export type TVocaUserAnswer = z.infer<typeof zVocaUserAnswer>;
export type TVocaResult = z.infer<typeof zVocaResult>;
export type TVocaStudyBundle = z.infer<typeof zVocaStudyBundle>;
