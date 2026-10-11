// apps/web/lib/middle-naesin/generateGrammarLesson.ts
//
// 중학내신 문법 포인트 → 레슨 초안(설명→깜지→빈칸→Drill→문제 22) AI 생성.
// 결과는 항상 draft 로 저장되고, teacher/admin 이 검수 화면에서 확정해야 학생에게 보인다.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";
import {
  validateGrammarLesson,
  lessonCounts,
  type GrammarLesson,
  type GrammarLessonLevel,
} from "@/models/middle-naesin/grammar-lesson";

const MODEL = "claude-sonnet-4-6";
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "placeholder" });

// 기존 수작업 초안(so~that 등)과 같은 분량
export const TARGET_COUNTS = {
  blanks: 4,
  drillFill: { basic: 2, intermediate: 2, advanced: 2 },
  drillFix: { basic: 2, intermediate: 2, advanced: 2 },
  questions: { basic: 6, intermediate: 8, advanced: 8 },
} as const;

export type LessonGenInput = {
  grade: number | string | null;
  publisher: string | null;
  semester: number | string | null;
  lessonNumber: number | null;
  lessonTitle: string | null;
  topic: string; // 문법 포인트 제목
  explanationEn?: string | null;
  explanationKo?: string | null;
  unitTexts: string[]; // 같은 단원 본문/대화문 (예문 톤을 맞추기 위한 참고)
};

function buildPrompt(i: LessonGenInput): string {
  const ctx = i.unitTexts.length
    ? `\n[같은 단원 본문 — 어휘·상황 톤 참고용, 문법 포인트와 무관한 내용을 억지로 넣지 말 것]\n${i.unitTexts.join("\n---\n").slice(0, 3500)}\n`
    : "";
  return `당신은 한국 중학교 영어 내신 문법 출제 교사입니다. 아래 문법 포인트의 학습 레슨을 만드세요.

[단원] ${i.publisher ?? ""} 중${i.grade ?? ""} ${i.semester ?? ""}학기 Lesson ${i.lessonNumber ?? ""} ${i.lessonTitle ?? ""}
[문법 포인트] ${i.topic}
${i.explanationEn ? `[교사가 적어 둔 설명(영)] ${i.explanationEn}\n` : ""}${i.explanationKo ? `[교사가 적어 둔 설명(한)] ${i.explanationKo}\n` : ""}${ctx}
요구사항:
- 중학생 수준 어휘(교과서 범위)만 사용. 예문은 일상·학교 상황.
- 규칙(rules) 4~5개: 핵심 규칙, 자주 틀리는 점, 헷갈리는 구문과의 차이를 포함. 영문(en)과 한글 해설(ko) 쌍.
- 예문(examples) 4개: 영어와 자연스러운 한글 번역.
- cramText: 학생이 노트에 베껴 쓰는 핵심 문장 4개 정도(규칙 요약 2 + 예문 2), 줄바꿈(\\n)으로 구분.
- blanks ${TARGET_COUNTS.blanks}개: cramText/설명 속 핵심 단어를 '___' 한 곳으로 가린 문장, answer(한 단어), hint(첫 글자+밑줄).
- drillFill: basic/intermediate/advanced 각 2개, 총 6개. sentence 에 '___' 정확히 한 곳. choices 가 있으면 answer 를 반드시 포함. 각 문항에 ko(해석).
- drillFix: 각 레벨 2개, 총 6개. 문장에 틀린 단어가 정확히 하나. wrong 은 문장 속 단어 그대로, correct 는 허용 정답 배열(단어를 삭제하는 게 정답이면 [""]), reasonChoices 3개(정답 이유 1 + 그럴듯한 오답 이유 2), reasonIndex 는 정답 이유의 위치, ko 해석.
- questions: basic ${TARGET_COUNTS.questions.basic}, intermediate ${TARGET_COUNTS.questions.intermediate}, advanced ${TARGET_COUNTS.questions.advanced}개 (총 22). kind 는 count_wrong(틀린 문장 개수: stem 에 ①②③… 문장들을 줄바꿈으로, choices 는 "1개/2개/3개/…"), pick_correct(맞는 문장 고르기), pick_different(보기와 다른 것), reason(이유 고르기) 중 고르게. 정답은 반드시 하나. choices 는 4~5개, 각 {en, ko?}. explanationKo 에 정답 근거와 오답이 틀린 이유를 한국어로.
- 모든 문제는 정답이 하나로 확정돼야 하고, 선택지가 문법 포인트 밖의 지식을 요구하면 안 됩니다. 영어 문장은 자연스러워야 합니다(틀린 문장 문제의 의도된 오류는 제외).

반드시 아래 JSON 객체 하나만 응답하세요(코드블록·설명 금지):
{
  "version": 1, "status": "draft", "topic": "${i.topic.replace(/"/g, '\\"')}",
  "explanation": {"titleKo": "", "summaryEn": "", "summaryKo": "", "rules": [{"en":"","ko":""}], "examples": [{"en":"","ko":""}]},
  "cramText": "",
  "blanks": [{"text":"... ___ ...","answer":"","hint":""}],
  "drillFill": [{"level":"basic","sentence":"... ___ ...","answer":"","choices":["",""],"ko":"","noteKo":"","hint":""}],
  "drillFix": [{"level":"basic","sentence":"","wrong":"","correct":[""],"reasonChoices":["","",""],"reasonIndex":0,"ko":""}],
  "questions": [{"level":"basic","kind":"pick_correct","stem":"","stemKo":"","choices":[{"en":"","ko":""}],"answerIndex":0,"explanationKo":""}]
}`;
}

function parseJson(raw: string): unknown {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("AI 응답에서 JSON을 찾을 수 없습니다.");
  return JSON.parse(raw.slice(s, e + 1));
}

/** 분량·일관성 검사 (validateGrammarLesson 이 못 보는 것들) */
function extraChecks(l: GrammarLesson): string[] {
  const errs: string[] = [];
  const c = lessonCounts(l);
  const lv: GrammarLessonLevel[] = ["basic", "intermediate", "advanced"];
  if (c.blanks !== TARGET_COUNTS.blanks) errs.push(`blanks 는 ${TARGET_COUNTS.blanks}개여야 합니다(현재 ${c.blanks}).`);
  for (const k of ["drillFill", "drillFix", "questions"] as const)
    for (const level of lv)
      if (c[k][level] !== TARGET_COUNTS[k][level])
        errs.push(`${k} ${level} 는 ${TARGET_COUNTS[k][level]}개여야 합니다(현재 ${c[k][level]}).`);
  l.drillFill.forEach((f, i) => {
    if ((f.sentence.match(/___/g) ?? []).length !== 1) errs.push(`drillFill[${i + 1}] 빈칸('___')은 정확히 한 곳이어야 합니다.`);
  });
  l.questions.forEach((q, i) => {
    if (new Set(q.choices.map((x) => x.en.trim().toLowerCase())).size < q.choices.length)
      errs.push(`questions[${i + 1}] 중복된 선택지가 있습니다.`);
  });
  return errs;
}

/** 정답 위치가 항상 첫 번째로 쏠리는 것을 막기 위해 보기 순서를 섞는다. */
function shuffle<T>(arr: T[]): { out: T[]; map: number[] } {
  const idx = arr.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return { out: idx.map((i) => arr[i]), map: idx };
}

function shuffleAnswers(l: GrammarLesson): GrammarLesson {
  const drillFix = l.drillFix.map((f) => {
    const { out, map } = shuffle(f.reasonChoices);
    return { ...f, reasonChoices: out, reasonIndex: map.indexOf(f.reasonIndex) };
  });
  const questions = l.questions.map((q) => {
    // "1개/2개/3개" 같은 순서형 보기는 섞지 않는다
    const ordered = q.kind === "count_wrong" || q.choices.every((c) => /^\s*\d+/.test(c.en));
    if (ordered) return q;
    const { out, map } = shuffle(q.choices);
    return { ...q, choices: out, answerIndex: map.indexOf(q.answerIndex) };
  });
  return { ...l, drillFix, questions };
}

async function callModel(prompt: string, tag: string) {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 14000,
    messages: [{ role: "user", content: prompt }],
  });
  void logAnthropicUsage(`middle-naesin/grammar-lesson:${tag}`, MODEL, msg.usage);
  return parseJson((msg.content[0] as { text: string }).text);
}

export async function generateGrammarLesson(input: LessonGenInput): Promise<GrammarLesson> {
  const prompt = buildPrompt(input);
  let raw = await callModel(prompt, "gen");

  for (let attempt = 0; attempt < 2; attempt++) {
    const v = validateGrammarLesson(raw);
    const errors = "errors" in v ? v.errors : extraChecks(v.lesson);
    if (errors.length === 0 && v.ok) {
      const lesson = shuffleAnswers(v.lesson);
      return {
        ...lesson,
        status: "draft",
        finalizedAt: undefined,
        reviewNote: "AI 자동 생성 초안입니다. 정답·해설·번역을 검수한 뒤 확정하세요.",
      };
    }
    if (attempt === 1) throw new Error(`AI 생성 결과가 규칙에 맞지 않습니다: ${errors.slice(0, 6).join(" / ")}`);
    // 1회 자동 수정 요청
    raw = await callModel(
      `${prompt}\n\n이전 응답의 문제점:\n- ${errors.slice(0, 15).join("\n- ")}\n\n이전 응답:\n${JSON.stringify(raw)}\n\n위 문제를 모두 고쳐서 전체 JSON을 다시 응답하세요.`,
      "fix"
    );
  }
  throw new Error("unreachable");
}
