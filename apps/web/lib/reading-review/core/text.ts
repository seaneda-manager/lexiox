export function uniqTextArray(values?: string[]): string[] {
  if (!values?.length) return [];
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function normalizeSentence(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function evidenceMatches(official: string, picked: string): boolean {
  const a = normalizeSentence(official);
  const b = normalizeSentence(picked);
  return a === b || a.includes(b) || b.includes(a);
}

export function cleanOptionalText(value?: string | null): string | null {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
}

export function hasText(value?: string | null): boolean {
  return String(value ?? "").trim().length > 0;
}
