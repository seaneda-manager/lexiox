// Workout "오디오 응답 엔진" — 오디오(대본)를 듣고 응답하는 드릴의 공용 타입.
// Listening 백로그의 notetaking / 듣고 대답 / 요약 / 디테일 4종이 전부 이 하나의 셰이프의 변형이다
// (workout_exercise_engines_2026_08_23 메모 참고). 응답 방식만 mcq(객관식) vs notetaking(자기채점)으로 갈라진다.

export type AudioDrillTaskKind = "answer" | "summary" | "detail" | "notetaking";

export type AudioDrillChoice = { text: string; correct?: boolean };

export type AudioDrillItem = {
  id: string;
  taskKind: AudioDrillTaskKind;
  title?: string;
  /** TTS로 읽을 대본 */
  script: string;
  /** 청취 후 보여줄 질문 */
  prompt: string;
  timeLimitSec: number;
  /** answer / summary / detail 공통: 객관식 보기 */
  choices?: AudioDrillChoice[];
  /** notetaking 전용: 채워야 할 노트 항목 라벨 */
  notePrompts?: string[];
  /** notetaking 전용: 자기채점용 모범 노트 */
  modelNotes?: string[];
};

const TASK_LABEL: Record<AudioDrillTaskKind, string> = {
  answer: "듣고 대답",
  summary: "요약",
  detail: "디테일",
  notetaking: "노트테이킹",
};

export function audioTaskLabel(t: AudioDrillTaskKind): string {
  return TASK_LABEL[t];
}
