// apps/web/lib/reading/normalize.ts
export function toParagraphs(input?: string | string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.filter(s => !!s && s.trim().length > 0);
  // content 문자열 → 빈줄 기준 분단락
  return input
    .split(/\r?\n\s*\r?\n/g)
    .map(s => s.trim())
    .filter(Boolean);
}

export function joinParagraphs(paragraphs?: string[]): string {
  return (paragraphs ?? []).join('\n\n');
}

/** 구(舊) 스키마 호환: choices 의 is_correct → isCorrect */
export function coerceIsCorrect(v: any): boolean {
  if (typeof v === 'boolean') return v;
  if (v === 1) return true;
  if (v === 0) return false;
  return !!v;
}

/** 질문의 설명은 meta.explanation 로 몰아넣기 (구 q.explanation 호환) */
export function mergeExplanationMeta(
  meta: any,
  explanationMaybe?: unknown,
  clueMaybe?: unknown
) {
  const base = meta && typeof meta === 'object' ? meta : {};
  const explanation = explanationMaybe ?? clueMaybe ?? undefined;
  return explanation == null ? base : { ...base, explanation };
}
