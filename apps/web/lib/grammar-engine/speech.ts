// 강의 대본(narration)에서 음성 합성용 문장(speech)을 만든다.
// 한국어 목소리가 한 단어짜리 영어를 한국식으로 잘못 읽는 경우(he→"헤", can→"찬")를 막기 위해,
// [en]…[/en] 로 감싼 단어가 아래 표에 있으면 한글 발음으로 바꿔 쓴다. 표에 없는 영어는 그대로 둔다.
// 자막은 narration 을 그대로 보여 주므로 화면에는 영어가 보인다. 잘못 읽히는 단어가 더 나오면 여기에 추가한다.
export const SPEECH_PRONUNCIATION: Record<string, string> = {
  he: "히", she: "쉬", we: "위", me: "미", be: "비",
  can: "캔", cans: "캔즈",
  s: "에스", d: "디",
};

export function toSpeech(narration: string): string {
  const out = String(narration ?? "").replace(/\[en\](.*?)\[\/en\]/gis, (_m, w: string) => SPEECH_PRONUNCIATION[w.trim().toLowerCase()] ?? w);
  return out.replace(/\[\/?en\]/gi, "").replace(/\s+/g, " ").trim();
}
