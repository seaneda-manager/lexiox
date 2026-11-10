// 단어 품사/한글 발음 생성 결과 검증 (API 생성·외부(Gemini) 업로드 공통)

export const POS_LIST = ["명사", "동사", "형용사", "부사", "전치사", "접속사", "대명사", "감탄사", "관사", "조동사", "숙어"] as const;
const POS_SET = new Set<string>(POS_LIST);

export function isValidPron(p: string): boolean {
  return /^[가-힣 ]+$/.test(p) && p.trim().length > 0;
}

export function isValidPos(pos: string[], meaningCount: number): boolean {
  return meaningCount > 0 && pos.length === meaningCount && pos.every((p) => POS_SET.has(p));
}

/** 따옴표를 지원하는 간단한 CSV 파서 (코드펜스·헤더 줄은 호출 쪽에서 처리) */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}

export function csvEscape(v: string): string {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
