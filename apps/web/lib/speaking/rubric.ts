// lib/speaking/rubric.ts
// ETS TOEFL iBT Speaking Rubric (공식 0~4 척도)
// https://www.ets.org/toefl/score-users/scores/speaking.html

export type EtsRubricScore = 0 | 1 | 2 | 3 | 4;

export interface SpeakingRubricScores {
  delivery: EtsRubricScore;   // 발음·유창성·속도
  language: EtsRubricScore;   // 어휘·문법·문장구조
  topic: EtsRubricScore;      // 내용·논리·완성도
}

export interface SpeakingGradingResult {
  scores: SpeakingRubricScores;
  totalScore: number; // 0~30 환산 (ETS 공식)
  feedback: string;
}

// ── ETS 0~4 레벨 설명 (Delivery) ───────────────────────────────────────────
export const DELIVERY_DESCRIPTORS: Record<EtsRubricScore, string> = {
  0: "No response or completely unintelligible.",
  1: "Generally intelligible but frequently interrupted by hesitation, irregular pacing, or pronunciation errors that make it difficult to follow.",
  2: "Some hesitation and uneven pacing; mispronunciations occasionally cause listener confusion, but the overall message is generally clear.",
  3: "Speech is mostly fluent with only minor hesitation; pronunciation and intonation are clear with occasional lapses that do not impede comprehension.",
  4: "Speech is fluid, well-paced, and clear. Pronunciation and intonation are natural with only occasional minor disfluencies.",
};

// ── ETS 0~4 레벨 설명 (Language Use) ──────────────────────────────────────
export const LANGUAGE_DESCRIPTORS: Record<EtsRubricScore, string> = {
  0: "No response or completely unintelligible.",
  1: "Very limited range of vocabulary and grammar; frequent errors often obscure meaning.",
  2: "Limited vocabulary and basic grammatical structures; errors are noticeable and sometimes impede communication.",
  3: "Adequate range of vocabulary and grammatical structures with some errors; errors rarely impede communication.",
  4: "Effective use of a varied vocabulary and complex grammatical structures; errors, if present, do not impede communication.",
};

// ── ETS 0~4 레벨 설명 (Topic Development — Independent Task) ──────────────
export const TOPIC_INDEPENDENT_DESCRIPTORS: Record<EtsRubricScore, string> = {
  0: "No response or completely unintelligible.",
  1: "Topic is barely addressed; ideas are undeveloped or incoherent.",
  2: "Response addresses the topic with limited development; ideas may be vague or poorly connected.",
  3: "Response clearly addresses the topic with generally clear development; some ideas may lack full elaboration.",
  4: "Response fully addresses the topic with well-developed, coherent ideas and effective use of details and examples.",
};

// ── ETS 0~4 레벨 설명 (Topic Development — Integrated Task) ───────────────
export const TOPIC_INTEGRATED_DESCRIPTORS: Record<EtsRubricScore, string> = {
  0: "No response or completely unintelligible.",
  1: "Little to no relevant content from the reading/listening; ideas are fragmented.",
  2: "Some relevant information incorporated but key details are missing or inaccurate.",
  3: "Most key information from the source material is included with generally accurate representation.",
  4: "Accurately synthesizes key information from the reading and listening; clearly conveys relationships between sources.",
};

export type TaskContext = "independent" | "integrated";

export function getTopicDescriptor(
  score: EtsRubricScore,
  context: TaskContext,
): string {
  return context === "integrated"
    ? TOPIC_INTEGRATED_DESCRIPTORS[score]
    : TOPIC_INDEPENDENT_DESCRIPTORS[score];
}

/**
 * ETS 공식 환산 공식:
 *   raw = (delivery + language + topic) / 3  (평균, 소수점 포함)
 *   scaled = round(raw * 10)  → 최대 40이지만 TOEFL은 30 상한 적용
 *
 * 실제 ETS는 내부 환산 테이블을 사용하지만,
 * 이 공식은 학원 용도로 충분한 근사치를 제공합니다.
 */
export function calcTotalScore(scores: SpeakingRubricScores): number {
  const raw = (scores.delivery + scores.language + scores.topic) / 3;
  return Math.min(30, Math.round(raw * 10));
}

// ── AI 채점 응답 파싱 ──────────────────────────────────────────────────────

const SCORE_KEYS = ["delivery", "language", "topic"] as const;

export function parseGradingJson(raw: string): SpeakingGradingResult | null {
  try {
    // Claude가 마크다운 코드 블록으로 감쌀 수 있음
    const cleaned = raw.replace(/```(?:json)?/g, "").trim();
    const parsed = JSON.parse(cleaned) as {
      delivery: number;
      language: number;
      topic: number;
      feedback: string;
    };

    for (const key of SCORE_KEYS) {
      if (
        typeof parsed[key] !== "number" ||
        parsed[key] < 0 ||
        parsed[key] > 4
      ) {
        return null;
      }
    }

    const scores: SpeakingRubricScores = {
      delivery: Math.round(parsed.delivery) as EtsRubricScore,
      language: Math.round(parsed.language) as EtsRubricScore,
      topic: Math.round(parsed.topic) as EtsRubricScore,
    };

    return {
      scores,
      totalScore: calcTotalScore(scores),
      feedback: parsed.feedback ?? "",
    };
  } catch {
    return null;
  }
}

// ── System Prompt 생성 ─────────────────────────────────────────────────────

export function buildGradingSystemPrompt(context: TaskContext): string {
  const topicSection =
    context === "integrated"
      ? `**Topic Development (Integrated):**
- 4: Accurately synthesizes key information from reading and listening; clearly conveys relationships between sources.
- 3: Most key information included with generally accurate representation.
- 2: Some relevant information incorporated but key details are missing or inaccurate.
- 1: Little to no relevant content from the source material; ideas are fragmented.
- 0: No response or completely unintelligible.`
      : `**Topic Development (Independent):**
- 4: Fully addresses the topic with well-developed, coherent ideas and effective use of details and examples.
- 3: Clearly addresses the topic with generally clear development; some ideas may lack full elaboration.
- 2: Addresses the topic with limited development; ideas may be vague or poorly connected.
- 1: Topic is barely addressed; ideas are undeveloped or incoherent.
- 0: No response or completely unintelligible.`;

  return `You are an expert TOEFL iBT Speaking rater trained on ETS official scoring rubrics.

Score the student response on three criteria, each on a 0–4 integer scale:

**Delivery:**
- 4: Fluid, well-paced, clear pronunciation and intonation; only occasional minor disfluencies.
- 3: Mostly fluent; minor hesitation; pronunciation clear with occasional lapses.
- 2: Some hesitation and uneven pacing; mispronunciations occasionally cause confusion.
- 1: Frequently interrupted by hesitation, irregular pacing, or pronunciation errors.
- 0: No response or completely unintelligible.

**Language Use:**
- 4: Effective use of varied vocabulary and complex structures; errors don't impede communication.
- 3: Adequate range with some errors; errors rarely impede communication.
- 2: Limited vocabulary and basic structures; noticeable errors sometimes impede communication.
- 1: Very limited range; frequent errors often obscure meaning.
- 0: No response or completely unintelligible.

${topicSection}

Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "delivery": <0-4>,
  "language": <0-4>,
  "topic": <0-4>,
  "feedback": "<2-4 sentences of specific, constructive feedback in Korean>"
}`;
}
