// lib/writing/aiReview.ts
// 학생용 Writing 리뷰(상세 설명 · 답안 비교 · 모범답안 2종)와 Drill 문항 생성기 (서버 전용).
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";
import type {
  ComparisonRow,
  DrillItem,
  GrammarPattern,
  ReviewTaskKey,
  TaskReview,
  WritingAiReview,
} from "@/lib/writing/reviewTypes";

const MODEL = "claude-sonnet-4-6";

export interface ReviewInput {
  emailPrompt: string;
  discussionPrompt: string;
  emailText: string;
  discussionText: string;
}

// ── 파싱 유틸 ─────────────────────────────────────────────────────────
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
const s = (v: unknown) => String(v ?? "").trim();
const arr = (v: unknown, max: number): any[] => (Array.isArray(v) ? v.slice(0, max) : []);
const strArr = (v: unknown, max: number) => arr(v, max).map(s).filter(Boolean);
const norm = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();

function parseTaskReview(v: any, sourceText: string): TaskReview | null {
  if (!v || typeof v !== "object") return null;
  const hay = norm(sourceText);

  const grammarPatterns: GrammarPattern[] = arr(v.grammarPatterns, 5)
    .map((g: any) => ({
      pattern: s(g?.pattern),
      explanation: s(g?.explanation),
      // 학생 답안에 없는 인용(환각)은 버린다.
      examples: arr(g?.examples, 3)
        .map((e: any) => ({ quote: s(e?.quote), correction: s(e?.correction) }))
        .filter((e) => e.quote && e.correction && hay.includes(norm(e.quote))),
    }))
    .filter((g) => g.pattern && g.explanation);

  const comparison: ComparisonRow[] = arr(v.comparison, 6)
    .map((r: any) => ({ aspect: s(r?.aspect), yours: s(r?.yours), model: s(r?.model) }))
    .filter((r) => r.aspect && (r.yours || r.model));

  const improvedText = s(v.improved?.text);
  const faceliftText = s(v.facelift?.text);
  if (!improvedText && !faceliftText) return null;

  return {
    overview: s(v.overview),
    contentGaps: arr(v.contentGaps, 5)
      .map((g: any) => ({ point: s(g?.point), detail: s(g?.detail) }))
      .filter((g) => g.point),
    grammarPatterns,
    comparison,
    improvements: {
      grammar: strArr(v.improvements?.grammar, 4),
      context: strArr(v.improvements?.context, 4),
      wordChoice: strArr(v.improvements?.wordChoice, 4),
    },
    improved: {
      text: improvedText,
      changes: arr(v.improved?.changes, 8)
        .map((c: any) => ({ change: s(c?.change), why: s(c?.why) }))
        .filter((c) => c.change),
    },
    facelift: {
      text: faceliftText,
      outline: arr(v.facelift?.outline, 8)
        .map((o: any) => ({ part: s(o?.part), role: s(o?.role) }))
        .filter((o) => o.part),
      structureNotes: strArr(v.facelift?.structureNotes, 5),
    },
    drillFocus: arr(v.drillFocus, 5)
      .map((d: any) => ({ tag: s(d?.tag), description: s(d?.description) }))
      .filter((d) => d.tag),
  };
}

// ── 리뷰 생성 ─────────────────────────────────────────────────────────
const REVIEW_SHAPE = `{
  "overview": "한국어 총평 2~4문장",
  "contentGaps": [{"point": "부족한 점 한 줄", "detail": "무엇이 왜 부족한지, 어떻게 보강할지 (한국어)"}],
  "grammarPatterns": [{"pattern": "오류 경향 이름(한국어, 예: 관사 누락)", "explanation": "왜 틀리는지·규칙·고치는 법 (한국어)", "examples": [{"quote": "학생 답안 원문 그대로", "correction": "수정안"}]}],
  "comparison": [{"aspect": "비교 관점(한국어)", "yours": "학생 답의 해당 부분 요약(한국어)", "model": "모범답안의 해당 부분 요약(한국어)"}],
  "improvements": {"grammar": ["..."], "context": ["..."], "wordChoice": ["..."]},
  "improved": {"text": "모범답안 1", "changes": [{"change": "바꾼 내용(영어 표현 → 영어 표현)", "why": "이유(한국어)"}]},
  "facelift": {"text": "모범답안 2", "outline": [{"part": "문단/구성 요소", "role": "그 부분이 하는 일(한국어)"}], "structureNotes": ["효과적인 글 구조 작성 팁(한국어)"]},
  "drillFocus": [{"tag": "연습할 문법·문형 이름(한국어)", "description": "무엇을 연습하는지 (한국어)"}]
}`;

function systemPrompt(): string {
  return `You are an expert TOEFL iBT (2026) Writing coach for Korean students. You write a detailed, honest, encouraging review of a student's response, compared with model answers.

For each submitted task produce:
1. contentGaps — where the content or logic is thin (missed task requirements, unsupported claims, no example, weak link to the peers' posts, abrupt flow). 2–4 items.
2. grammarPatterns — group the student's mistakes by TENDENCY (e.g. article omission, subject-verb agreement, run-on sentences, tense inconsistency, wrong preposition, Korean-style word order). 2–4 patterns, each with a clear rule-level explanation and 1–3 examples. Each example "quote" must be copied EXACTLY (verbatim) from the student's response; "correction" is the fixed version.
3. comparison — 3–5 rows comparing the student's response with improved/facelift model answer by aspect (opening, purpose/position, development of reasons, examples, tone/register, closing, sentence variety, etc.).
4. improvements — concrete ways to improve, split into grammar, context (content/logic/structure), and wordChoice (precision, collocation, register). 2–3 items each, actionable.
5. improved (model answer 1) — the student's OWN response improved: keep their ideas, order and voice, fix errors, sharpen word choice, add the missing support. It must look like a better version of what they wrote, at about the target length. List the key changes with reasons.
6. facelift (model answer 2) — a COMPLETE rewrite showing an effective structure for this task type (Email: purpose up front, one paragraph per required point, polite close. Discussion: direct answer to the professor, engage a peer's point by name, reason + concrete example, brief conclusion). Provide an outline describing each part's job, plus 2–4 structure notes the student can reuse.
7. drillFocus — 3–5 grammar points / sentence patterns from the student's weaknesses AND the model answers that they should practice next.

RULES:
- Write all explanations in KOREAN. Keep model-answer texts, quotes and corrections in English.
- Model answers must be natural, within the task's word range (Email ~100–150 words, Discussion ~100–180 words), and must fully address the prompt.
- Never invent text in "quote". Be specific, not generic. Do not repeat the same point across sections.
- If a task has no response, return null for it.

Return ONLY JSON (no markdown) with exactly this shape:
{
  "email": null | ${REVIEW_SHAPE},
  "discussion": null | { ...same shape... }
}`;
}

function userContent(input: ReviewInput): string {
  const parts: string[] = [];
  if (input.emailText.trim()) {
    parts.push(`=== TASK: Write an Email ===\n[Task prompt]\n${input.emailPrompt || "(not available)"}\n\n[Student response]\n${input.emailText.trim()}`);
  }
  if (input.discussionText.trim()) {
    parts.push(`=== TASK: Academic Discussion ===\n[Task prompt and posts]\n${input.discussionPrompt || "(not available)"}\n\n[Student response]\n${input.discussionText.trim()}`);
  }
  return parts.join("\n\n");
}

export async function generateWritingReview(input: ReviewInput): Promise<WritingAiReview> {
  if (!input.emailText.trim() && !input.discussionText.trim()) {
    throw new Error("리뷰할 답안이 없습니다.");
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 12000,
    temperature: 0.4,
    system: [{ type: "text", text: systemPrompt(), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userContent(input) }],
  });
  void logAnthropicUsage("writing-2026/review", MODEL, msg.usage);
  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const json = parseJson(raw);
  if (!json) throw new Error("AI 리뷰 응답을 해석하지 못했습니다.");

  const email = input.emailText.trim() ? parseTaskReview(json.email, input.emailText) : null;
  const discussion = input.discussionText.trim() ? parseTaskReview(json.discussion, input.discussionText) : null;
  if (!email && !discussion) throw new Error("AI 리뷰 결과가 비어 있습니다.");

  return { version: 1, model: MODEL, generatedAt: new Date().toISOString(), email, discussion };
}

// ── Drill 생성 ────────────────────────────────────────────────────────
function drillSystemPrompt(): string {
  return `You create short writing drills for Korean TOEFL students, built from the student's REVISED sentences and the grammar they get wrong.

Make two kinds of items:
- "chunk": a Korean sentence and its English answer split into 3–6 meaningful chunks IN CORRECT ORDER (e.g. "I am writing", "to ask about", "the online course", "offered next semester"). The student will reorder shuffled chunks. Chunks must concatenate with single spaces into a natural, correct English sentence. Do not put punctuation alone in a chunk; attach it to the last chunk.
- "compose": a Korean sentence the student translates into English, using a specific pattern. Provide the model "answer", "mustUse" (Korean one-liner naming the required grammar/pattern), and "hint" (a few English key words or a structure frame, NOT the full answer).

RULES:
- Base items on sentence patterns and grammar from the student's improved/model sentences and on the listed drill focus points. Do NOT copy the model answers verbatim: change the topic/situation (new nouns, new context) so the student practices the PATTERN, not memorization.
- 5 chunk items first (easier), then 5 compose items (harder). Cover each focus tag at least once. TOEFL-appropriate (email / academic discussion) register, one sentence each.
- "tag" is the grammar/pattern name in Korean (reuse the focus tags).
- Korean prompts must be natural Korean, not literal word-by-word.

Return ONLY JSON: {"items":[{"kind":"chunk","tag":"...","korean":"...","chunks":["..."]},{"kind":"compose","tag":"...","korean":"...","answer":"...","mustUse":"...","hint":"..."}]}`;
}

export async function generateWritingDrill(review: WritingAiReview): Promise<DrillItem[]> {
  const blocks: string[] = [];
  for (const key of ["email", "discussion"] as ReviewTaskKey[]) {
    const t = review[key];
    if (!t) continue;
    blocks.push(
      [
        `## ${key}`,
        `Drill focus: ${t.drillFocus.map((d) => `${d.tag} (${d.description})`).join("; ") || "(none)"}`,
        `Grammar tendencies: ${t.grammarPatterns.map((g) => g.pattern).join("; ") || "(none)"}`,
        `Corrected examples: ${t.grammarPatterns.flatMap((g) => g.examples.map((e) => `"${e.quote}" -> "${e.correction}"`)).slice(0, 6).join(" | ") || "(none)"}`,
        `Improved model answer:\n${t.improved.text}`,
      ].join("\n"),
    );
  }
  if (blocks.length === 0) throw new Error("Drill을 만들 리뷰 데이터가 없습니다.");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 5000,
    temperature: 0.5,
    system: [{ type: "text", text: drillSystemPrompt(), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: blocks.join("\n\n") }],
  });
  void logAnthropicUsage("writing-2026/drill", MODEL, msg.usage);
  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const json = parseJson(raw);
  const items: DrillItem[] = [];
  let n = 0;
  for (const it of arr(json?.items, 14)) {
    const tag = s(it?.tag) || "문장 구성";
    const korean = s(it?.korean);
    if (!korean) continue;
    if (it?.kind === "chunk") {
      const chunks = strArr(it.chunks, 8);
      if (chunks.length < 3) continue;
      items.push({ id: `c${++n}`, kind: "chunk", tag, korean, chunks });
    } else if (it?.kind === "compose") {
      const answer = s(it.answer);
      if (!answer) continue;
      items.push({ id: `p${++n}`, kind: "compose", tag, korean, answer, mustUse: s(it.mustUse), hint: s(it.hint) });
    }
  }
  if (items.length === 0) throw new Error("Drill 문항을 만들지 못했습니다.");
  return items;
}

// ── Drill 작문 채점 ───────────────────────────────────────────────────
export interface ComposeCheck {
  correct: boolean;
  feedback: string;
  corrected: string;
}

export async function checkComposeAnswer(args: {
  korean: string;
  modelAnswer: string;
  mustUse: string;
  studentAnswer: string;
}): Promise<ComposeCheck> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const HAIKU = "claude-haiku-4-5-20251001";
  const msg = await client.messages.create({
    model: HAIKU,
    max_tokens: 600,
    temperature: 0,
    system:
      'You check a Korean student\'s English translation. Accept any grammatically correct, natural sentence that conveys the Korean meaning AND uses the required pattern — it need not match the model answer. Mark incorrect if there is a grammar error, a meaning error, or the required pattern is missing. Give 1–2 sentences of feedback in KOREAN, and "corrected" = the student\'s sentence minimally fixed (or the student\'s sentence unchanged if correct). Return ONLY JSON: {"correct": boolean, "feedback": "...", "corrected": "..."}',
    messages: [
      {
        role: "user",
        content: `Korean: ${args.korean}\nRequired pattern: ${args.mustUse || "(none)"}\nModel answer: ${args.modelAnswer}\nStudent answer: ${args.studentAnswer}`,
      },
    ],
  });
  void logAnthropicUsage("writing-2026/drill-check", HAIKU, msg.usage);
  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const json = parseJson(raw);
  if (!json) throw new Error("채점 응답을 해석하지 못했습니다.");
  return { correct: json.correct === true, feedback: s(json.feedback), corrected: s(json.corrected) || args.studentAnswer };
}
