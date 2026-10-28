import "server-only";
import { header, LEVEL_SPEC, type ConceptCtx } from "@/lib/grammar-engine/lesson-ai";
import { normalizeLesson, type SectionKey } from "@/lib/grammar-engine/sections";

// API 호출 없이 문자열만 만든다. 사용자가 복사해서 외부 AI(구독 중인 채팅)에 붙여 넣는다.
const ONLY_JSON = "## 출력: 아래 형태의 JSON 하나만 출력하세요. 설명 문장 없이, 코드블록(```)으로 감싸도 됩니다.";

const rulesOf = (l: any) => JSON.stringify({ rules: l.explanation?.rules, groups: (l.exampleGroups ?? []).map((g: any) => g.title) });

export function sectionPrompt(key: SectionKey, c: ConceptCtx, level: number, lessonRaw: unknown): string {
  const l = normalizeLesson(lessonRaw);
  const spec = LEVEL_SPEC[level];
  const prev = key === "explanation" ? "" : `\n## 이미 만든 설명 (이 규칙과 어긋나지 않게)\n${rulesOf(l)}\n`;

  switch (key) {
    case "explanation":
      return `${header(c, level)}

## 이번에 만들 것: 설명 + 예문 모음
- explanation.rules 3~6개, examples 3~4개.
- exampleGroups 4~7그룹, 그룹당 3~4문장(틀린 예 그룹 포함).

${ONLY_JSON}
{
  "topic": "개념 제목",
  "explanation": { "titleKo": "", "summaryEn": "", "summaryKo": "", "rules": [{"en":"","ko":""}], "examples": [{"en":"","ko":""}] },
  "exampleGroups": [{ "title": "", "note": "", "examples": [{"en":"","ko":"","tag":"","note":"","wrong":false}] }]
}`;
    case "cram":
      return `${header(c, level)}
${prev}
## 이번에 만들 것: 깜지 + 설명 빈칸
- cramText: rules 를 학생이 따라 쓰기 좋게 정리한 원문(줄바꿈 가능).
- blanks 4~6개: cramText 속 핵심을 비운 문장 (text 에 '___' 정확히 한 곳).

${ONLY_JSON}
{ "cramText": "", "blanks": [{ "text": "", "answer": "", "hint": "" }] }`;
    case "drills":
      return `${header(c, level)}
${prev}
## 이번에 만들 것: Drill
- drillFill ${spec.fill}개: { level, sentence('___' 한 곳), answer, choices?(있으면 answer 포함), ko, noteKo, hint }
- drillFix ${spec.fix}개: 틀린 단어가 정확히 한 개 든 문장. { level, sentence, wrong(문장 속 한 토큰), correct[](삭제가 정답이면 ""), reasonChoices[3~4], reasonIndex(0부터), ko }
- level 필드는 "basic" | "intermediate" | "advanced" (대략 3:4:3).

${ONLY_JSON}
{ "drillFill": [], "drillFix": [] }`;
    case "questions":
      return `${header(c, level)}
${prev}
## 이번에 만들 것: 문제 ${spec.questions}개
- { level, kind(count_wrong|pick_correct|pick_different|reason), stem, stemKo, choices:[{en,ko}], answerIndex(0부터), explanationKo }
- level 필드는 "basic" | "intermediate" | "advanced" (대략 3:4:3). 유형 4종을 고르게. 정답 위치(A~D)가 한쪽으로 쏠리지 않게.

${ONLY_JSON}
{ "questions": [] }`;
  }
}

// 확정 전 별도 검수 — 생성한 채팅과 다른 새 대화에 붙여 넣는 것을 권장
export function reviewPrompt(c: ConceptCtx, level: number, lessonRaw: unknown): string {
  const spec = LEVEL_SPEC[level];
  return `당신은 두 역할을 맡습니다:
(A) 경력 많은 영어 문법 **검수자**: 문법적 정확성, 예문의 자연스러움, 설명 속 항목마다 예문 3개 이상인지, 빠진 핵심 포인트, 번역 품질, 레벨 적합성.
(B) 이 레벨(${spec.label})의 **표준~하위권 학생**: drillFill / drillFix / questions 를 정답을 모른 채 풀어 보고, 정답이 유일한지, 오답 보기가 부당하게 정답처럼 보이지 않는지, 문장에 정답이 노출되지 않는지, 정답 위치(A~D) 쏠림이 없는지 확인.

## 개념
${c.titleKo} (${c.titleEn}) · tier ${c.tier} · 교재 단원 ${c.units.join(" / ")}

## 레슨(JSON)
${JSON.stringify(normalizeLesson(lessonRaw))}

${ONLY_JSON} 문제 없으면 issues 는 [].
{ "issues": [ { "target": "explanation | exampleGroups[N] | blanks[N] | drillFill[N] | drillFix[N] | questions[N] | overall", "severity": "high|med|low", "note": "한국어 한두 문장(무엇이 왜 문제인지, 어떻게 고칠지)" } ] }`;
}
