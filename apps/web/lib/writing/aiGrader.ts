// lib/writing/aiGrader.ts
// ETS 방식을 모사한 Writing AI 채점기 (서버 전용).
//
// ETS 구조를 따르는 부분:
//  1) 0~5 홀리스틱 점수 + 점수대별 서술 기준(descriptor) 적용
//  2) 기준별(과제 수행 / 전개 / 언어 사용) 진단 + 답안 인용 근거
//  3) 독립 채점 2회 → 점수 병합, 2점 이상 차이나면 "사람 재확인" 표시 (ETS의 이중 채점 + adjudication 모사)
//  4) 분량 같은 객관 지표는 코드로 계산해서 모델에 주고, 극단적 미달은 코드로 상한을 건다
//
// 공식 ETS 채점자가 아니므로 결과는 "선생님이 확정하는 초안"이다.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";
import { EMAIL_DESCRIPTORS, DISCUSSION_DESCRIPTORS } from "@/lib/writing/rubric";
import {
  ERROR_CATEGORIES,
  type CriterionKey,
  type CriterionResult,
  type ErrorCategory,
  type ErrorItem,
  type TaskGrade,
  type WordStats,
  type WritingGradeDetail,
  type WritingTaskKey,
} from "@/lib/writing/gradeDetail";

const MODEL = "claude-sonnet-4-6";

export interface GradeInput {
  /** 과제 지시문(상황·교수 질문·동료 글 등). 없으면 빈 문자열. */
  emailPrompt: string;
  discussionPrompt: string;
  emailText: string;
  discussionText: string;
}

// ── 객관 지표 ─────────────────────────────────────────────────────────
export function wordStats(text: string): WordStats {
  const t = text.trim();
  if (!t) return { words: 0, sentences: 0 };
  const words = t.split(/\s+/).filter(Boolean).length;
  const sentences = (t.match(/[^.!?]+[.!?]+(\s|$)/g) ?? []).length || (words > 0 ? 1 : 0);
  return { words, sentences };
}

// ── 프롬프트 ──────────────────────────────────────────────────────────
function descriptorBlock(d: Record<number, string>): string {
  return [5, 4, 3, 2, 1, 0].map((n) => `  ${n}: ${d[n]}`).join("\n");
}

function buildSystemPrompt(): string {
  return `You are a certified rater for the TOEFL iBT (2026 format) Writing section, trained on ETS holistic scoring.
Score each submitted task on a 0–5 integer scale. The holistic score is a single overall judgment of the response,
informed by three criteria. Do not average mechanically; weigh them as an ETS rater would.

CRITERIA (score each 0–5 as diagnostic evidence):
- task: Email = does it address ALL required points of the situation, with a register appropriate to the recipient and purpose? Discussion = does it answer the professor's question directly and engage with the peers' ideas, adding something new?
- development: organization and elaboration. Clear structure, logical progression, ideas supported with reasons, details or examples (not just listed).
- language: grammatical accuracy and control, range and precision of vocabulary, sentence variety, spelling and punctuation. Judge errors by how much they obscure meaning and how systematic they are.

HOLISTIC SCALE — Write an Email:
${descriptorBlock(EMAIL_DESCRIPTORS)}

HOLISTIC SCALE — Academic Discussion:
${descriptorBlock(DISCUSSION_DESCRIPTORS)}

CALIBRATION RULES (be strict and consistent like a real ETS rater):
- Score what is on the page. Do not reward length, fancy vocabulary used incorrectly, or memorized templates that do not fit the task.
- 5 is reserved for responses that are genuinely strong across all criteria with only rare, minor errors. Most competent-but-imperfect responses are 3 or 4.
- A response that ignores part of the task cannot score above 3. Off-topic = 0–1. Empty = 0.
- Copying the prompt or the peers' posts is not original contribution; discount it.
- Very short responses cannot show development: under ~40 words cap at 2; under ~20 words cap at 1.
- Frequent errors that impede understanding cap the score at 2 even if the ideas are good.

EVIDENCE RULES:
- "evidence" and every error "quote" must be copied EXACTLY (verbatim) from the student's response. Never invent text.
- List up to 8 of the most important errors per task, prioritizing errors that recur or that hurt meaning. Each needs a concrete correction.
- error "category" must be one of: ${ERROR_CATEGORIES.join(", ")}.
- Write rationale, strengths, weaknesses, nextSteps, issue and summary in KOREAN. Keep "quote" and "correction" in English.
- nextSteps: 2–3 specific actions that would move this student to the next score level (e.g. "두 번째 문단에 구체적인 예 1개 추가"), not generic advice.

If a task has no response, return null for that task.

Return ONLY JSON, no markdown, with exactly this shape:
{
  "email": null | {
    "holistic": <0-5 integer>,
    "criteria": {
      "task": {"score": <0-5>, "rationale": "...", "evidence": ["..."]},
      "development": {"score": <0-5>, "rationale": "...", "evidence": ["..."]},
      "language": {"score": <0-5>, "rationale": "...", "evidence": ["..."]}
    },
    "strengths": ["..."],
    "weaknesses": ["..."],
    "errors": [{"quote": "...", "category": "grammar", "issue": "...", "correction": "..."}],
    "nextSteps": ["..."],
    "summary": "..."
  },
  "discussion": null | { ...same shape... }
}`;
}

function buildUserContent(input: GradeInput, stats: { email: WordStats; discussion: WordStats }): string {
  const parts: string[] = [];
  if (input.emailText.trim()) {
    parts.push(
      `=== TASK: Write an Email ===\n[Task prompt]\n${input.emailPrompt || "(not available)"}\n\n[Student response] (${stats.email.words} words, ${stats.email.sentences} sentences)\n${input.emailText.trim()}`,
    );
  }
  if (input.discussionText.trim()) {
    parts.push(
      `=== TASK: Academic Discussion ===\n[Task prompt and discussion posts]\n${input.discussionPrompt || "(not available)"}\n\n[Student response] (${stats.discussion.words} words, ${stats.discussion.sentences} sentences)\n${input.discussionText.trim()}`,
    );
  }
  return parts.join("\n\n");
}

// ── 파싱(방어적) ──────────────────────────────────────────────────────
function clampScore(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(5, Math.round(v)));
}
const strArr = (v: unknown, max = 8): string[] =>
  Array.isArray(v) ? v.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, max) : [];

function parseCriterion(v: any): CriterionResult {
  return {
    score: clampScore(v?.score),
    rationale: String(v?.rationale ?? "").trim(),
    evidence: strArr(v?.evidence, 4),
  };
}

function parseTask(v: any, sourceText: string): TaskGrade | null {
  if (!v || typeof v !== "object") return null;
  const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
  const haystack = norm(sourceText);
  const errors: ErrorItem[] = (Array.isArray(v.errors) ? v.errors : [])
    .map((e: any) => ({
      quote: String(e?.quote ?? "").trim(),
      category: (ERROR_CATEGORIES as readonly string[]).includes(e?.category) ? (e.category as ErrorCategory) : "grammar",
      issue: String(e?.issue ?? "").trim(),
      correction: String(e?.correction ?? "").trim(),
    }))
    // 학생 답안에 실제로 없는 인용은 환각이므로 버린다.
    .filter((e: ErrorItem) => e.quote && haystack.includes(norm(e.quote)))
    .slice(0, 8);

  const criteria = {
    task: parseCriterion(v.criteria?.task),
    development: parseCriterion(v.criteria?.development),
    language: parseCriterion(v.criteria?.language),
  } as Record<CriterionKey, CriterionResult>;
  for (const k of Object.keys(criteria) as CriterionKey[]) {
    criteria[k].evidence = criteria[k].evidence.filter((q) => haystack.includes(norm(q)));
  }

  return {
    holistic: clampScore(v.holistic),
    criteria,
    strengths: strArr(v.strengths, 4),
    weaknesses: strArr(v.weaknesses, 4),
    errors,
    nextSteps: strArr(v.nextSteps, 3),
    summary: String(v.summary ?? "").trim(),
  };
}

function parseJson(raw: string): any | null {
  const cleaned = raw.replace(/```(?:json)?/g, "").trim();
  const a = cleaned.indexOf("{");
  const b = cleaned.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(cleaned.slice(a, b + 1));
  } catch {
    return null;
  }
}

// ── 한 번의 독립 채점 ─────────────────────────────────────────────────
async function runPass(
  client: Anthropic,
  input: GradeInput,
  stats: { email: WordStats; discussion: WordStats },
): Promise<{ email: TaskGrade | null; discussion: TaskGrade | null }> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 6000,
    temperature: 0.3,
    // 루브릭 시스템 프롬프트는 모든 제출에서 동일 → 캐싱
    system: [{ type: "text", text: buildSystemPrompt(), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserContent(input, stats) }],
  });
  void logAnthropicUsage("writing-2026/grade", MODEL, msg.usage);
  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const json = parseJson(raw);
  if (!json) throw new Error("AI 응답을 해석하지 못했습니다.");
  return {
    email: input.emailText.trim() ? parseTask(json.email, input.emailText) : null,
    discussion: input.discussionText.trim() ? parseTask(json.discussion, input.discussionText) : null,
  };
}

/** 분량 미달 상한 (코드로 강제). */
function lengthCap(words: number): number {
  if (words < 20) return 1;
  if (words < 40) return 2;
  return 5;
}

function mergeTask(
  a: TaskGrade | null,
  b: TaskGrade | null,
  words: number,
  label: string,
  flags: string[],
): TaskGrade | null {
  const present = [a, b].filter(Boolean) as TaskGrade[];
  if (present.length === 0) return null;
  const cap = lengthCap(words);

  let base: TaskGrade;
  let finalScore: number;
  if (present.length === 2) {
    const avg = (present[0].holistic + present[1].holistic) / 2;
    finalScore = Math.round(avg); // x.5 는 올림 (ETS는 이중 채점 평균을 쓴다)
    if (Math.abs(present[0].holistic - present[1].holistic) >= 2) {
      flags.push(`${label}: 두 번의 AI 채점이 ${present[0].holistic}점/${present[1].holistic}점으로 크게 달라 사람 재확인이 필요합니다.`);
    }
    // 최종 점수와 더 가까운 채점의 상세를 채택 (동점이면 첫 번째)
    base = Math.abs(present[0].holistic - finalScore) <= Math.abs(present[1].holistic - finalScore) ? present[0] : present[1];
  } else {
    finalScore = present[0].holistic;
    base = present[0];
    flags.push(`${label}: 두 번째 AI 채점이 실패해 1회 채점 결과입니다.`);
  }

  if (finalScore > cap) {
    flags.push(`${label}: 분량(${words}단어) 미달로 점수 상한 ${cap}점이 적용되었습니다.`);
    finalScore = cap;
  } else if (words > 0 && words < 60) {
    flags.push(`${label}: 분량이 짧습니다(${words}단어). 전개 점수를 확인하세요.`);
  }
  return { ...base, holistic: finalScore };
}

export async function gradeWriting(input: GradeInput): Promise<WritingGradeDetail> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stats = { email: wordStats(input.emailText), discussion: wordStats(input.discussionText) };
  const flags: string[] = [];

  if (!input.emailText.trim()) flags.push("Email 답안이 비어 있습니다.");
  if (!input.discussionText.trim()) flags.push("Academic Discussion 답안이 비어 있습니다.");

  // 독립 채점 2회 (한 번이 실패해도 다른 하나로 진행)
  const settled = await Promise.allSettled([runPass(client, input, stats), runPass(client, input, stats)]);
  const passes = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (passes.length === 0) {
    const reason = settled.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    throw new Error(reason?.reason instanceof Error ? reason.reason.message : "AI 채점 실패");
  }

  const email = mergeTask(passes[0].email, passes[1]?.email ?? null, stats.email.words, "Email", flags);
  const discussion = mergeTask(passes[0].discussion, passes[1]?.discussion ?? null, stats.discussion.words, "Discussion", flags);

  // 인용이 환각으로 전부 걸러졌는데 점수가 낮은 경우 등은 선생님이 보도록 표시
  for (const [label, t] of [["Email", email], ["Discussion", discussion]] as const) {
    if (t && t.errors.length === 0 && t.criteria.language.score <= 2) {
      flags.push(`${label}: 언어 점수가 낮은데 검증된 오류 인용이 없습니다. 답안을 직접 확인하세요.`);
    }
  }

  return {
    version: 1,
    model: MODEL,
    gradedAt: new Date().toISOString(),
    email,
    discussion,
    passes: passes.map((p) => ({ email: p.email?.holistic ?? null, discussion: p.discussion?.holistic ?? null })),
    wordStats: {
      email: input.emailText.trim() ? stats.email : null,
      discussion: input.discussionText.trim() ? stats.discussion : null,
    },
    reviewFlags: flags,
  };
}

export type { WritingTaskKey };
