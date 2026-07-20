
// Drop-in starter
// Suggested path:
// apps/web/lib/naesin/grammar/ruleScanV1.ts

export type GrammarAuthoringMode = "auto_lite" | "manual_deep";

export type GrammarUnitLite = {
  id: string;
  authoringMode: GrammarAuthoringMode;
};

export type NormalizedSentence = {
  raw: string;
  lower: string;
  tokens: string[];
};

export type GrammarSuggestionSignal = {
  code: string;
  label: string;
  weight: number;
  matchedText?: string;
};

export type GrammarSuggestionCandidate = {
  grammarUnitId: string;
  sentenceId: string;
  score: number;
  matchedSignals: GrammarSuggestionSignal[];
  authoringMode: GrammarAuthoringMode;
  isPrimary: boolean;
  note: string;
};

export type ScanSentenceForGrammarInput = {
  sentenceId: string;
  sentenceText: string;
  lessonGrammarUnits: GrammarUnitLite[];
};

export type ScanSentenceForGrammarOutput = {
  sentenceId: string;
  candidates: GrammarSuggestionCandidate[];
};

export type GrammarRuleSignal = {
  code: string;
  label: string;
  weight: number;
  test: (ctx: NormalizedSentence) => boolean;
  extract?: (ctx: NormalizedSentence) => string | undefined;
};

export type GrammarRuleBundle = {
  grammarUnitId: string;
  threshold: number;
  signals: GrammarRuleSignal[];
};

export function normalizeSentence(sentenceText: string): NormalizedSentence {
  const lower = sentenceText.toLowerCase().trim();
  const tokens = lower
    .replace(/[.,!?;:()"']/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return {
    raw: sentenceText,
    lower,
    tokens,
  };
}

function buildNote(matchedSignals: GrammarSuggestionSignal[]): string {
  if (matchedSignals.length === 0) return "";
  return matchedSignals.map((s) => s.label).join(" / ");
}

function scoreRuleBundle(
  rule: GrammarRuleBundle,
  ctx: NormalizedSentence,
  sentenceId: string,
  authoringMode: GrammarAuthoringMode,
): GrammarSuggestionCandidate | null {
  const matchedSignals: GrammarSuggestionSignal[] = [];

  for (const signal of rule.signals) {
    if (signal.test(ctx)) {
      matchedSignals.push({
        code: signal.code,
        label: signal.label,
        weight: signal.weight,
        matchedText: signal.extract?.(ctx),
      });
    }
  }

  const score = matchedSignals.reduce((sum, s) => sum + s.weight, 0);

  if (score < rule.threshold) {
    return null;
  }

  return {
    grammarUnitId: rule.grammarUnitId,
    sentenceId,
    score,
    matchedSignals,
    authoringMode,
    isPrimary: score >= 80,
    note: buildNote(matchedSignals),
  };
}

const pastPerfectRule: GrammarRuleBundle = {
  grammarUnitId: "gu_tense_pastperfect_001",
  threshold: 70,
  signals: [
    {
      code: "BY_THE_TIME",
      label: "by the time 표현",
      weight: 30,
      test: (ctx) => ctx.lower.includes("by the time"),
      extract: (ctx) => (ctx.lower.includes("by the time") ? "by the time" : undefined),
    },
    {
      code: "HAD_PP",
      label: "had + p.p. 패턴",
      weight: 40,
      test: (ctx) => /\bhad\s+\w+(ed|en)\b/.test(ctx.lower),
      extract: (ctx) => {
        const match = ctx.lower.match(/\bhad\s+\w+(?:ed|en)\b/);
        return match?.[0];
      },
    },
    {
      code: "PAST_CONTEXT",
      label: "과거 맥락 표현",
      weight: 15,
      test: (ctx) =>
        /\b(arrived|left|went|saw|came|finished|started|returned)\b/.test(ctx.lower),
    },
  ],
};

const eachRule: GrammarRuleBundle = {
  grammarUnitId: "gu_sva_each_001",
  threshold: 55,
  signals: [
    {
      code: "EACH_OF",
      label: "each of 패턴",
      weight: 40,
      test: (ctx) => ctx.lower.includes("each of"),
      extract: (ctx) => (ctx.lower.includes("each of") ? "each of" : undefined),
    },
    {
      code: "EVERY_NOUN",
      label: "every + 명사 패턴",
      weight: 30,
      test: (ctx) => /\bevery\s+\w+\b/.test(ctx.lower),
      extract: (ctx) => {
        const match = ctx.lower.match(/\bevery\s+\w+\b/);
        return match?.[0];
      },
    },
    {
      code: "SINGULAR_VERB_HINT",
      label: "단수동사 후보",
      weight: 15,
      test: (ctx) => /\b(is|was|has|does)\b/.test(ctx.lower),
    },
  ],
};

const correlativeRule: GrammarRuleBundle = {
  grammarUnitId: "gu_sva_correlative_001",
  threshold: 60,
  signals: [
    {
      code: "NOT_ONLY",
      label: "not only 발견",
      weight: 25,
      test: (ctx) => ctx.lower.includes("not only"),
      extract: (ctx) => (ctx.lower.includes("not only") ? "not only" : undefined),
    },
    {
      code: "BUT_ALSO",
      label: "but also 발견",
      weight: 25,
      test: (ctx) => ctx.lower.includes("but also"),
      extract: (ctx) => (ctx.lower.includes("but also") ? "but also" : undefined),
    },
    {
      code: "PAIR_PATTERN",
      label: "상관접속사 쌍 완성",
      weight: 25,
      test: (ctx) =>
        ctx.lower.includes("not only") && ctx.lower.includes("but also"),
    },
  ],
};

export const RULE_BUNDLES: Record<string, GrammarRuleBundle> = {
  gu_tense_pastperfect_001: pastPerfectRule,
  gu_sva_each_001: eachRule,
  gu_sva_correlative_001: correlativeRule,
};

export function scanSentenceForGrammar(
  input: ScanSentenceForGrammarInput,
): ScanSentenceForGrammarOutput {
  const ctx = normalizeSentence(input.sentenceText);

  const candidates = input.lessonGrammarUnits
    .map((unit) => {
      const rule = RULE_BUNDLES[unit.id];
      if (!rule) return null;

      return scoreRuleBundle(rule, ctx, input.sentenceId, unit.authoringMode);
    })
    .filter((item): item is GrammarSuggestionCandidate => !!item)
    .sort((a, b) => b.score - a.score);

  return {
    sentenceId: input.sentenceId,
    candidates,
  };
}

export function scanPassageSentencesForGrammar(params: {
  sentences: Array<{ id: string; text: string }>;
  lessonGrammarUnits: GrammarUnitLite[];
}): ScanSentenceForGrammarOutput[] {
  return params.sentences.map((sentence) =>
    scanSentenceForGrammar({
      sentenceId: sentence.id,
      sentenceText: sentence.text,
      lessonGrammarUnits: params.lessonGrammarUnits,
    }),
  );
}

export const EXAMPLE_LESSON_GRAMMAR_UNITS: GrammarUnitLite[] = [
  { id: "gu_tense_pastperfect_001", authoringMode: "manual_deep" },
  { id: "gu_sva_each_001", authoringMode: "auto_lite" },
  { id: "gu_sva_correlative_001", authoringMode: "manual_deep" },
];
