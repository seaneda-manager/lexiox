/**
 * 정답 근거 문장 유틸 — 서버(AI 결과 검증)와 클라이언트(지문 하이라이트) 공용.
 * 근거는 "지문 원문을 그대로 인용한 문자열"로 저장한다. 위치 인덱스는 지문이 수정되면 어긋나므로 쓰지 않는다.
 */

export function htmlToPlain(html: string): string {
  return (html ?? "")
    .replace(/\[\[INS:\d\]\]/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"');
}

/** 따옴표·공백·대시 표기 차이를 흡수한 비교용 문자열 */
export function normalizeForMatch(text: string): string {
  return (text ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** 인용문이 지문에 실제로 있는지(서버 검증). 없으면 AI가 지어낸 것이므로 버린다. */
export function quoteExistsInPassage(passagePlain: string, quote: string): boolean {
  const q = normalizeForMatch(quote);
  if (q.length < 8) return false;
  return normalizeForMatch(passagePlain).includes(q);
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * 지문 HTML에서 인용문을 찾아 <mark>로 감싼다. 태그·공백·따옴표 표기가 달라도 찾도록
 * 단어 사이에 "공백 또는 태그"를 허용하는 정규식을 만든다. 못 찾으면 원본을 그대로 돌려준다.
 */
export function highlightHtml(html: string, quotes: string[], markClass = "evidence-mark"): string {
  let out = html;
  for (const raw of quotes) {
    const words = normalizeForMatch(raw).split(" ").filter(Boolean);
    if (words.length < 2) continue;
    const apos = (w: string) => escapeRegex(w).replace(/'/g, "['\u2019]").replace(/"/g, '["\u201C\u201D]').replace(/-/g, "[-\u2013\u2014]");
    const gap = "(?:\\s|&nbsp;|<[^>]+>)+";
    const tagGap = "(?:<[^>]+>)*";
    // \uB2E8\uC5B4 \uC55E\uB4A4 \uBB38\uC7A5\uBD80\uD638\uB294 \uB2EB\uB294/\uC5EC\uB294 \uD0DC\uADF8 \uBC14\uAE65\uC5D0 \uC788\uC744 \uC218 \uC788\uB2E4 (\uC608: "...PM</strong>.")
    const wordRe = (w: string) => {
      const m = /^([("'\[]*)(.*?)([.,;:!?)"'\]]*)$/.exec(w);
      const lead = m?.[1] ?? "";
      const core = m?.[2] ?? w;
      const trail = m?.[3] ?? "";
      return [lead ? apos(lead) : "", apos(core), trail ? apos(trail) : ""]
        .filter(Boolean)
        .join(tagGap);
    };
    const re = new RegExp(words.map(wordRe).join(gap), "i");
    const m = re.exec(out);
    if (!m) continue;
    // 태그가 끼어 있어도 깨지지 않도록 텍스트 조각만 감싼다
    const matched = m[0];
    const wrapped = matched.replace(/(^|>)([^<]+)(?=<|$)/g, (_all, pre, text) =>
      text.trim() ? `${pre}<mark class="${markClass}">${text}</mark>` : `${pre}${text}`
    );
    out = out.slice(0, m.index) + wrapped + out.slice(m.index + matched.length);
  }
  return out;
}
