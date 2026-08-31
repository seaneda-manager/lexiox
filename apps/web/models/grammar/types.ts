export type GrammarLevel = "ms" | "hs" | "toefl" | "all";
export type GrammarUnitStatus = "draft" | "published";

export type GrammarUnit = {
  id: string;
  label_ko: string;
  label_en: string;
  description?: string;
  level: GrammarLevel;
  order_index: number;
  status: GrammarUnitStatus;
};

// --- 설명 세그먼트 ---

export type ExplanationSegmentType = "text" | "animation" | "blank" | "video" | "board";

export type TextSegmentContent = { text: string };
export type AnimationSegmentContent = { key: string; duration_ms: number };
export type BlankSegmentContent = {
  prompt: string;
  answer: string;
  hint_ko?: string;
};

// 판서(칠판) 세그먼트: 라인별 타이핑 + 강조 마크
export type BoardEmphasisKind = "highlight" | "circle" | "underline";
export type BoardLine = {
  text: string;
  // from/to = text 내 문자 인덱스 [from, to)
  emphasis?: Array<{ from: number; to: number; kind: BoardEmphasisKind }>;
};
export type BoardSegmentContent = {
  title?: string;
  lines: BoardLine[];
};

export type PausePoint = {
  id: string;
  timestamp_sec: number;   // 몇 초에서 멈출지
  prompt: string;          // "주어가 단수이면 동사도 ___해야 한다."
  answer: string;
  hint_ko?: string;
};

export type VideoSegmentContent = {
  video_url: string;
  pause_points: PausePoint[];
};

export type ExplanationSegment = {
  id: string;
  unit_id: string;
  order_index: number;
  type: ExplanationSegmentType;
  content:
    | TextSegmentContent
    | AnimationSegmentContent
    | BlankSegmentContent
    | BoardSegmentContent
    | VideoSegmentContent;
  /** AI 강의: TTS로 읽을 내레이션 스크립트 (한국어 설명 + 영어 예문) */
  narration?: string | null;
  /** narration의 ElevenLabs TTS 결과 URL */
  audio_url?: string | null;
};

// --- 드릴 문제 ---

export type DrillType =
  | "judgment"
  | "fill"
  | "reorder"
  | "correction"
  | "listen_judge";

export type GrammarLabel = {
  id: string;
  label_ko: string;  // "도치 + 수일치"
  label_en: string;  // "Inversion + Agreement"
  is_correct: boolean;
};

export type GrammarDrill = {
  id: string;
  unit_id: string;
  order_index: number;
  type: DrillType;
  sentence: string;
  answer: string;
  distractors: string[];
  grammar_labels: GrammarLabel[];  // 정답 1개 + 오답 3개
  audio_url?: string;
};

// 이중 레이어 응답 결과
export type DrillResult = {
  answer_correct: boolean;
  label_correct: boolean | null;  // null = 레이블 미선택
};

export type DrillUnderstanding =
  | "full"        // 둘 다 정답
  | "partial_answer"  // 빈칸만 맞음 (레이블 틀림 = 찍었거나 부분 이해)
  | "partial_concept" // 레이블만 맞음 (적용 미숙)
  | "none";       // 둘 다 틀림

export function classifyDrillResult(r: DrillResult): DrillUnderstanding {
  if (r.answer_correct && r.label_correct) return "full";
  if (r.answer_correct && !r.label_correct) return "partial_answer";
  if (!r.answer_correct && r.label_correct) return "partial_concept";
  return "none";
}

// --- Stylistic 문제 ---

export type StylisticSkill =
  | "concision"
  | "parallelism"
  | "transition"
  | "modifier"
  | "redundancy"
  | "tone"
  | "cohesion";

export type StylisticOption = {
  id: string;
  text: string;
  is_correct: boolean;
};

export type GrammarStylisticItem = {
  id: string;
  unit_id: string;
  order_index: number;
  skill: StylisticSkill;
  prompt: string;
  options: StylisticOption[];
  explanation: string;
};

// --- 학생 응답 ---

export type GrammarStudentResponse = {
  drill_id: string;
  answer_correct: boolean;
  label_correct: boolean | null;
  selected_answer?: string;
  selected_label_id?: string;
  accordion_opened: boolean;
};

// --- 전체 유닛 데이터 (학생 UI에서 한 번에 로드) ---

export type GrammarUnitFull = {
  unit: GrammarUnit;
  segments: ExplanationSegment[];
  drills: GrammarDrill[];
  stylistic_items: GrammarStylisticItem[];
};
