// lib/writing/rubric.ts
// ETS TOEFL iBT Writing Rubric (공식 0~5 척도)

export type EtsWritingScore = 0 | 1 | 2 | 3 | 4 | 5;

export interface WritingRubricScores {
  email: EtsWritingScore;       // Email Writing (or Integrated) — 0~5
  discussion: EtsWritingScore;  // Academic Discussion — 0~5
}

export interface WritingGradingResult {
  scores: WritingRubricScores;
  totalScore: number; // 0~30 환산
  feedback: string;
}

// ── Email Writing (Integrated) 0~5 ────────────────────────────────────────
export const EMAIL_DESCRIPTORS: Record<EtsWritingScore, string> = {
  0: "No response or completely off-topic.",
  1: "Provides little relevant content; significant errors in language make the response difficult to understand.",
  2: "Attempts to address the task but with limited development; frequent errors impede communication.",
  3: "Addresses the task with adequate but inconsistent development; some language errors are noticeable.",
  4: "Addresses all aspects of the task with generally clear organization; minor language errors do not impede communication.",
  5: "Fully addresses all aspects of the task with clear organization, well-developed ideas, and effective use of vocabulary and grammar.",
};

// ── Academic Discussion 0~5 ───────────────────────────────────────────────
export const DISCUSSION_DESCRIPTORS: Record<EtsWritingScore, string> = {
  0: "No response or completely off-topic.",
  1: "Minimally contributes to the discussion; response is largely off-topic or incoherent.",
  2: "Attempts to contribute but with limited relevance; very limited vocabulary and grammatical control.",
  3: "Partially contributes to the discussion with some relevant ideas; language errors are noticeable but do not completely obscure meaning.",
  4: "Contributes effectively to the discussion with relevant ideas and some elaboration; mostly controlled language with minor errors.",
  5: "Contributes clearly and effectively; ideas are well-elaborated and relevant; strong command of vocabulary and grammar.",
};

/**
 * ETS Writing 환산 공식 (학원 근사치):
 *   scaled = round(((email + discussion) / 2) * 6)  → 최대 30
 */
export function calcWritingTotal(scores: WritingRubricScores): number {
  return Math.min(30, Math.round(((scores.email + scores.discussion) / 2) * 6));
}

export function parseWritingGradingJson(raw: string): WritingGradingResult | null {
  try {
    const cleaned = raw.replace(/```(?:json)?/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      email: number;
      discussion: number;
      feedback: string;
    };

    if (
      typeof parsed.email !== "number" ||
      typeof parsed.discussion !== "number" ||
      parsed.email < 0 || parsed.email > 5 ||
      parsed.discussion < 0 || parsed.discussion > 5
    ) {
      return null;
    }

    const scores: WritingRubricScores = {
      email: Math.round(parsed.email) as EtsWritingScore,
      discussion: Math.round(parsed.discussion) as EtsWritingScore,
    };

    return {
      scores,
      totalScore: calcWritingTotal(scores),
      feedback: parsed.feedback ?? "",
    };
  } catch {
    return null;
  }
}

export function buildWritingGradingSystemPrompt(): string {
  return `You are an expert TOEFL iBT Writing rater trained on ETS official scoring rubrics.

Score the student response on two criteria, each on a 0–5 integer scale:

**Email Writing (or Integrated Writing):**
- 5: Fully addresses all aspects; clear organization; well-developed ideas; effective vocabulary and grammar.
- 4: Addresses all aspects with generally clear organization; minor language errors do not impede communication.
- 3: Addresses the task with adequate but inconsistent development; noticeable language errors.
- 2: Attempts to address the task with limited development; frequent errors impede communication.
- 1: Little relevant content; significant errors make the response difficult to understand.
- 0: No response or completely off-topic.

**Academic Discussion:**
- 5: Contributes clearly and effectively; well-elaborated and relevant ideas; strong command of vocabulary and grammar.
- 4: Contributes effectively with relevant ideas and some elaboration; mostly controlled language with minor errors.
- 3: Partially contributes with some relevant ideas; noticeable language errors that do not completely obscure meaning.
- 2: Attempts to contribute with limited relevance; very limited vocabulary and grammatical control.
- 1: Minimally contributes; largely off-topic or incoherent.
- 0: No response or completely off-topic.

If a task type is not present in the student's submission, score it 0.

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "email": <0-5>,
  "discussion": <0-5>,
  "feedback": "<3-5 sentences of specific, constructive feedback in Korean>"
}`;
}
