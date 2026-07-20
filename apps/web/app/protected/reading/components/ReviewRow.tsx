// apps/web/components/reading/components/ReviewRow.tsx
'use client';

import React from 'react';
import type { RQuestion, RChoice } from '@/models/reading';

type Props = {
  q: RQuestion;
  selected?: string | null;
  index?: number;
};

// Explanation shape (optional, stored under q.meta.explanation or legacy q.explanation)
type Explanation = {
  clue_quote?: string;
  why_correct?: string;
  // map of choice label -> reason (e.g., { A: "...", B: "..." })
  why_others?: Record<string, unknown>;
};

function asExplanation(e: unknown): Explanation {
  const obj = e && typeof e === 'object' ? (e as Record<string, unknown>) : {};
  const clue_quote =
    typeof obj['clue_quote'] === 'string' ? (obj['clue_quote'] as string) : undefined;
  const why_correct =
    typeof obj['why_correct'] === 'string' ? (obj['why_correct'] as string) : undefined;
  const why_others =
    obj['why_others'] && typeof obj['why_others'] === 'object'
      ? (obj['why_others'] as Record<string, unknown>)
      : undefined;
  return { clue_quote, why_correct, why_others };
}

export default function ReviewRow({ q, selected }: Props) {
  const choices = (q.choices ?? []) as RChoice[];
  const correct = choices.find((c) => !!c.isCorrect)?.id ?? null;

  // Prefer q.meta.explanation; fall back to legacy q.explanation if present
  const rawExp =
    (q.meta as any)?.explanation !== undefined ? (q.meta as any).explanation : (q as any).explanation;
  const exp = asExplanation(rawExp);

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="text-gray-900 dark:text-gray-100 font-medium">
        Q{q.number ?? ''}.
      </div>

      <ul className="space-y-2">
        {choices.map((c, i) => {
          const isSelected = (selected ?? null) === c.id;
          const isCorrect = correct === c.id;
          const letter = String.fromCharCode(65 + i); // A, B, C, ...

          return (
            <li
              key={c.id || i}
              className={[
                'rounded-lg border px-3 py-2',
                isCorrect
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                  : isSelected
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20'
                  : 'border-gray-200 dark:border-neutral-700',
              ].join(' ')}
            >
              <div className="flex items-start gap-2">
                <span className="font-semibold">{letter}.</span>
                <span className="flex-1">{c.text}</span>
                {isCorrect && (
                  <span className="text-xs text-green-700 dark:text-green-300">Correct</span>
                )}
                {isSelected && !isCorrect && (
                  <span className="text-xs text-amber-700 dark:text-amber-300">Your choice</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Clue quote */}
      {exp.clue_quote && (
        <div className="text-sm">
          <div className="mb-1 font-semibold text-gray-900 dark:text-gray-100">Clue Sentence</div>
          <blockquote className="rounded-md border-l-4 border-gray-300 bg-gray-50 p-2 dark:border-neutral-700 dark:bg-neutral-800">
            {exp.clue_quote}
          </blockquote>
        </div>
      )}

      {/* Explanations */}
      {(exp.why_correct || exp.why_others) && (
        <div className="space-y-2 text-sm">
          {exp.why_correct && (
            <div>
              <div className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                Why the correct choice
              </div>
              <div className="whitespace-pre-wrap">{exp.why_correct}</div>
            </div>
          )}

          {exp.why_others && (
            <div>
              <div className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
                Why others are incorrect
              </div>
              <div className="space-y-1">
                {Object.entries(exp.why_others).map(([k, v]) => (
                  <div key={k} className="text-gray-800 dark:text-gray-200">
                    <strong>{k}</strong>: {String(v)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
