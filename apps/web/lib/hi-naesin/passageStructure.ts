// lib/hi-naesin/passageStructure.ts
// 지문 원문(passage_text)을 제목 / 주제문 / 본문으로 나누고, 드릴 정답이 되는 문장을 가리는 순수 헬퍼.
//
// 모의고사형 지문은 보통 "첫 줄=제목, 둘째 줄=주제문, 셋째 줄부터=본문" 형식으로 저장돼 있다.
// 형식이 다른 지문(교과서·외부교재)은 본문만 있는 것으로 안전하게 처리한다.

export type PassageParts = {
  title: string | null;  // 지문 안의 제목 줄 (있을 때만)
  topic: string | null;  // 주제문 줄 (있을 때만)
  body: string;          // 나머지 본문
};

function sentenceCount(s: string): number {
  const m = s.match(/[.!?]["'”’)]*(\s|$)/g);
  return m ? m.length : 0;
}

export function splitPassage(raw: string): PassageParts {
  const lines = raw.replace(/\r\n/g, '\n').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { title: null, topic: null, body: lines.join('\n') };

  const first = lines[0];
  // 제목: 문장부호로 끝나지 않고 짧은 한 줄
  const firstLooksTitle = first.length <= 140 && !/[.!?]["'”’)]*$/.test(first) && sentenceCount(first) === 0;
  if (!firstLooksTitle) return { title: null, topic: null, body: lines.join('\n') };

  const rest = lines.slice(1);
  // 주제문: 제목 바로 다음 한 줄이 단일 문장이고, 그 뒤에 여러 문장짜리 본문이 이어질 때
  if (rest.length >= 2) {
    const second = rest[0];
    const afterSentences = rest.slice(1).reduce((n, l) => n + sentenceCount(l), 0);
    if (sentenceCount(second) === 1 && second.length <= 260 && afterSentences >= 2) {
      return { title: first, topic: second, body: rest.slice(1).join('\n') };
    }
  }
  return { title: first, topic: null, body: rest.join('\n') };
}

// ── 문장 가리기 ───────────────────────────────────────────

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 공백/따옴표 차이를 허용해 지문에서 `target` 문장이 차지하는 구간을 찾는다. `____` 는 임의 문자열로 취급. */
export function findSentenceSpan(text: string, target: string): { start: number; end: number } | null {
  const cleaned = target.replace(/\s+/g, ' ').trim();
  if (cleaned.length < 6) return null;
  const segments = cleaned.split(/_{3,}/);
  const pattern = segments
    .map((seg) =>
      escapeRe(seg.trim())
        .replace(/\s+/g, '\\s+')
        .replace(/['’]/g, "['’]")
        .replace(/["“”]/g, '["“”]'),
    )
    .filter((seg, i, arr) => seg.length > 0 || i === 0 || i === arr.length - 1)
    .join('[\\s\\S]{1,80}?');
  try {
    const m = new RegExp(pattern, 'i').exec(text);
    if (!m) return null;
    return { start: m.index, end: m.index + m[0].length };
  } catch {
    return null;
  }
}

/**
 * 빈칸 템플릿이 제목+주제문처럼 여러 줄에 걸쳐 저장된 경우, `text` 한 덩어리가 템플릿의 연속 구간과
 * 일치하면(빈칸 토큰은 아무 단어와 일치) 그 구간의 템플릿 텍스트를 돌려준다.
 */
function alignBlankSlice(text: string, target: string): string | null {
  const tt = text.split(/\s+/).filter(Boolean);
  const gt = target.split(/\s+/).filter(Boolean);
  if (tt.length < 3 || tt.length > gt.length) return null;
  const same = (a: string, b: string) =>
    a.toLowerCase().replace(/[^a-z0-9']/g, '') === b.toLowerCase().replace(/[^a-z0-9']/g, '');
  for (let j = 0; j + tt.length <= gt.length; j++) {
    let ok = true;
    for (let k = 0; k < tt.length; k++) {
      if (/_{2,}/.test(gt[j + k])) continue;
      if (!same(tt[k], gt[j + k])) { ok = false; break; }
    }
    if (ok) return gt.slice(j, j + tt.length).join(' ');
  }
  return null;
}

export type MaskedSegment =
  | { kind: 'text'; text: string }
  | { kind: 'mask'; label: string }      // 정답 문장 → 자리표시자
  | { kind: 'blank'; text: string };     // 빈칸 문장 → 빈칸 템플릿(정답 단어 제거)

/**
 * 본문에서 `target`(정답이 되는 문장)을 찾아 가린다.
 *  - mode 'mask'  : 문장 전체를 자리표시자로 (작문 계열)
 *  - mode 'blank' : 문장을 빈칸 템플릿으로 교체 (빈칸·문법 계열)
 * 못 찾으면 그대로 반환(= 지문에 없는 문장이므로 누출 없음).
 */
export function maskTarget(
  text: string,
  target: string,
  mode: 'mask' | 'blank',
  maskLabel = '작문할 문장',
): MaskedSegment[] {
  const span = findSentenceSpan(text, target);
  if (!span) {
    // 제목+주제문처럼 정답 문장이 여러 줄에 걸쳐 저장된 경우: 이 덩어리 전체가 정답에 포함되면 통째로 가린다
    const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
    const t = norm(text);
    if (mode === 'mask' && t.length >= 6 && norm(target).includes(t)) return [{ kind: 'mask', label: maskLabel }];
    if (mode === 'blank') {
      const aligned = alignBlankSlice(text, target);
      if (aligned) return [{ kind: 'blank', text: aligned }];
    }
    return [{ kind: 'text', text }];
  }
  const out: MaskedSegment[] = [];
  if (span.start > 0) out.push({ kind: 'text', text: text.slice(0, span.start) });
  out.push(mode === 'mask' ? { kind: 'mask', label: maskLabel } : { kind: 'blank', text: target.trim() });
  if (span.end < text.length) out.push({ kind: 'text', text: text.slice(span.end) });
  return out;
}
