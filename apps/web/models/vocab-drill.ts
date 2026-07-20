// apps/web/models/vocab-drill.ts

import type { VocabWordCore } from "@/models/vocab";

// 오늘 Drill 진행 단계
export type DrillPhase =
  | "flash"    // 지난/오늘 단어 깜빡이
  | "reading"  // 미니 지문 + 문제
  | "vocab"    // WordlyWise 스타일 드릴
  | "speaking" // 스피킹 프롬프트
  | "writing"  // 라이팅 프롬프트
  | "summary"; // 요약/완료

// 문제 타입
export type DrillQuestionType =
  | "CLOZE"        // 빈칸 채우기
  | "MATCHING"     // 매칭 (단어-뜻 등)
  | "MULTI_CHOICE" // 객관식
  | "SHORT_ANSWER";// 짧은 주관식

export interface BaseDrillQuestion {
  id: string;
  type: DrillQuestionType;
  prompt: string;    // 질문/지시 텍스트
  wordIds: string[]; // 관련 단어 id 목록
}

export interface ClozeDrillQuestion extends BaseDrillQuestion {
  type: "CLOZE";
  sentenceEnWithBlank: string; // 빈칸 포함 문장
  options: string[];           // 단어 후보
  answer: string;              // 정답 단어
}

export interface MatchingDrillQuestion extends BaseDrillQuestion {
  type: "MATCHING";
  leftItems: string[];  // 단어
  rightItems: string[]; // 뜻 or 예문 조각
}

export type DrillQuestion =
  | ClozeDrillQuestion
  | MatchingDrillQuestion;

// 스피킹/라이팅 프롬프트
export interface SpeakingPrompt {
  id: string;
  question: string;
  hintKo?: string;
  targetWordIds: string[];   // 쓰면 좋은 단어
}

export interface WritingPrompt {
  id: string;
  question: string;
  hintKo?: string;
  minSentences?: number;
  targetWordIds: string[];
}

// 오늘 Drill 세트 전체
export interface VocabDrillSet {
  id: string;
  title: string;
  wordsToday: VocabWordCore[];
  wordsReview: VocabWordCore[];
  readingPassage: {
    title: string;
    text: string;
    questions: DrillQuestion[];
  };
  vocabQuestions: DrillQuestion[];
  speakingPrompt: SpeakingPrompt | null;
  writingPrompt: WritingPrompt | null;
}
