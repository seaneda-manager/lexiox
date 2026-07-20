// apps/web/models/listening/index.ts

// SSOT: Listening 타입은 여기(models/listening)에서만 import 하세요.
// 기존 레거시 타입/스키마는 그대로 재사용
import type { LQuestion } from "@/types/types-listening";
export * from "@/types/types-listening";

/** -----------------------------
 *  2026 iBT Listening Adaptive 구조 (beta)
 *  ----------------------------*/

/** 어떤 시험 포맷인지 (기존 vs 2026 개편) */
export type ExamEra = "ibt_legacy" | "ibt_2026";
// 읽기 ExamEra와 헷갈리지 않게 alias 하나 더
export type LExamEra = ExamEra;

/** Runner나 대시보드에서 쓸 최소 메타 정보 */
export interface LListeningTestMeta {
  id: string;
  label: string;
  examEra: ExamEra;
  source?: string | null;
}

/** 2026 Listening에서 지원할 Task 타입 (레거시 포함) */
export type ListeningTaskKind =
  | "short_response"
  | "conversation"
  | "announcement"
  | "academic_talk"
  // ── 2026 Updated TOEFL 신유형 ──
  | "academic_lecture"    // 기초 학술 강의 (4문항/세트, 60~90초)
  | "campus_audio_log"    // 캠퍼스 안내방송/팟캐스트 (2문항/세트, 30~45초)
  | "choose_best_response"; // 짧은 질문/문장 듣고 가장 적절한 반응 고르기 (1문항/세트)

/** 공통 베이스 (stage, 난이도 등) */
export interface LBaseItem {
  id: string;
  taskKind: ListeningTaskKind;
  stage: 1 | 2;
  audioUrl: string;
  illustrationUrl?: string; // 러너 좌측에 보여줄 컨텍스트 이미지 (옵션)
  title?: string; // UI에서 보여줄 짧은 제목 (옵션)
  transcript?: string; // study 모드에서만 보여줄 스크립트
  questions: LQuestion[]; // 기존 질문 타입 재사용
  difficulty?: "easy" | "core" | "hard";
}

/** ETS multistage 구조: Stage 1 / Stage 2 모듈 */
export interface LListeningModule {
  id: string;
  stage: 1 | 2;
  items: LBaseItem[];
  isPretest?: boolean; // 점수에 안 들어가는 pretest 아이템 표시용 (나중 확장)
}

/** Adaptive Stage 2 pool: Stage 1 정답률에 따라 hard/easy 분기 (Reading의 RStage2Pool과 동일한 패턴) */
export interface LStage2Pool {
  cutScore: number;           // 예: 0.7 (70% 이상 → hard)
  hard: LListeningModule;     // High 모듈
  easy: LListeningModule;     // Low-Mid 모듈
}

/** 2026 형식 전체 Listening 세트 (Runner에서 바로 사용 가능) */
export interface LListeningTest2026 {
  meta: LListeningTestMeta; // examEra === 'ibt_2026' 여야 함
  modules: [LListeningModule, LListeningModule]; // [Stage1, Stage2 기본값(빈 배열)]
  stage2Pool?: LStage2Pool; // 적응형 시험에서 사용
}

// ─────────────────────────────────────────────────────────────────────────────
// Updated TOEFL Listening 2026 — 선형(Linear) 구조 (비적응형)
// ─────────────────────────────────────────────────────────────────────────────

/** 문항 선택지 (multi-select 대응: isCorrect 배열 위치로 판별) */
export interface LChoice2026 {
  id: string;
  text: string;
  isCorrect: boolean;
}

/** 문항 (4지선다 또는 다중선택) */
export interface LQuestion2026 {
  id: string;
  number: number;
  type: "main_topic" | "detail" | "function" | "inference" | "attitude" | "multi_select" | "table";
  stem: string;
  choices: LChoice2026[];
  /** 정답 인덱스 배열 (단일선택은 length 1, 다중선택은 length 2+) */
  correctIndices: number[];
  /** 다중선택 시 선택해야 할 개수 (기본 1) */
  selectCount?: number;
}

/** 세트 하나 (오디오 1개 + 문항 N개) */
export interface LListeningTrack2026 {
  id: string;
  taskKind: "conversation" | "academic_lecture" | "campus_audio_log";
  title?: string;
  /** 오디오 파일 URL (실제 테스트용) */
  audioUrl: string;
  /** 리스닝 화면에 보여줄 컨텍스트 이미지 URL */
  illustrationUrl?: string;
  /** 실제 오디오 재생 시간(초) — 프로그레스바 계산용 */
  audioSeconds?: number;
  /** 스크립트 (study 모드 / 관리자 검토용) */
  transcript?: string;
  questions: LQuestion2026[];
  /** 문제 풀이 전체 제한 시간(초) — 기본 300 */
  testingSeconds?: number;
}

/** Updated TOEFL Listening 선형 시험 */
export interface LListeningTest2026Linear {
  meta: LListeningTestMeta;
  tracks: LListeningTrack2026[];
}

/* ------------------------------------
 * Wavesurfer 오디오-스크립트 동기화
 * (Practice & Review & Retention 모드에서 사용)
 * ------------------------------------*/

/** 오디오 타임라인상의 단일 단어 (word-level 동기화) */
export interface AudioWord {
  word: string;
  startTime: number;  // 초 단위 (e.g., 1.2)
  endTime: number;    // 초 단위 (e.g., 1.8)
}

/** 스크립트 문단 (화자별 발화) */
export interface ScriptSegment {
  id: string;                    // "SEG_001", "SEG_002", ...
  speaker: "professor" | "student" | "instructor" | "announcement"; // 화자 구분
  text: string;                  // 전체 발화 텍스트
  startTime: number;             // 발화 시작 시간 (초)
  endTime: number;               // 발화 종료 시간 (초)
  words: AudioWord[];            // 단어 레벨 타임스탬프
}

/** 트랩 선택지 메타데이터 (오답 선택지가 왜 트랩인지) */
export type TrapType =
  | "KEYWORD_OVERLAP"            // 핵심 키워드가 들어있지만 맥락이 다름
  | "SCOPE_ERROR"                // 전체가 아닌 부분 정보만 참
  | "CAUSALITY_INVERSION"        // 인과관계 역전
  | "TIME_CONFUSION"             // 시간대 혼동
  | "HOMOPHONE_CONFUSION"        // 발음 유사 단어 혼동
  | "INFERENCE_TRAP"             // 추론 오류 유도
  | "ATTITUDE_MISREAD"           // 화자의 태도/의도 오독;

/** 선택지의 트랩 정보 (Review 모드에서 분석) */
export interface ChoiceTrapMeta {
  choiceIndex: number;           // 이 선택지의 인덱스 (0~3)
  trapType?: TrapType;           // null이면 정답
  explanation?: string;          // "왜 이것이 트랩인가" (관리자용 메모)
  triggeredSegmentIds?: string[]; // 트랩을 유발한 오디오 구간 ID
}

/** 문항별 문제 분석 메타데이터 (Review 모드) */
export interface QuestionAnalysisMeta {
  questionId: string;
  mainSignalTokens?: string[];   // "However", "Therefore" 등 주요 신호어
  focusSegmentIds?: string[];    // 이 문항에 핵심인 오디오 구간 ID들
  trapChoices?: ChoiceTrapMeta[];
}

/** 확장: 기존 LListeningTrack2026에 추가할 필드들 */
export interface LListeningTrack2026Extended extends LListeningTrack2026 {
  // ── 오디오-스크립트 동기화 (Wavesurfer용) ──
  scriptSegments?: ScriptSegment[];  // 스크립트 타임라인 (선택사항)

  // ── Review 분석 메타데이터 ──
  questionAnalysis?: QuestionAnalysisMeta[];

  // ── STT/오디오 분석 결과 (Retention/Shadowing 모드용) ──
  audioAnalysis?: {
    silenceMarkers?: { start: number; end: number }[];  // 묵음 구간
    speakingRate?: number;  // WPM (words per minute)
    audioQuality?: "high" | "medium" | "low";
  };
}

/* ------------------------------------
 * Helpers
 * ------------------------------------*/

/** 모듈 단위 점수 계산 (choices 안의 isCorrect / is_correct 둘 다 지원) */
export function computeListeningModuleScore(
  module: LListeningModule,
  answers: Record<string, string>
): { correct: number; total: number } {
  let correct = 0;
  let total = 0;

  for (const item of module.items) {
    for (const q of item.questions) {
      total += 1;
      const user = answers[q.id];

      const choice = (q.choices ?? []).find((c: any) => {
        // 타입 보호를 느슨하게 해둠 (레거시 호환)
        return c.isCorrect === true || c.is_correct === true;
      });

      if (user && choice && user === (choice as any).id) {
        correct += 1;
      }
    }
  }

  return { correct, total };
}
