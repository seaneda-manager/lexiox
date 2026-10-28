import "server-only";
import { callClaudeJson } from "@/lib/ai/grammarGen";
import { validateGrammarLesson, type GrammarLesson } from "@/models/middle-naesin/grammar-lesson";

// docs/GRAMMAR_LEVELS_AND_SCHEMA_DESIGN.md 의 레벨 정의 + scripts/middle-naesin/GRAMMAR_EXAMPLE_RULES.md 요약
export const LEVEL_SPEC: Record<number, { label: string; desc: string; words: string; questions: number; fill: number; fix: number }> = {
  1: { label: "L1 · 중1 / 문법 첫 접촉", desc: "한국어 위주 설명, 용어 최소, 한 번에 한 포인트. 문제는 형태 확인(고르기·빈칸) 중심, 드릴은 따라 쓰기와 쉬운 빈칸.", words: "4~7단어, 초등 필수어휘", questions: 10, fill: 8, fix: 3 },
  2: { label: "L2 · 중2", desc: "한국어 설명 + 핵심 영어 용어(주어·목적어 등). 문제는 형태 확인 + 간단한 오류 찾기, 드릴은 빈칸 + 틀린 곳 1개 고치기.", words: "6~9단어, 교과서 어휘", questions: 14, fill: 10, fix: 5 },
  3: { label: "L3 · 중3 내신 표준", desc: "규칙 전체(예외 포함), 비교되는 짝을 나란히. 문제는 오류 고치기·구별 + 4유형(개수/맞는 것/다른 것/이유), 드릴은 빈칸 + 고치기 + 이유.", words: "8~12단어, 내신 기출 수준", questions: 20, fill: 12, fix: 8 },
  4: { label: "L4 · 중3 상위 / 고1 진입", desc: "구문 전환·변형 원리, 한·영 병기 설명. 문제는 구문 전환, 헷갈리는 구문 구별.", words: "12~16단어, 복문", questions: 20, fill: 12, fix: 8 },
  5: { label: "L5 · 고등 내신/수능 대비 심화", desc: "영어 설명 + 예외·함정·문맥 판단. 문제는 개수 세기·복합 오류·어법 판단.", words: "15단어 이상, 학술·논설 문체", questions: 20, fill: 10, fix: 8 },
};

const RULES = `## 예문/문제 규칙 (반드시 지킬 것)
- 설명(rules)에 적힌 항목마다 예문이 최소 3개. 문법 요소의 모든 형태를 예문으로 보여 주고, 형태가 여러 갈래면 갈래마다 exampleGroups 그룹을 만든다.
- 비교가 필요한 것(헷갈리는 짝)은 반드시 나란히 보여 준다. 틀린 예도 넣는다(wrong:true, ko 칸에는 번역 대신 "고친 형태 + 이유").
- 한 문장에는 한 가지 포인트만. 자연스러운 원어민 문장만. 최소 대비쌍(같은 뼈대에서 한 요소만 바꿈). 주제·주어·시제 다양화, 부정문·의문문 포함.
- tag = 형태 이름, note = 한 줄 이유. 한글 번역은 직역이 아니라 문법 포인트가 드러나게.
- 문제 문제문은 영어, 보기마다 한글 해석(ko). 오답 보기는 학생의 실제 오류에서. 정답이 둘이 되는 문제 금지. 정답 위치(A~D)는 고르게(개수 세기 count_wrong 제외).
- 해설(explanationKo)은 왜 맞고 왜 틀린지 한 줄.
- 빈칸 문장에는 정답이 노출되면 안 된다. '___' 는 한 곳만.

## 서식 규칙 (반드시 지킬 것)
- ❶ • ① 1. - ★ 이모지 같은 목록 기호·번호를 글자로 쓰지 마세요. 번호와 불릿은 화면이 순서대로 붙입니다. 항목은 배열의 한 원소로 나누세요.
- 마크다운 기호(## 제목, **굵게**, 백틱 코드 표시, 줄머리 - * •)는 절대 쓰지 마세요. 핵심 부분을 강조할 때만 [b]이렇게[/b] 쓰고, 그 외 허용되는 기호는 「 」(공식 틀), →(변환·고친 결과), ~(자리 표시)뿐입니다.
- 번역을 괄호로 영어 뒤에 붙이지 마세요. 영어는 en, 번역은 ko 필드에 따로 쓰세요.
- 한 항목에는 한 가지 내용만. 규칙 아래 예문 아래 설명처럼 3단계로 깊게 만들지 마세요(규칙 → 예문까지만).
- 깜지(cramText)는 기호 없이 규칙 하나를 한 줄로, 규칙 사이에 빈 줄 하나.`;

export type ConceptCtx = {
  titleKo: string;
  titleEn: string;
  tier: number;
  units: string[]; // "8-5 so ~ that 구문 (p.123)"
  contrast: string[]; // 대비 개념 제목
  refLesson?: { level: number; lesson: GrammarLesson } | null; // 이웃 레벨 확정본(핵심 규칙 일관성용)
};

export function header(c: ConceptCtx, level: number): string {
  const spec = LEVEL_SPEC[level];
  const ref = c.refLesson
    ? `\n## 이미 확정된 L${c.refLesson.level} 레슨의 핵심 규칙 (사실은 레벨과 무관하게 동일해야 함. 눈높이만 바꿔 다시 쓸 것)\n${JSON.stringify(c.refLesson.lesson.explanation.rules)}`
    : "";
  return `당신은 한국 학원의 베테랑 영어 문법 강사입니다.

## 개념
- 제목: ${c.titleKo} (${c.titleEn}) · 개념 난이도 tier ${c.tier}/5
- 교재 단원: ${c.units.join(" / ") || "(없음)"}
- 헷갈리기 쉬운 대비 개념: ${c.contrast.join(", ") || "(없음)"}

## 만들 레벨: ${spec.label}
- 눈높이: ${spec.desc}
- 예문 길이/어휘: ${spec.words}${ref}

${RULES}`;
}

// 한 번에 만들면 응답이 max_tokens 에서 잘리므로 작은 호출 여러 개로 나눈다.
const TOKENS = 12000;
const rulesOf = (a: any) => JSON.stringify({ rules: a.explanation?.rules, groups: a.exampleGroups?.map((g: any) => g.title) });

async function genExplanation(c: ConceptCtx, level: number) {
  const prompt = `${header(c, level)}

## 이번에 만들 것: 설명 + 예문 모음
- explanation.rules 3~6개, examples 3~4개.
- exampleGroups 4~7그룹, 그룹당 3~4문장(틀린 예 그룹 포함). 간결하게.

## 출력: 이 JSON만 (다른 텍스트/코드블록 없이)
{
  "topic": "개념 제목",
  "explanation": { "titleKo": "", "summaryEn": "", "summaryKo": "", "rules": [{"en":"","ko":""}], "examples": [{"en":"","ko":""}] },
  "exampleGroups": [{ "title": "", "note": "", "examples": [{"en":"","ko":"","tag":"","note":"","wrong":false}] }]
}`;
  return callClaudeJson("admin/grammar-engine/generate-explanation", prompt, TOKENS);
}

async function genCram(c: ConceptCtx, level: number, a: any) {
  const prompt = `${header(c, level)}

## 이미 만든 설명 (이 규칙과 어긋나지 않게)
${rulesOf(a)}

## 이번에 만들 것: 깜지 + 설명 빈칸
- cramText: rules 를 학생이 따라 쓰기 좋게 정리한 원문(줄바꿈 가능).
- blanks 4~6개: cramText 속 핵심을 비운 문장 (text 에 '___' 정확히 한 곳).

## 출력: 이 JSON만
{ "cramText": "", "blanks": [{ "text": "", "answer": "", "hint": "" }] }`;
  return callClaudeJson("admin/grammar-engine/generate-cram", prompt, TOKENS);
}

async function genDrills(c: ConceptCtx, level: number, a: any) {
  const spec = LEVEL_SPEC[level];
  const prompt = `${header(c, level)}

## 이미 만든 설명 (이 규칙과 어긋나지 않게)
${rulesOf(a)}

## 이번에 만들 것: Drill
- drillFill ${spec.fill}개: { level, sentence('___' 한 곳), answer, choices?(있으면 answer 포함), ko, noteKo, hint }
- drillFix ${spec.fix}개: 틀린 단어가 정확히 한 개 든 문장. { level, sentence, wrong(문장 속 한 토큰), correct[](삭제가 정답이면 ""), reasonChoices[3~4], reasonIndex, ko }
- level 필드는 "basic" | "intermediate" | "advanced" (대략 3:4:3).

## 출력: 이 JSON만
{ "drillFill": [], "drillFix": [] }`;
  return callClaudeJson("admin/grammar-engine/generate-drills", prompt, TOKENS);
}

async function genQuestions(c: ConceptCtx, level: number, a: any, count: number, part: 1 | 2, prevStems: string[]) {
  const levels = part === 1 ? '"basic" 과 "intermediate" 위주' : '"intermediate" 와 "advanced" 위주';
  const prompt = `${header(c, level)}

## 이미 만든 설명 (이 규칙과 어긋나지 않게)
${rulesOf(a)}
${prevStems.length ? "\n## 이미 출제한 문제 (겹치지 않게)\n" + prevStems.map((t) => "- " + t.slice(0, 80)).join("\n") + "\n" : ""}
## 이번에 만들 것: 문제 ${count}개 (${part}/2)
- { level, kind(count_wrong|pick_correct|pick_different|reason), stem, stemKo, choices:[{en,ko}], answerIndex(0부터), explanationKo }
- level 필드는 ${levels}. 유형 4종을 고르게. 정답 위치(A~D)가 한쪽으로 쏠리지 않게.

## 출력: 이 JSON만
{ "questions": [] }`;
  return callClaudeJson(`admin/grammar-engine/generate-questions-${part}`, prompt, TOKENS);
}

export async function generateLesson(c: ConceptCtx, level: number): Promise<{ lesson: GrammarLesson } | { errors: string[] }> {
  const spec = LEVEL_SPEC[level];
  const a = await genExplanation(c, level);
  const q1Count = Math.ceil(spec.questions / 2);
  const [cram, drills, q1] = await Promise.all([genCram(c, level, a), genDrills(c, level, a), genQuestions(c, level, a, q1Count, 1, [])]);
  const q1List: any[] = q1.questions ?? [];
  const q2 = await genQuestions(c, level, a, spec.questions - q1Count, 2, q1List.map((q) => String(q?.stem ?? "")));
  const merged = {
    version: 1,
    status: "draft",
    ...a,
    cramText: cram.cramText,
    blanks: cram.blanks ?? [],
    drillFill: drills.drillFill ?? [],
    drillFix: drills.drillFix ?? [],
    questions: [...q1List, ...(q2.questions ?? [])],
  };
  const res = validateGrammarLesson(merged);
  if ("errors" in res) return { errors: res.errors };
  return { lesson: { ...res.lesson, status: "draft" } };
}

export type AiReview = { issues: { target: string; severity: "high" | "med" | "low"; note: string }[]; reviewedAt: string };

// 생성과 별개 호출 — 검수자 + 해당 레벨 학생 역할. 고치지는 않고 문제만 지적한다(수정은 사람이 JSON/재생성으로).
export async function reviewLesson(c: ConceptCtx, level: number, lesson: GrammarLesson): Promise<AiReview> {
  const spec = LEVEL_SPEC[level];
  const prompt = `당신은 두 역할을 맡습니다:
(A) 경력 많은 영어 문법 **검수자**: 문법적 정확성, 예문의 자연스러움, 설명 속 항목마다 예문 3개 이상인지, 빠진 핵심 포인트, 번역 품질, 레벨 적합성.
(B) 이 레벨(${spec.label})의 **표준~하위권 학생**: drillFill / drillFix / questions 를 정답을 모른 채 풀어 보고, 정답이 유일한지, 오답 보기가 부당하게 정답처럼 보이지 않는지, 문장에 정답이 노출되지 않는지, 정답 위치(A~D) 쏠림이 없는지 확인.

## 개념
${c.titleKo} (${c.titleEn}) · tier ${c.tier} · 교재 단원 ${c.units.join(" / ")}

## 레슨(JSON)
${JSON.stringify(lesson)}

## 출력: 이 JSON만. 문제 없으면 issues 는 [].
{ "issues": [ { "target": "explanation | exampleGroups[N] | blanks[N] | drillFill[N] | drillFix[N] | questions[N] | overall", "severity": "high|med|low", "note": "한국어 한두 문장(무엇이 왜 문제인지, 어떻게 고칠지)" } ] }`;
  const parsed = await callClaudeJson("admin/grammar-engine/review", prompt, 12000);
  const issues = Array.isArray(parsed?.issues)
    ? parsed.issues
        .filter((x: any) => x && x.note)
        .map((x: any) => ({
          target: String(x.target ?? "overall"),
          severity: (["high", "med", "low"].includes(x.severity) ? x.severity : "med") as "high" | "med" | "low",
          note: String(x.note),
        }))
    : [];
  return { issues, reviewedAt: new Date().toISOString() };
}
