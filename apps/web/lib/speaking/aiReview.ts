// lib/speaking/aiReview.ts
// Speaking 학생용 리뷰 + 녹음 Drill 생성기 (서버 전용).
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";
import type {
  SpeakingDeliveryStats,
  SpeakingDrillItem,
  SpeakingReview,
  SpeakingReviewBundle,
  SpeakingVocabEntry,
} from "@/lib/speaking/reviewTypes";

const MODEL = "claude-sonnet-4-6";
const HAIKU = "claude-haiku-4-5-20251001";

// ── 전달력 수치(코드로 계산) ──────────────────────────────────────────
const FILLERS = ["um", "uh", "er", "hmm", "like", "you know", "i mean", "well", "so", "actually", "basically"];

export function computeDelivery(script: string, durationSec: number | null): SpeakingDeliveryStats {
  const text = script.trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];
  const lower = ` ${text.toLowerCase().replace(/[^a-z' ]+/g, " ").replace(/\s+/g, " ")} `;
  const fillers = FILLERS.map((f) => ({ word: f, count: (lower.match(new RegExp(` ${f} `, "g")) ?? []).length }))
    // so / well / actually / like 는 문장 연결에도 쓰이므로 3회 이상일 때만 군말로 센다
    .filter((f) => (["so", "well", "actually", "like", "basically"].includes(f.word) ? f.count >= 3 : f.count > 0));
  let repeats = 0;
  const w = words.map((x) => x.toLowerCase().replace(/[^a-z']/g, ""));
  for (let i = 1; i < w.length; i++) if (w[i] && w[i] === w[i - 1]) repeats++;
  const sentences = (text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? []).length || (words.length ? 1 : 0);
  return {
    words: words.length,
    sentences,
    fillers,
    wpm: durationSec && durationSec > 5 ? Math.round((words.length / durationSec) * 60) : null,
    repeats,
  };
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

function parseReview(v: any, script: string): SpeakingReview | null {
  if (!v || typeof v !== "object") return null;
  const hay = norm(script);
  const improvedText = s(v.improved?.text);
  const faceliftText = s(v.facelift?.text);
  if (!improvedText && !faceliftText) return null;
  return {
    overview: s(v.overview),
    structure: arr(v.structure, 6)
      .map((p: any) => ({ part: s(p?.part), present: p?.present === true, comment: s(p?.comment) }))
      .filter((p) => p.part),
    contentGaps: arr(v.contentGaps, 5)
      .map((g: any) => ({ point: s(g?.point), detail: s(g?.detail) }))
      .filter((g) => g.point),
    grammarPatterns: arr(v.grammarPatterns, 5)
      .map((g: any) => ({
        pattern: s(g?.pattern),
        explanation: s(g?.explanation),
        examples: arr(g?.examples, 3)
          .map((e: any) => ({ quote: s(e?.quote), correction: s(e?.correction) }))
          .filter((e) => e.quote && e.correction && hay.includes(norm(e.quote))),
      }))
      .filter((g) => g.pattern && g.explanation),
    deliveryNotes: strArr(v.deliveryNotes, 4),
    comparison: arr(v.comparison, 6)
      .map((r: any) => ({ aspect: s(r?.aspect), yours: s(r?.yours), model: s(r?.model) }))
      .filter((r) => r.aspect && (r.yours || r.model)),
    improvements: {
      grammar: strArr(v.improvements?.grammar, 4),
      context: strArr(v.improvements?.context, 4),
      wordChoice: strArr(v.improvements?.wordChoice, 4),
      delivery: strArr(v.improvements?.delivery, 4),
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
function reviewSystemPrompt(): string {
  return `You are an expert TOEFL iBT (2026) Speaking coach for Korean students. You write a detailed, honest, encouraging review of one spoken response, using the transcript (speech-to-text) of what the student said, compared with model answers.

IMPORTANT: the transcript comes from speech recognition, so it has no reliable punctuation or capitalization. Judge grammar, word choice and content — NOT punctuation or spelling. Do not penalize recognition artifacts.

Produce:
1. structure — check each part of a strong spoken answer: "주장(Topic sentence)", "이유 1", "이유 2 / 세부 설명", "구체적 예시", "마무리". For each: present (true/false) and a short Korean comment.
2. contentGaps — where content or logic is thin (no clear position, vague reasons, no example, ideas not connected, off-topic parts). 2–4 items.
3. grammarPatterns — group mistakes by TENDENCY (tense, agreement, articles, prepositions, word order, run-on speech…), 2–4 patterns, rule-level Korean explanation, and 1–3 examples. Each example "quote" must be copied EXACTLY (verbatim) from the transcript; "correction" is the fix.
4. deliveryNotes — 2–3 Korean notes about delivery that CAN be judged from a transcript: sentence length and variety, over-reliance on fillers/connectors, repeated words, abrupt endings, unfinished sentences. Use the provided delivery numbers. Do not comment on pronunciation or intonation (not measurable here).
5. comparison — 3–5 rows (aspect, yours, model) comparing the student's answer with the model answer.
6. improvements — actionable advice: grammar, context (content/structure), wordChoice, delivery. 2–3 items each.
7. improved (model answer 1) — the student's OWN answer improved: keep their ideas, order and voice, fix errors, sharpen word choice, add the missing support. Use natural SPOKEN English (contractions allowed, short clear sentences), about 100–130 words (45–60 seconds). List key changes with Korean reasons.
8. facelift (model answer 2) — a COMPLETE rewrite showing an effective structure (clear position → reason 1 + detail → reason 2 or example → short conclusion), spoken style, about 100–130 words. Provide an outline (each part's job) and 2–4 structure notes in Korean.
9. drillFocus — 3–5 grammar points / sentence patterns / expressions from the student's weaknesses and the model answers to practice by speaking.

RULES: write explanations in KOREAN; keep quotes, corrections and model answers in English. Never invent text in "quote". Be specific, not generic.

Return ONLY JSON (no markdown):
{
  "overview": "한국어 총평 2~4문장",
  "structure": [{"part": "...", "present": true, "comment": "..."}],
  "contentGaps": [{"point": "...", "detail": "..."}],
  "grammarPatterns": [{"pattern": "...", "explanation": "...", "examples": [{"quote": "...", "correction": "..."}]}],
  "deliveryNotes": ["..."],
  "comparison": [{"aspect": "...", "yours": "...", "model": "..."}],
  "improvements": {"grammar": ["..."], "context": ["..."], "wordChoice": ["..."], "delivery": ["..."]},
  "improved": {"text": "...", "changes": [{"change": "...", "why": "..."}]},
  "facelift": {"text": "...", "outline": [{"part": "...", "role": "..."}], "structureNotes": ["..."]},
  "drillFocus": [{"tag": "...", "description": "..."}]
}`;
}

export async function generateSpeakingReview(input: {
  prompt: string;
  script: string;
  durationSec: number | null;
}): Promise<{ delivery: SpeakingDeliveryStats; review: SpeakingReview; model: string }> {
  if (!input.script.trim()) throw new Error("리뷰할 스크립트가 없습니다.");
  const delivery = computeDelivery(input.script, input.durationSec);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 6500,
    temperature: 0.4,
    system: [{ type: "text", text: reviewSystemPrompt(), cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `[Task prompt]\n${input.prompt || "(not available)"}\n\n[Student transcript]\n${input.script.trim()}\n\n[Delivery numbers] words=${delivery.words}, sentences=${delivery.sentences}, wpm=${delivery.wpm ?? "unknown"}, fillers=${delivery.fillers.map((f) => `${f.word}×${f.count}`).join(", ") || "none"}, immediate repeats=${delivery.repeats}`,
      },
    ],
  });
  void logAnthropicUsage("speaking-2026/review", MODEL, msg.usage);
  const raw = msg.content[0]?.type === "text" ? msg.content[0].text : "";
  const review = parseReview(parseJson(raw), input.script);
  if (!review) throw new Error("리뷰 응답을 해석하지 못했습니다.");
  return { delivery, review, model: MODEL };
}

// ── 녹음 Drill 생성 ───────────────────────────────────────────────────
function drillSystemPrompt(): string {
  return `You create short SPEAKING drills for Korean TOEFL students. Every item will be answered by RECORDING the student's voice, so each target must be a natural SPOKEN sentence that is easy to say (6–16 words, no long subordinate chains).

Item kinds:
- "shadow": a sentence the student hears (text-to-speech) and repeats. Give "text" (English) and "korean" (its meaning). Use useful sentence patterns from the improved/model answers.
- "dictation": the student hears a sentence (text-to-speech, possibly several times) and TYPES it from memory. Give "text" (English, 8–16 words) and "korean". Prefer sentences that use the student's weak patterns, taken from the improved/model answers.
- "fix": the student sees a sentence that contains a grammar error and TYPES the corrected sentence; then the correct sentence is shown, erased, and the student SPEAKS it from memory. Give "wrong" (a complete spoken-style sentence that keeps the student's REAL mistake from the transcript/grammar tendencies — keep the error as the student made it), "answer" (the corrected sentence, differing from "wrong" only by the fix), and "explanation" (one Korean line saying what was wrong). If the student made fewer distinct errors than needed, create a sentence with the same TYPE of error.
- "recall": the student sees only the Korean meaning and a few English hint words and says the sentence from memory. Give "korean", "answer" (English), "hint" (3–5 key words, NOT the full sentence).
- "pattern": a short speaking task. The student SEES A KOREAN SENTENCE and says it in English. Each pattern item has a "mode":
    • "verb": the student must use the given verbs. "constraint" = e.g. "동사: reconsider, postpone". 
    • "expression": the student must use the given key expressions. "constraint" = e.g. "표현: be willing to / in spite of".
    • "structure": the student must use a given grammatical structure, e.g. inversion, a complex sentence with a specified conjunction (although / whereas / unless …), a participle clause (분사구문), a subjunctive / conditional pattern, or a specific modal (should have p.p., might, must …). "constraint" = e.g. "구조: 가정법 과거완료".
    • "free": NO hints at all — only the Korean sentence; the student translates it freely. "constraint" = "" and "mustUse" = "".
  For every pattern give "korean", "answer" (a good model sentence that satisfies the constraint), "mode", "constraint" (Korean display text as above), and "mustUse" (a short English requirement for the checker, e.g. "uses the verbs reconsider and postpone" / "uses a third conditional (If + had p.p., would have p.p.)"; empty for free).

RULES:
- Base items on the student's grammar weaknesses and drill focus points and on sentence patterns in the improved/model answers. For recall and pattern items, change the topic/situation (new nouns, new context) so the student practices the PATTERN, not memorization. Shadow items may reuse model-answer sentences.
- Exactly: 3 shadow, 3 dictation, 3 fix, 4 pattern (no recall items), in that order (easier → harder). The 4 pattern items must be one each of modes "verb", "expression", "structure", "free", in that order. Choose the "structure" item from the student's weak points or the structures used in the model answers. Cover every focus tag at least once.
- "tag" = grammar/pattern name in Korean (reuse the focus tags).
- Korean must be natural Korean, not word-by-word.

Return ONLY JSON: {"items":[{"kind":"shadow","tag":"...","text":"...","korean":"..."},{"kind":"dictation","tag":"...","text":"...","korean":"..."},{"kind":"fix","tag":"...","wrong":"...","answer":"...","explanation":"..."},{"kind":"recall","tag":"...","korean":"...","answer":"...","hint":"..."},{"kind":"pattern","mode":"verb","tag":"...","korean":"...","answer":"...","constraint":"...","mustUse":"..."}]}`;
}

export async function generateSpeakingDrill(review: SpeakingReview, prompt: string): Promise<SpeakingDrillItem[]> {
  const content = [
    `Task: ${prompt || "(n/a)"}`,
    `Drill focus: ${review.drillFocus.map((d) => `${d.tag} (${d.description})`).join("; ") || "(none)"}`,
    `Grammar tendencies: ${review.grammarPatterns.map((g) => g.pattern).join("; ") || "(none)"}`,
    `Corrected examples: ${review.grammarPatterns.flatMap((g) => g.examples.map((e) => `"${e.quote}" -> "${e.correction}"`)).slice(0, 6).join(" | ") || "(none)"}`,
    `Improved model answer:\n${review.improved.text}`,
    `Structured model answer:\n${review.facelift.text}`,
  ].join("\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 4500,
    temperature: 0.5,
    system: [{ type: "text", text: drillSystemPrompt(), cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content }],
  });
  void logAnthropicUsage("speaking-2026/drill", MODEL, msg.usage);
  const json = parseJson(msg.content[0]?.type === "text" ? msg.content[0].text : "");

  const items: SpeakingDrillItem[] = [];
  let n = 0;
  for (const it of arr(json?.items, 16)) {
    const tag = s(it?.tag) || "문장 구성";
    const korean = s(it?.korean);
    if (it?.kind === "shadow") {
      const text = s(it.text);
      if (text) items.push({ id: `s${++n}`, kind: "shadow", tag, text, korean });
    } else if (it?.kind === "dictation") {
      const text = s(it.text);
      if (text) items.push({ id: `d${++n}`, kind: "dictation", tag, text, korean });
    } else if (it?.kind === "fix") {
      const wrong = s(it.wrong);
      const answer = s(it.answer);
      if (wrong && answer && wrong !== answer) {
        items.push({ id: `f${++n}`, kind: "fix", tag, wrong, answer, explanation: s(it.explanation) });
      }
    } else if (it?.kind === "recall") {
      const answer = s(it.answer);
      if (answer && korean) items.push({ id: `r${++n}`, kind: "recall", tag, korean, answer, hint: s(it.hint) });
    } else if (it?.kind === "pattern") {
      const answer = s(it.answer);
      if (answer && korean) {
        const mode = (["verb", "expression", "structure", "free"] as const).find((m) => m === it.mode) ?? "free";
        items.push({
          id: `p${++n}`,
          kind: "pattern",
          mode,
          tag,
          korean,
          answer,
          constraint: mode === "free" ? "" : s(it.constraint),
          mustUse: mode === "free" ? "" : s(it.mustUse),
        });
      }
    }
  }
  if (items.length === 0) throw new Error("Drill 문항을 만들지 못했습니다.");
  return items;
}

// ── 말하기 단어시험 범위 생성 ─────────────────────────────────────────
function vocabSystemPrompt(): string {
  return `You build a SPEAKING vocabulary list for a Korean TOEFL student from one speaking topic. The student will study the list, then hear/see a Korean meaning and SAY the English word, phrasal verb or idiom aloud.

Pick 12 items that actually appear in (or are directly useful for) this topic, drawn from the model answers and the student's own transcript:
- source "model": useful words/phrases from the model answers the student did NOT use or used wrongly.
- source "student": words/phrases the student used imprecisely or wrongly, where a better expression exists (give the better expression).
Mix kinds EXACTLY: 6 "word", 3 "phrasal", 3 "idiom". Be strict about the kinds:
- "word": a precise, topic-relevant single word or a tight two-word term (e.g. "flexible", "commute", "cost savings"). Not trivial words.
- "phrasal": MUST be a TRUE phrasal verb — a verb + particle/preposition whose meaning is idiomatic (e.g. "add up to", "look into", "put off", "come up with", "sign up for", "fall behind"). A verb plus an ordinary object ("attend classes", "watch lectures") or a single verb ("rewind") is NOT a phrasal verb. If the texts contain fewer than 3 real phrasal verbs, supply natural, topic-relevant phrasal verbs the student could have used on this topic (source "model").
- "idiom": MUST be a real idiom or fixed set phrase (e.g. "in the long run", "make ends meet", "on top of that", "at your own pace", "for instance"). Ordinary collocations such as "offer more advantages" are NOT idioms — put them under "word" only if they are a tight two-word term, otherwise skip them. If needed, supply topic-relevant idioms (source "model").
- Write possessives in the "you/your" form ("at your own pace"), never "one's".

Rules for each item:
- "en": the clean base form to be spoken, 1–4 words, NO placeholders, no "~", no "(someone)", no slashes (e.g. "look into", "in the long run", "take advantage of", "reluctant").
- "alts": other acceptable spoken forms (e.g. inflections like "looked into") — [] if none.
- "ko": a natural Korean meaning the student can translate from, 2–12 characters/words, unambiguous (add a short cue in parentheses if needed to disambiguate, e.g. "(~에 대해) 조사하다").
- "example": one short English example sentence (spoken style) from the model answer when possible.
- Avoid very easy words (be, get, good…) and proper nouns.

Return ONLY JSON: {"items":[{"en":"...","alts":["..."],"ko":"...","kind":"word","example":"...","source":"model"}]}`;
}

export async function generateSpeakingVocab(args: {
  review: SpeakingReview;
  script: string;
  prompt: string;
}): Promise<SpeakingVocabEntry[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 3500,
    temperature: 0.4,
    system: [{ type: "text", text: vocabSystemPrompt(), cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Task: ${args.prompt || "(n/a)"}

Student transcript:
${args.script}

Improved model answer:
${args.review.improved.text}

Structured model answer:
${args.review.facelift.text}`,
      },
    ],
  });
  void logAnthropicUsage("speaking-2026/vocab", MODEL, msg.usage);
  const json = parseJson(msg.content[0]?.type === "text" ? msg.content[0].text : "");
  const items: SpeakingVocabEntry[] = [];
  const seen = new Set<string>();
  for (const it of arr(json?.items, 16)) {
    const en = s(it?.en).replace(/[~()/]/g, " ").replace(/\s+/g, " ").trim();
    const ko = s(it?.ko);
    if (!en || !ko || seen.has(en.toLowerCase())) continue;
    seen.add(en.toLowerCase());
    const kind = (["word", "phrasal", "idiom"] as const).find((k) => k === it?.kind) ?? "word";
    items.push({
      id: `v${items.length + 1}`,
      en,
      alts: strArr(it?.alts, 4),
      ko,
      kind,
      example: s(it?.example),
      source: it?.source === "student" ? "student" : "model",
    });
  }
  if (items.length < 4) throw new Error("단어시험 범위를 만들지 못했습니다.");
  return items;
}

// ── 문장 고치기(fix) 채점: 타이핑한 문장이 오류를 바르게 고쳤는지 ────────
export async function checkFixAnswer(args: {
  wrong: string;
  modelAnswer: string;
  studentFix: string;
}): Promise<{ correct: boolean; feedback: string }> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: HAIKU,
    max_tokens: 400,
    temperature: 0,
    system:
      "A Korean student corrected a grammatically wrong English sentence by typing a new version. Judge only whether the student's version fixes the error(s) and is grammatical and natural, with the same meaning as the original. Another valid correction (different from the model answer) is also correct. Ignore capitalization and final punctuation. Give 1–2 sentences of feedback in KOREAN (what is still wrong, or why it is right). Return ONLY JSON: {\"correct\": boolean, \"feedback\": \"...\"}",
    messages: [{ role: "user", content: `Wrong sentence: ${args.wrong}\nModel correction: ${args.modelAnswer}\nStudent's version: ${args.studentFix}` }],
  });
  void logAnthropicUsage("speaking-2026/drill-fix-check", HAIKU, msg.usage);
  const json = parseJson(msg.content[0]?.type === "text" ? msg.content[0].text : "");
  if (!json) throw new Error("채점 응답을 해석하지 못했습니다.");
  return { correct: json.correct === true, feedback: s(json.feedback) };
}

// ── 단문 말하기(pattern) 채점: 인식된 문장 기준 ───────────────────────
export interface SpeakCheck {
  correct: boolean;
  feedback: string;
  corrected: string;
}

export async function checkSpokenAnswer(args: {
  korean: string;
  modelAnswer: string;
  mustUse: string;
  transcript: string;
}): Promise<SpeakCheck> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: HAIKU,
    max_tokens: 600,
    temperature: 0,
    system:
      'You check a Korean student\'s SPOKEN English sentence from its speech-recognition transcript (no reliable punctuation/capitalization — ignore those, and ignore likely recognition errors of single words). Accept any grammatical, natural sentence that conveys the Korean meaning AND satisfies the requirement (if the requirement is "(none)", just judge grammar and meaning as a free translation); it need not match the model answer. Mark incorrect for a real grammar error, a meaning error, or if a stated requirement (given verbs / expressions / structure) is not met. Give 1–2 sentences of feedback in KOREAN; "corrected" = the student\'s sentence minimally fixed (unchanged if correct). Return ONLY JSON: {"correct": boolean, "feedback": "...", "corrected": "..."}',
    messages: [
      {
        role: "user",
        content: `Korean: ${args.korean}\nRequirement: ${args.mustUse || "(none)"}\nModel answer: ${args.modelAnswer}\nStudent transcript: ${args.transcript}`,
      },
    ],
  });
  void logAnthropicUsage("speaking-2026/drill-check", HAIKU, msg.usage);
  const json = parseJson(msg.content[0]?.type === "text" ? msg.content[0].text : "");
  if (!json) throw new Error("채점 응답을 해석하지 못했습니다.");
  return { correct: json.correct === true, feedback: s(json.feedback), corrected: s(json.corrected) || args.transcript };
}

export type { SpeakingReviewBundle };
