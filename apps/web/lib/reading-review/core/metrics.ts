import type {
  AccuracyBucket,
  AnswerRow,
  QuestionRow,
  UnknownWordLogRow,
} from "@/lib/reading-review/core/types";

export function buildAccuracyBucket(
  questions: QuestionRow[],
  keySelector: (question: QuestionRow) => string,
  answerByQuestion: Map<string, AnswerRow>,
): AccuracyBucket {
  const bucket = new Map<string, { total: number; correct: number; accuracy: number }>();

  for (const question of questions) {
    const key = keySelector(question);
    const prev = bucket.get(key) ?? { total: 0, correct: 0, accuracy: 0 };
    prev.total += 1;
    if (answerByQuestion.get(question.id)?.is_correct === true) {
      prev.correct += 1;
    }
    bucket.set(key, prev);
  }

  for (const value of bucket.values()) {
    value.accuracy = pct(value.correct, value.total);
  }

  return Object.fromEntries(bucket);
}

export function buildPassageBucket(
  questions: QuestionRow[],
  answerByQuestion: Map<string, AnswerRow>,
  unknownWordLogs: UnknownWordLogRow[],
): Record<string, { total: number; correct: number; accuracy: number; unknownWordCount: number }> {
  const unknownWordCountByPassage = new Map<string, number>();

  for (const row of unknownWordLogs) {
    unknownWordCountByPassage.set(row.passage_id, (row.words ?? []).length);
  }

  const bucket = new Map<
    string,
    { total: number; correct: number; accuracy: number; unknownWordCount: number }
  >();

  for (const question of questions) {
    const key = question.passage_id;
    const prev =
      bucket.get(key) ??
      {
        total: 0,
        correct: 0,
        accuracy: 0,
        unknownWordCount: unknownWordCountByPassage.get(key) ?? 0,
      };

    prev.total += 1;
    if (answerByQuestion.get(question.id)?.is_correct === true) {
      prev.correct += 1;
    }
    bucket.set(key, prev);
  }

  for (const value of bucket.values()) {
    value.accuracy = pct(value.correct, value.total);
  }

  return Object.fromEntries(bucket);
}

export function accuracyOf(bucket: AccuracyBucket, keys: string[]): number | null {
  const rows = keys.map((key) => bucket[key]).filter(Boolean);

  if (rows.length === 0) return null;

  const total = rows.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
  const correct = rows.reduce((sum, row) => sum + Number(row.correct ?? 0), 0);
  return pct(correct, total);
}

export function getRepeatedWords(words: string[]): string[] {
  const counter = new Map<string, number>();

  for (const word of words.map((item) => item.trim()).filter(Boolean)) {
    const key = word.toLowerCase();
    counter.set(key, (counter.get(key) ?? 0) + 1);
  }

  return [...counter.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

export function pct(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return round2((numerator / denominator) * 100);
}

export function avg(values: number[]): number {
  const filtered = values.filter((value) => Number.isFinite(value));
  if (filtered.length === 0) return 0;
  return round2(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

export function avgNullable(values: Array<number | null>): number | null {
  const filtered = values.filter(
    (value): value is number => value != null && Number.isFinite(value),
  );
  if (filtered.length === 0) return null;
  return round2(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
