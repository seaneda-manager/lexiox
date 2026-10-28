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

// 코드펜스·앞뒤 설명을 걷어내고 가장 바깥 {...} 만 JSON 으로 읽는다.
export function parsePasted(text: string): { ok: true; data: Raw } | { ok: false; error: string } {
  let t = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(t);
  if (fence) t = fence[1].trim();
  const s = t.indexOf("{");
  const e = t.lastIndexOf("}");
  if (s < 0 || e <= s) return { ok: false, error: "JSON 을 찾을 수 없습니다. { 로 시작하는 JSON 을 붙여 넣으세요." };
  try {
    return { ok: true, data: JSON.parse(t.slice(s, e + 1)) };
  } catch (err: any) {
    try {
      return { ok: true, data: JSON.parse(t.slice(s, e + 1).replace(/,\s*([}\]])/g, "$1")) };
    } catch {
      return { ok: false, error: `JSON 형식이 올바르지 않습니다: ${err.message}` };
    }
  }
}

// 붙여넣은 섹션을 기존 초안에 합친다. 그 섹션의 필드만 검증한다(나머지가 비어 있어도 통과).
export function mergeSection(existing: unknown, key: SectionKey, data: Raw): { ok: true; lesson: Raw } | { ok: false; errors: string[] } {
  const section = SECTIONS.find((s) => s.key === key)!;
  const picked: Raw = {};
  for (const f of section.fields) if (data[f] !== undefined) picked[f] = data[f];
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
