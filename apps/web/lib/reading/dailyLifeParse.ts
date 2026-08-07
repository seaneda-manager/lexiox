// apps/web/lib/reading/dailyLifeParse.ts
// Daily Life(공지/이메일/SNS/문자/광고) 지문을 실제 ETS 화면처럼 그리기 위해
// 저장된 contentHtml(대부분 <p>/<br> 섞인 평문)을 구조화된 필드로 분해한다.

export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ParsedEmail = {
  headers: { label: string; value: string }[];
  salutation: string;
  bodyParagraphs: string[];
  closing: string;
  signature: string[];
};

const EMAIL_CLOSING_RE = /^(Sincerely|Best regards|Regards|Warm regards|Yours truly|Yours sincerely|Yours|Respectfully|Thank you)[,.]?\s*$/i;
const EMAIL_HEADER_RE = /^(Subject|To|From|Date|Cc)\s*:\s*(.*)$/i;

/** "To:/From:/Subject:" 헤더 + "Dear ..." + 본문 + "Sincerely, Name" 구조를 분해한다. */
export function parseEmail(plainText: string): ParsedEmail | null {
  const lines = plainText.split("\n").map((l) => l.trim());
  const headers: { label: string; value: string }[] = [];
  let bodyStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(EMAIL_HEADER_RE);
    if (m) {
      headers.push({ label: m[1], value: m[2].trim() });
      bodyStart = i + 1;
    } else if (lines[i] === "" && headers.length > 0) {
      continue;
    } else if (headers.length > 0) {
      break; // 헤더 블록이 끝나고 본문 시작
    }
  }

  const rest = lines.slice(bodyStart).join("\n").trim();
  if (!rest && headers.length === 0) return null;

  const salutationMatch = rest.match(/^(Dear\s+[^,\n]+,)/i);
  const salutation = salutationMatch ? salutationMatch[1] : "";
  const afterSalutation = salutation ? rest.slice(salutation.length).trim() : rest;

  const restLines = afterSalutation.split("\n").map((l) => l.trim());
  let closingIdx = restLines.findIndex((l) => EMAIL_CLOSING_RE.test(l));
  let closing = "";
  let signature: string[] = [];
  let bodyLines = restLines;

  if (closingIdx !== -1) {
    closing = restLines[closingIdx].replace(/[,.]?\s*$/, "");
    bodyLines = restLines.slice(0, closingIdx);
    signature = restLines.slice(closingIdx + 1).filter(Boolean);
  }

  const bodyParagraphs = bodyLines
    .join("\n")
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  if (headers.length === 0 && !salutation && bodyParagraphs.length === 0) return null;

  return { headers, salutation, bodyParagraphs, closing, signature };
}

export type ParsedMessage = { sender: string; time?: string; text: string };

/** "Name [time] text" 또는 "Name: text" 줄들을 문자 메시지 체인으로 분해한다. */
export function parseTextMessages(plainText: string): ParsedMessage[] | null {
  const normalized = plainText.replace(
    /([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*)\s*\[([^\]]+)\]/g,
    "\n$1 [$2]"
  );
  const lines = normalized.split("\n").map((l) => l.trim()).filter(Boolean);

  const bracketRe = /^(.+?)\s*\[([^\]]+)\]\s*:?\s*(.*)$/;
  const colonRe = /^([A-Z][\w' ]{0,24}):\s*(.+)$/;

  const messages: ParsedMessage[] = [];
  for (const line of lines) {
    const bm = line.match(bracketRe);
    if (bm && bm[3]) {
      messages.push({ sender: bm[1].trim(), time: bm[2].trim(), text: bm[3].trim() });
      continue;
    }
    const cm = line.match(colonRe);
    if (cm) {
      messages.push({ sender: cm[1].trim(), text: cm[2].trim() });
    }
  }

  return messages.length > 0 ? messages : null;
}

export type ParsedNotice = { heading: string; bodyParagraphs: string[] };

/** 짧은 첫 줄을 제목으로, 나머지를 본문 단락으로 취급한다 (공지/광고/웹기사 공용). */
export function parseHeadingAndBody(plainText: string): ParsedNotice {
  const paragraphs = plainText
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return { heading: "", bodyParagraphs: [] };

  const first = paragraphs[0];
  const looksLikeHeading = first.length <= 70 && !/[.!?]$/.test(first);
  if (looksLikeHeading && paragraphs.length > 1) {
    return { heading: first, bodyParagraphs: paragraphs.slice(1) };
  }
  return { heading: "", bodyParagraphs: paragraphs };
}
