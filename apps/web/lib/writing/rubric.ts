// lib/writing/rubric.ts
// Updated TOEFL 2026 Writing Rubric (3 Sections with Weighted Scoring)

export type EtsWritingScore = 0 | 1 | 2 | 3 | 4 | 5; // Email & Discussion: 0~5

export interface WritingRubricScores {
  buildASentence: number;       // Build a Sentence (Choose Response): 0~10
  email: EtsWritingScore;       // Email Writing: 0~5
  discussion: EtsWritingScore;  // Academic Discussion: 0~5
}

export interface WritingGradingResult {
  scores: WritingRubricScores;
  rawScore: number;             // 0~30 (가중치 적용)
  bandScore: number;            // 1.0~6.0 (최종 밴드)
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
 * Updated TOEFL 2026 Writing 가중치 공식:
 * Final Raw Score = (Build a Sentence × 0.5) + (Write an Email × 2.5) + (Academic Discussion × 2.5)
 * 최대: 10×0.5 + 5×2.5 + 5×2.5 = 5 + 12.5 + 12.5 = 30점
 */
export function calcWritingRawScore(scores: WritingRubricScores): number {
  return (scores.buildASentence * 0.5) + (scores.email * 2.5) + (scores.discussion * 2.5);
}

/**
 * 1.0~6.0 밴드 스케일 매핑 테이블
 */
export function calcWritingBandScore(rawScore: number): number {
  if (rawScore >= 28.5) return 6.0;
  if (rawScore >= 26.5) return 5.5;
  if (rawScore >= 23.5) return 5.0;
  if (rawScore >= 21.5) return 4.5;
  if (rawScore >= 18.5) return 4.0;
  if (rawScore >= 15.0) return 3.5;
  if (rawScore >= 11.5) return 3.0;
  if (rawScore >= 8.5) return 2.5;
  if (rawScore >= 5.5) return 2.0;
  return 1.0;
}

export function parseWritingGradingJson(raw: string): WritingGradingResult | null {
  try {
    let cleaned = raw.replace(/```(?:json)?/g, "").trim();

    // 첫 번째 { 이전의 텍스트 제거, 마지막 } 이후의 텍스트 제거
    const openIdx = cleaned.indexOf("{");
    const closeIdx = cleaned.lastIndexOf("}");

    if (openIdx === -1 || closeIdx === -1 || openIdx >= closeIdx) {
      console.warn("[Writing Parse] No valid JSON object found in:", raw);
      return null;
    }

    cleaned = cleaned.substring(openIdx, closeIdx + 1);
    const parsed = JSON.parse(cleaned) as {
      email: number;
      discussion: number;
      feedback: string;
    };

    if (
      typeof parsed.email !== "number" ||
      typeof parsed.discussion !== "number" ||
      parsed.email < 1 || parsed.email > 6 ||
      parsed.discussion < 1 || parsed.discussion > 6
    ) {
      console.warn("[Writing Parse] Invalid scores:", { email: parsed.email, discussion: parsed.discussion });
      return null;
    }

    const scores: WritingRubricScores = {
      email: Math.round(parsed.email * 2) / 2 as EtsWritingScore,
      discussion: Math.round(parsed.discussion * 2) / 2 as EtsWritingScore,
    };

    return {
      scores,
      totalScore: calcWritingTotal(scores),
      feedback: parsed.feedback ?? "",
    };
  } catch (err) {
    console.warn("[Writing Parse] JSON parse error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

export function buildWritingGradingSystemPrompt(): string {
  return `You are an expert TOEFL iBT Writing rater trained on ETS official 2026 scoring rubrics (1~6 scale).

Score the student response on two criteria, each on a 1–6 scale (0.5-point increments allowed):

**Email Writing (or Integrated Writing):**
- 6: Fully addresses all aspects with excellent organization and command of language.
- 5: Addresses all aspects with clear organization and well-developed ideas.
- 4: Addresses most aspects adequately; mostly clear with minor errors.
- 3: Addresses the task with some development; language errors noticeable but manageable.
- 2: Limited relevant content; frequent errors impede communication significantly.
- 1: Minimal response; mostly off-topic or incoherent.

**Academic Discussion:**
- 6: Excellent contribution; highly relevant and well-articulated ideas.
- 5: Clear and effective contribution; well-elaborated and relevant.
- 4: Effective contribution with relevant ideas; mostly controlled language.
- 3: Partial contribution with some relevant ideas; noticeable errors.
- 2: Limited contribution; very limited vocabulary and control.
- 1: Minimal contribution; largely off-topic or incoherent.

If a task type is not present in the student's submission, score it 1 (minimal).

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "email": <1-6>,
  "discussion": <1-6>,
  "feedback": "<3-5 sentences of specific, constructive feedback in Korean>"
}`;
}
