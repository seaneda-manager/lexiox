/* =========================
   stage
========================= */

export type LearningStage =
  | "INTRO"
  | "CARD"
  | "CHALLENGE"
  | "COMPLETE";

/* =========================
   payload (UI core)
   ✅ Learning UI에 필요한 필드만
========================= */

export type LearningWord = {
  id: string;
  text: string;
  meanings_ko: string[];

  // 품사 (데이터가 있을 때만 표시)
  pos?: string | null;
  // 한글 발음 (따라쓰기용) / 뜻별 품사 (뜻을 ';'로 펼친 순서와 1:1)
  pronunciation_ko?: string | null;
  meaning_pos?: string[] | null;

  // ✅ optional enrich (있으면 보여주고 없으면 무시)
  phonetic?: string | null;
  audioUrl?: string | null;

  // UI에서 쓰고 싶으면 기본 en-US
  ttsLang?: string | null;

  // learning용: "대표 동의어 1~2개" (flattened)
  synonyms_ko?: string[] | null;

  // 대표 예문 1개
  example_en?: string | null;
  example_ko?: string | null;
};

/* =========================
   result (SSOT)
========================= */

export type LearningResult = {
  completedWordIds: string[];
  weakWordIds: string[];
};
