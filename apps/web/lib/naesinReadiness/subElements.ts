// apps/web/lib/naesinReadiness/subElements.ts
// 중학 내신 시험대비 4단계(수행→check→test) 루프의 sub요소 정의.
// 2026-08-27 스펙 그대로 — 유닛 하나에 이 sub요소 전부가 각각 별도로 진행됨.

export type ReadinessElement = "vocab" | "dialogue" | "grammar" | "passage" | "formative" | "oral" | "mock_exam";

export const ELEMENT_LABELS: Record<ReadinessElement, string> = {
  vocab: "단어",
  dialogue: "대화문",
  grammar: "문법",
  passage: "본문",
  formative: "통합 형성평가",
  oral: "구술 체크업",
  mock_exam: "모의고사",
};

export const SUB_ELEMENTS: Record<ReadinessElement, string[]> = {
  vocab: ["영한", "한영", "영영", "숙어(이어동사)"],
  dialogue: ["상황별 표현", "대체 표현", "대화 순서배열"],
  grammar: ["설명 체크업", "표 암기", "본문 속 문장", "작문"],
  passage: ["해석", "작문", "문법·구조 분석", "순서 배열", "TF 체크업"],
  formative: ["유닛별 통합", "시험범위 전체 통합"],
  oral: ["유닛별 정리", "막판 정리"],
  mock_exam: ["모의고사"],
};

export const ALL_ELEMENTS: ReadinessElement[] = ["vocab", "dialogue", "grammar", "passage", "formative", "oral", "mock_exam"];

export function allSubElementPairs(): { element: ReadinessElement; subElement: string }[] {
  const pairs: { element: ReadinessElement; subElement: string }[] = [];
  for (const element of ALL_ELEMENTS) {
    for (const subElement of SUB_ELEMENTS[element]) {
      pairs.push({ element, subElement });
    }
  }
  return pairs;
}
