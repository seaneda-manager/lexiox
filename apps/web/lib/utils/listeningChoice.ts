// updated-listening 생성기는 정답 필드로 "correct"를 쓴다 (프롬프트에 명시:
// "Each choice must have "correct" boolean (not "isCorrect")"). 하지만 채점 코드가
// isCorrect를 읽고 있어서 모든 시험이 항상 0점으로 채점되는 버그가 있었다 —
// 이 함수 하나만 통해서 읽으면 필드명이 다시 어긋나도 한 곳만 고치면 된다.
export function isChoiceCorrect(choice: unknown): boolean {
  if (!choice || typeof choice !== 'object') {
    console.warn('[isChoiceCorrect] choice is null/undefined/not an object:', choice);
    return false;
  }
  const c = choice as Record<string, unknown>;
  const result = c.correct === true || c.isCorrect === true || c.is_correct === true;
  if (!result) {
    console.warn('[isChoiceCorrect] no correct field found. choice keys:', Object.keys(c), 'choice:', c);
  }
  return result;
}
