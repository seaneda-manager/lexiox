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
- cramText: 학생이 그대로 따라 쓰는 깜지 원문(줄바꿈 가능). **한글만** 쓴다(영어 문장·영어 공식은 넣지 않는다). 요약의 주요 부분까지 모두 담는다.
  구성: ① 핵심 요약(summaryKo) ② 규칙마다 한글 설명(ko) ③ 대표 예문의 한글 뜻. 설명(explanation)에 없는 내용은 넣지 않는다.
- blanks 4~6개: cramText 의 **한글 문장**에서 핵심 단어(영어 용어이거나 한글 낱말)를 비운 문장 (text 에 '___' 정확히 한 곳). hint 에는 정답을 쓰지 말고 글자 수나 첫 글자(예: t___, 두 글자)만 쓴다.

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
    case "lecture": {
      const full = level >= 3;
      return `${header(c, level)}
${prev}
## 이번에 만들 것: 강의 + 기출 유형 + 1등급 포인트 + 심화
이 내용은 학생에게 "음성 강의 + 칠판 판서"로 전달됩니다. 위 설명(rules, exampleGroups)과 똑같은 순서와 내용으로 가르치되, 말하듯이 풉니다.
- lecture 6~10개: { "type": "text" | "board", ... , "narration": "읽어 줄 대본" }
  - text: { "type":"text", "text":"화면에 뜨는 한두 문장", "narration":"..." }
  - board: { "type":"board", "title":"칠판 제목", "lines":["한 줄","한 줄"], "narration":"..." } (lines 2~5줄, 각 줄 짧게. 핵심 부분은 [b]…[/b])
  - narration 은 선생님 목소리로 읽어 줄 대본: 한국어, 한 세그먼트 1~4문장. 기호(→, 「」, [b])는 쓰지 말고 말로 풀어 씁니다.
  - **한국어 문장 안에 들어가는 영어 단어·표현·예문은 반드시 [en]…[/en] 로 감싸세요.** 영어 구간만 원어민 발음으로 읽히게 하는 표시입니다.
    예) "[en]can[/en]은 '할 수 있다'는 뜻이에요." / "예를 들어 [en]I can swim.[/en] 이 문장에서 [en]swim[/en]은 동사원형이에요." 영어를 한글로 풀어 쓰지 말고, 조사(는/이/가/를)는 [en] 바깥에 붙입니다.
  - 흐름: 도입(왜 필요한가) → 규칙 하나씩(판서+예문) → 헷갈리는 점 → 한 줄 정리.
- examPoints ${full ? "1~3" : "0~1"}개: 내신 시험에서 이 개념이 어떻게 출제되는지 한두 문장 (문자열 배열).
- topPoints ${full ? "1~3" : "0~1"}개: { "text":"학생이 자주 틀리는 구별·함정 한두 문장", "example":{"en":"","ko":""} }
- deepDive ${level <= 3 ? "0~2" : "빈 배열 []"}개: { "title":"", "ko":"심화 규칙 설명", "examples":[{"en":"","ko":""}] } ${level <= 3 ? "" : "(이 레벨에서는 심화를 따로 두지 않고 설명 안에서 다룹니다)"}
- 위 설명에서 가르치지 않은 내용은 넣지 않습니다.

${ONLY_JSON}
{ "lecture": [], "examPoints": [], "topPoints": [], "deepDive": [] }`;
    }
    case "extra": {
      const written = [2, 3, 4, 5, 6][level - 1] ?? 3;
      return `${header(c, level)}
${prev}
## 이번에 만들 것: 팝업 퀴즈 + 서술형
- popupQuiz 4~8개: 강의(설명)에서 방금 나온 핵심만 빈칸으로. 문장당 1개, 한 문장에 빈칸('___') 한 곳.
  { "prompt":"빈칸이 하나 든 문장", "answer":"대표 정답", "answers":["정답이 둘 이상일 때만"], "options":["오답 보기 2~3개(정답은 넣지 않음)"], "hint_ko":"짧은 힌트(정답을 말하지 않기)" }
  - 학생은 먼저 직접 쓰고, 틀리면 보기에서 고르고, 또 틀리면 정답을 보고 다시 씁니다.
- writtenTasks ${written}개: 종류를 섞어서.
  - rewrite(다시 쓰기): { "level","kind":"rewrite","prompt":"원래 문장","promptKo":"~로 시작하여 다시 쓰시오 같은 지시","answers":["허용되는 정답 문장들"] }
  - order(배열 영작): { "level","kind":"order","prompt":"","promptKo":"우리말 뜻","words":["섞인 단어들(정답에 쓰는 단어 전부, 불필요한 단어 없음)"],"answers":["정답 문장"] }
  - fix_write(어법 고쳐 쓰기): { "level","kind":"fix_write","prompt":"틀린 곳이 한 군데 있는 문장","promptKo":"틀린 곳을 찾아 문장 전체를 바르게 고쳐 쓰시오","answers":["고친 문장"] }
  - level 필드는 "basic" | "intermediate" | "advanced". noteKo 는 정답 설명(선택).
  - answers 에는 정답으로 인정할 문장을 모두 적고, 대소문자·마침표는 신경 쓰지 않습니다.

${ONLY_JSON}
{ "popupQuiz": [], "writtenTasks": [] }`;
    }
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
