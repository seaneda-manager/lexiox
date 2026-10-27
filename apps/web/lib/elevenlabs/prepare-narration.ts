// 한국어 문법 강의 대본 → TTS 입력용 텍스트.
// 화면에 보이는 문법 표기(S+V, to V, -ing, ___ 등)는 TTS가 그대로 읽으면 이상해져서
// 강사가 실제로 말하는 형태로 바꿔서 보낸다. (화면 표시용 narration 원문은 그대로 둔다)

const RULES: Array<[RegExp, string]> = [
  // 빈칸
  [/_{2,}|…{1,}|\.{3,}\s*(?=\S)/g, " 빈칸 "],
  // 품사/문장성분 조합: S+V+O, S + V
  [/\bto[\s-]?V\b/g, "투 브이"],
  [/\bV[\s-]?ing\b/g, "브이 잉"],
  [/\bV[\s-]?ed\b/g, "브이 이디"],
  [/\bp\.?p\.?\b/gi, "피피"],
  [/\b(?:Ving|V-ing)\b/g, "브이 잉"],
  [/\bS\s*\+\s*V\b/g, "에스 플러스 브이"],
  [/\b([SVOC])\s*\+\s*/g, "$1 플러스 "],
  // 단독 문장성분 기호
  [/\bS\b(?![a-z])/g, "에스"],
  [/\bV\b(?![a-z])/g, "브이"],
  [/\bO\b(?![a-z])/g, "오"],
  [/\bC\b(?![a-z])/g, "씨"],
  // 접미/접두 표기
  [/-ing\b/g, " 잉"],
  [/-ed\b/g, " 이디"],
  [/-(e?s)\b/g, " 에스"],
  [/\bvs\.?\b/gi, "버서스"],
  [/\be\.g\.?/gi, "예를 들어"],
  [/\bi\.e\.?/gi, "즉"],
  // 기호
  [/\s*[→⇒➡]\s*/g, ", "],
  [/\s*[=＝]\s*/g, " 은 "],
  [/\s*\/\s*/g, ", "],
  [/[~〜]/g, " "],
  [/[「」『』"“”‘’`*#]/g, ""],
  [/\(([^)]*)\)/g, ", $1, "],
];

export function prepareNarrationForTts(text: string): string {
  let out = text ?? "";
  for (const [re, rep] of RULES) out = out.replace(re, rep);
  return out
    .replace(/\s*,\s*(,\s*)+/g, ", ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.?!])/g, "$1")
    .trim();
}
