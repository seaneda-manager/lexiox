import { validateGrammarLesson } from "@/models/middle-naesin/grammar-lesson";

// 레슨을 4개 섹션으로 나눠 따로 채운다 (외부 AI에서 만든 JSON 을 섹션 단위로 붙여넣기).
export const SECTIONS = [
  { key: "explanation", label: "1. 설명 + 예문 모음", fields: ["topic", "explanation", "exampleGroups"] },
  { key: "cram", label: "2. 깜지 + 설명 빈칸", fields: ["cramText", "blanks"] },
  { key: "drills", label: "3. Drill (빈칸 · 고치기)", fields: ["drillFill", "drillFix"] },
  { key: "questions", label: "4. 문제", fields: ["questions"] },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];

export const isSectionKey = (v: unknown): v is SectionKey => SECTIONS.some((s) => s.key === v);

type Raw = Record<string, any>;

export function emptyLesson(): Raw {
  return {
    version: 1,
    status: "draft",
    topic: "",
    explanation: { titleKo: "", summaryEn: "", summaryKo: "", rules: [], examples: [] },
    exampleGroups: [],
    cramText: "",
    blanks: [],
    drillFill: [],
    drillFix: [],
    questions: [],
  };
}

// 일부 섹션만 채워진 초안도 화면에 그릴 수 있게 빈 값을 채운다.
export function normalizeLesson(raw: unknown): Raw {
  const base = emptyLesson();
  return { ...base, ...(raw && typeof raw === "object" ? (raw as Raw) : {}) };
}

export function sectionCount(lesson: Raw, key: SectionKey): number {
  switch (key) {
    case "explanation":
      return (lesson.explanation?.rules?.length ?? 0) + (lesson.exampleGroups?.length ?? 0);
    case "cram":
      return (lesson.cramText?.trim() ? 1 : 0) + (lesson.blanks?.length ?? 0);
    case "drills":
      return (lesson.drillFill?.length ?? 0) + (lesson.drillFix?.length ?? 0);
    case "questions":
      return lesson.questions?.length ?? 0;
  }
}

// 문자열·이스케이프를 감안해 start 에서 시작하는 { ... } 의 끝 index 를 찾는다. 못 찾으면 -1.
function balancedEnd(t: string, start: number): number {
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { if (inStr) esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function tryParse(src: string): Raw | null {
  for (const cand of [src, src.replace(/,\s*([}\]])/g, "$1")]) {
    try {
      const v = JSON.parse(cand);
      if (v && typeof v === "object" && !Array.isArray(v)) return v as Raw;
    } catch {
      /* 다음 후보 */
    }
  }
  return null;
}

// 화면 전체를 복사해 와도 되게: 모든 { 에서 시작하는 균형 잡힌 덩어리를 읽어 보고, 읽히는 것 중 가장 긴 것을 쓴다.
// (프롬프트 틀이 같이 복사됐을 때 틀이 아니라 실제 결과가 선택된다.)
export function parsePasted(text: string): { ok: true; data: Raw } | { ok: false; error: string } {
  const t = text.replace(/```(?:json)?/gi, "");
  let best: { len: number; data: Raw } | null = null;
  let firstErr = "";
  for (let i = t.indexOf("{"); i >= 0; i = t.indexOf("{", i + 1)) {
    const end = balancedEnd(t, i);
    if (end < 0) continue;
    const chunk = t.slice(i, end + 1);
    if (best && chunk.length <= best.len) continue;
    const data = tryParse(chunk);
    if (data) best = { len: chunk.length, data };
    else if (!firstErr && chunk.length > 200) {
      try { JSON.parse(chunk); } catch (e: any) { firstErr = e.message; }
    }
  }
  if (best) return { ok: true, data: best.data };
  if (t.indexOf("{") < 0) return { ok: false, error: "JSON 을 찾을 수 없습니다. { 로 시작하는 JSON 을 붙여 넣으세요." };
  return { ok: false, error: `JSON 형식이 올바르지 않습니다${firstErr ? `: ${firstErr}` : ""}. 코드블록 안의 JSON 전체가 빠짐없이 복사됐는지 확인하세요(끝의 } 와 ] 포함).` };
}

// 외부 AI 가 섞어 넣는 마크다운 흔적이 학생 화면에 그대로 보이지 않게 붙여넣을 때 정리한다.
// 허용되는 강조 표시는 [b]...[/b] 하나뿐. (## 제목, **굵게**, `코드`, 줄머리 - * • 같은 기호는 모두 제거/변환)
export function cleanText(v: string): string {
  return v
    .replace(/\*\*(.+?)\*\*/gs, "[b]$1[/b]")
    .replace(/__(.+?)__/gs, "[b]$1[/b]")
    .replace(/`+/g, "")
    .split("\n")
    .map((line) => line.replace(/^\s{0,3}#{1,6}\s+/, "").replace(/^\s*[-*•·]\s+/, ""))
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

export function cleanDeep<T>(v: T): T {
  if (typeof v === "string") return cleanText(v) as unknown as T;
  if (Array.isArray(v)) return v.map(cleanDeep) as unknown as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v as Raw).map(([k, x]) => [k, cleanDeep(x)])) as T;
  return v;
}

// 붙여넣은 섹션을 기존 초안에 합친다. 그 섹션의 필드만 검증한다(나머지가 비어 있어도 통과).
export function mergeSection(existing: unknown, key: SectionKey, data: Raw): { ok: true; lesson: Raw } | { ok: false; errors: string[] } {
  const section = SECTIONS.find((s) => s.key === key)!;
  const picked: Raw = {};
  for (const f of section.fields) if (data[f] !== undefined) picked[f] = cleanDeep(data[f]);
  if (Object.keys(picked).length === 0) {
    return { ok: false, errors: [`이 섹션에 필요한 키(${section.fields.join(", ")})가 JSON 에 없습니다.`] };
  }
  const candidate = { ...normalizeLesson(existing), ...picked };

  // 검증용: 아직 안 채운 다른 섹션이 오류를 내지 않게 자리만 채운다
  const probe = { ...candidate, topic: candidate.topic || "-", cramText: candidate.cramText || "-" };
  const res = validateGrammarLesson(probe);
  const errors = "errors" in res ? res.errors.filter((m) => section.fields.some((f) => m.startsWith(f))) : [];
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, lesson: { ...candidate, version: 1, status: "draft", finalizedAt: undefined } };
}
