// apps/web/lib/typing/contentAdapters.ts
// Maps existing content sources (vocab assignments, curated passages) into
// plain TypingUnit[] for the typing-practice engine. Client-side only —
// reuses the existing vocab session loader rather than re-deriving its
// student/assignment resolution logic.
'use client';

import { loadSessionWords } from '@/lib/vocab/session/loadSessionWords';
import type { TypingUnit } from './types';

export type TypingContentSource = 'vocab' | 'content';

export type TypingContentRecord = {
  id: string;
  title: string;
  source_type: 'manual' | 'reading_passage' | 'listening_transcript';
  body_en: string;
  body_ko: string | null;
};

/** Splits English prose into sentence-level TypingUnits, best-effort paired with Korean lines. */
export function splitContentIntoUnits(content: { body_en: string; body_ko?: string | null }): TypingUnit[] {
  const enSentences = content.body_en
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const koLines = (content.body_ko ?? '')
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return enSentences.map((text, i) => ({
    id: `sentence-${i}`,
    text,
    translationKo: koLines[i] ?? null,
  }));
}

export async function getVocabTypingUnits(userId: string): Promise<TypingUnit[]> {
  const words = await loadSessionWords({ userId });
  return words
    .filter((w) => w.text)
    .map((w) => ({
      id: w.id,
      text: w.text,
      translationKo: w.meanings_ko?.[0] ?? null,
    }));
}

export type CompletedPassage = {
  id: string;
  title: string;
  body_en: string;
  source: 'reading' | 'listening' | 'hi_naesin';
  completed_at: string;
};

const COMPLETED_SOURCE_LABEL: Record<CompletedPassage['source'], string> = {
  reading: 'TOEFL Reading',
  listening: 'TOEFL Listening',
  hi_naesin: 'Hi-내신',
};

export async function listCompletedPassages(): Promise<CompletedPassage[]> {
  const res = await fetch('/api/typing-practice/completed-passages');
  if (!res.ok) return [];
  const json = await res.json();
  return json?.ok ? (json.items as CompletedPassage[]) : [];
}

export function completedPassageLabel(p: CompletedPassage): string {
  return `[${COMPLETED_SOURCE_LABEL[p.source]}] ${p.title}`;
}

export async function getPracticeContent(contentId: string): Promise<TypingContentRecord | null> {
  const res = await fetch(`/api/typing-practice/content?id=${encodeURIComponent(contentId)}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.ok ? (json.content as TypingContentRecord) : null;
}

export async function listPracticeContent(): Promise<TypingContentRecord[]> {
  const res = await fetch('/api/typing-practice/content');
  if (!res.ok) return [];
  const json = await res.json();
  return json?.ok ? (json.items as TypingContentRecord[]) : [];
}
