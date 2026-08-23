// Workout "하이라이트 엔진" — 지문에서 정답 스팬을 시간 안에 찾아 탭하는 드릴의 공용 타입.
// topic sentence 찾기 / summary 찾기 / 근거 하이라이트 / 지칭추론 4개 백로그 항목이
// 전부 이 하나의 셰이프의 변형이다 (workout_exercise_engines_2026_08_23 메모 참고).

export type HighlightTaskType = "topic_sentence" | "summary" | "evidence" | "referent";

export type HighlightDrillItem = {
  id: string;
  taskType: HighlightTaskType;
  passageTitle?: string;
  sentences: string[];
  correctIndices: number[]; // 정답 문장 인덱스(들) — evidence는 여러 개일 수 있음
  timeLimitSec: number;
  /** evidence 타입 전용: 뒷받침해야 하는 주장 */
  claim?: string;
  /** referent 타입 전용: 무엇이 가리키는 대상을 찾아야 하는지 (예: "this") */
  referentWord?: string;
};

const TASK_LABEL: Record<HighlightTaskType, string> = {
  topic_sentence: "주제문 찾기",
  summary: "요약문 찾기",
  evidence: "근거 하이라이트",
  referent: "지칭추론",
};

export function taskLabel(t: HighlightTaskType): string {
  return TASK_LABEL[t];
}

export function taskInstruction(item: HighlightDrillItem): string {
  switch (item.taskType) {
    case "topic_sentence":
      return "이 문단의 주제문을 찾아 탭하세요.";
    case "summary":
      return "이 지문을 가장 잘 요약하는 문장을 찾아 탭하세요.";
    case "evidence":
      return `다음 주장을 뒷받침하는 문장을 찾아 탭하세요: "${item.claim ?? ""}"`;
    case "referent":
      return `밑줄 친 표현 "${item.referentWord ?? "이것"}"이 실제로 가리키는 대상이 담긴 문장을 찾아 탭하세요.`;
  }
}
