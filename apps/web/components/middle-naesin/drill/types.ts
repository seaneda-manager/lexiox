import type { MiddleDrillData, MiddleDrillSentence, MiddleDrillVocabItem } from '@/models/middle-naesin/drill';
import type { MiddleNaesinContent } from '@/models/middle-naesin';

// ── Sentence parser ──────────────────────────────────────────────

function splitSentences(text: string): string[] {
  const cleaned = text.replace(/\r\n/g, ' ').replace(/\n+/g, ' ').trim();
  const results: string[] = [];
  let buf = '';

  for (let i = 0; i < cleaned.length; i++) {
    buf += cleaned[i];
    const ch = cleaned[i];
    const next = cleaned[i + 1];

    if ((ch === '.' || ch === '?' || ch === '!') && (next === ' ' || next === undefined || next === '"')) {
      // Skip abbreviations: single capital letter or ≤2-char word before period
      if (ch === '.') {
        const words = buf.trim().split(/\s+/);
        const prev = words[words.length - 2] ?? '';
        if (prev.length <= 2 || /^(Mr|Mrs|Ms|Dr|St|vs|etc|e\.g|i\.e)$/i.test(prev.replace('.', ''))) {
          continue;
        }
      }
      const sentence = buf.trim();
      if (sentence) results.push(sentence);
      buf = '';
      i++; // skip the space
    }
  }
  const remaining = buf.trim();
  if (remaining) results.push(remaining);

  return results.filter((s) => s.length > 3);
}

// ── Fill-blank generator ─────────────────────────────────────────

const SKIP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'must', 'to', 'of', 'in',
  'on', 'at', 'by', 'for', 'with', 'from', 'into', 'that', 'this',
  'it', 'its', 'he', 'she', 'they', 'we', 'i', 'you', 'my', 'our',
  'his', 'her', 'their', 'your', 'and', 'but', 'or', 'so', 'yet',
  'not', 'no', 'if', 'as', 'then', 'than', 'when', 'where', 'how',
]);

function pickBlankWord(sentence: string): { word: string; template: string } | null {
  // tokenize, keep only pure alpha words ≥4 chars that aren't stop words
  const tokens = sentence.split(/(\s+|[,;:"'()[\]{}])/);
  const candidates: { word: string; idx: number }[] = [];

  let wordIdx = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (/^[A-Za-z]{4,}$/.test(tok) && !SKIP_WORDS.has(tok.toLowerCase())) {
      candidates.push({ word: tok, idx: i });
    }
    if (/[A-Za-z]/.test(tok)) wordIdx++;
  }

  if (candidates.length === 0) return null;

  // Pick a candidate from the middle/later part of the sentence (more challenging)
  const pick = candidates[Math.floor(candidates.length * 0.6)] ?? candidates[0];
  const template = tokens
    .map((t, i) => (i === pick.idx ? '_'.repeat(pick.word.length) : t))
    .join('');

  return { word: pick.word, template };
}

// ── Vocab parser ─────────────────────────────────────────────────

function parseVocab(contents: MiddleNaesinContent[]): MiddleDrillVocabItem[] {
  const vocabContents = contents.filter((c) => c.content_type === 'vocab_en_en');
  const items: MiddleDrillVocabItem[] = [];
  let idx = 0;

  for (const content of vocabContents) {
    const lines = (content.body_text ?? '').split('\n').filter(Boolean);
    for (const line of lines) {
      const parts = line.split('|').map((s) => s.trim());
      const word = parts[0];
      const definition = parts[1];
      if (!word || !definition) continue;
      items.push({
        index: idx++,
        word,
        definition,
        example: parts[2] ?? null,
      });
    }
  }

  return items;
}

// ── Main builder ─────────────────────────────────────────────────

export function buildDrillData(
  unitId: string,
  contents: MiddleNaesinContent[],
  preferContentId?: string,
): MiddleDrillData | null {
  // Pick content to drill: prefer specified, then first main_text, then dialogue
  const drillable = contents.filter(
    (c) => c.content_type === 'main_text' || c.content_type === 'dialogue',
  );
  if (drillable.length === 0) return null;

  const target =
    drillable.find((c) => c.id === preferContentId) ??
    contents.find((c) => c.content_type === 'main_text') ??
    drillable[0];

  const enSentences = splitSentences(target.body_text ?? '');
  const koSentences = splitSentences(target.translation_ko ?? '');

  const sentences: MiddleDrillSentence[] = enSentences.map((en, i) => {
    const blank = pickBlankWord(en);
    return {
      index: i,
      en,
      ko: koSentences[i] ?? null,
      fillBlankWord: blank?.word ?? '',
      fillBlankTemplate: blank?.template ?? en,
    };
  });

  return {
    unitId,
    contentId: target.id,
    contentTitle: target.title,
    sentences,
    vocab: parseVocab(contents),
  };
}

export type { MiddleDrillData, MiddleDrillSentence, MiddleDrillVocabItem };
