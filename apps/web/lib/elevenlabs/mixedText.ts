// 한국어 문장 속에 영어 단어/문장이 섞인 내레이션을 언어별 구간으로 나눈다.
// 한 문장을 한 언어로 취급하는 TTS 모델이 영어 단어를 한글식 발음("히", "헐")으로 읽는 문제를 피하려고,
// 구간별로 따로 음성을 만든 뒤 이어 붙이는 데 쓴다.

export type LangPart = { lang: 'ko' | 'en' | 'auto'; text: string };

const EN_OPEN = '[en]';
const EN_CLOSE = '[/en]';

/** [en] … [/en] 표시를 지운 순수 텍스트 */
export function stripTags(text: string): string {
  return text.split(EN_OPEN).join('').split(EN_CLOSE).join('');
}

/** 대본에 명시적으로 [en]he[/en] 처럼 표시한 영어 구간을 기준으로 나눈다. 표시가 없으면 전체가 한 구간(ko)이다. */
export function splitByTags(text: string): LangPart[] {
  const parts: LangPart[] = [];
  const re = /\[en\]([\s\S]*?)\[\/en\]/gi;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ lang: 'ko', text: text.slice(last, i) });
    parts.push({ lang: 'en', text: m[1] });
    last = i + m[0].length;
  }
  if (last < text.length) parts.push({ lang: 'ko', text: text.slice(last) });
  return clean(parts);
}

// 알파벳 단어로 시작해, 사이에 공백/가벼운 문장부호가 있어도 알파벳 단어가 이어지는 동안을 영어 구간으로 본다.
const WORD = "[A-Za-z][A-Za-z'’\\-]*";
const EN_RUN = new RegExp(`${WORD}(?:[\\s,.;:!?"“”'’()\\-]+${WORD})*[.?!"”)]?`, 'g');

/** 표시 없이 글자 모양(알파벳 연속 구간)만으로 영어 구간을 찾아 나눈다. */
export function splitAuto(text: string): LangPart[] {
  const plain = stripTags(text);
  const parts: LangPart[] = [];
  let last = 0;
  for (const m of plain.matchAll(EN_RUN)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ lang: 'ko', text: plain.slice(last, i) });
    parts.push({ lang: 'en', text: m[0] });
    last = i + m[0].length;
  }
  if (last < plain.length) parts.push({ lang: 'ko', text: plain.slice(last) });
  return clean(parts);
}

function clean(parts: LangPart[]): LangPart[] {
  return parts
    // 영어 구간 앞뒤에서 떨어져 나온 큰따옴표는 읽지 않으므로 한국어 구간 양끝에서 지운다
    .map((p) => ({ ...p, text: p.text.replace(/\s+/g, ' ').replace(p.lang === 'ko' ? /^[\s"“”]+|[\s"“”]+$/g : /^\s+|\s+$/g, '') }))
    // 읽을 글자가 하나도 없는 구간(공백·부호뿐)은 버린다
    .filter((p) => /[A-Za-z0-9가-힣]/.test(p.text));
}
