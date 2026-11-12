// 강의 대본(narration)에서 음성 합성용 문장(speech)을 만든다.
// 한국어 목소리가 한 단어짜리 영어를 한국식으로 잘못 읽는 경우(he→"헤", can→"찬")를 막기 위해,
// [en]…[/en] 로 감싼 단어가 아래 표에 있으면 한글 발음으로 바꿔 쓴다. 표에 없는 영어는 그대로 둔다.
// 자막은 narration 을 그대로 보여 주므로 화면에는 영어가 보인다. 잘못 읽히는 단어가 더 나오면 여기에 추가한다.
export const SPEECH_PRONUNCIATION: Record<string, string> = {
  he: "히", she: "쉬", we: "위", me: "미", be: "비",
  can: "캔", cans: "캔즈",
  so: "소", such: "서치",
  s: "에스", d: "디",
};

const PHRASE_WORDS = new Set(["so", "such", "can", "cans"]);

// [en]…[/en] 한 덩어리를 음성용으로 바꾼다. 한 단어면 표에서 찾고, 짧은 구(4단어 이하, 문장부호 없음)면 단어별로 표를 적용한다.
// 문장(마침표·물음표가 있거나 더 긴 것)은 영어로 잘 읽히므로 그대로 둔다.
function convertEn(raw: string): string {
  const w = raw.trim();
  const whole = SPEECH_PRONUNCIATION[w.toLowerCase()];
  if (whole) return whole;
  const tokens = w.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 4 || /[.?!]/.test(w)) return raw;
  // 구 안에서는 실제로 잘못 읽힌 단어(PHRASE_WORDS)만 바꾼다. he/be 같은 짧은 단어까지 바꾸면 "be used to"처럼 오히려 어색해진다.
  return tokens.map((t) => { const k = t.toLowerCase().replace(/[^a-z]/g, ""); return PHRASE_WORDS.has(k) ? SPEECH_PRONUNCIATION[k] : t; }).join(" ");
}

export function toSpeech(narration: string): string {
  const out = String(narration ?? "").replace(/\[en\](.*?)\[\/en\]/gis, (_m, w: string) => convertEn(w));
  return out.replace(/\[\/?en\]/gi, "").replace(/\s+/g, " ").trim();
}
