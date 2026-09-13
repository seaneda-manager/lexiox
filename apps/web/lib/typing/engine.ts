// apps/web/lib/typing/engine.ts
// Framework-agnostic typing-session engine. Drives the "타자 암기 스피드 훈련"
// game (and, later, the arcade/training modes) without any React/DOM dependency.
// The Play component feeds it key-by-key input and reads render state back out.

import type {
  CharState,
  ComboState,
  RevealMode,
  TypingMetrics,
  TypingSessionConfig,
  TypingUnit,
  UnitResult,
} from './types';

type WordSpan = { start: number; end: number; text: string };

type WordPace = { word: string; msPerChar: number };

export type RenderChar = {
  /** The character to display. Placeholder ('•') when masked. */
  char: string;
  state: CharState;
  masked: boolean;
};

function computeWordSpans(text: string): WordSpan[] {
  const spans: WordSpan[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    spans.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
  }
  return spans;
}

/** Deterministic pseudo-random hash so the same words stay blanked across re-renders. */
function stableHash(n: number): number {
  const h = (n * 2654435761) >>> 0;
  return h % 100;
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const WEAK_WORD_PACE_MULTIPLIER = 1.6;
const MIN_WORD_LEN_FOR_PACE = 3;
const FEVER_THRESHOLD = 10;

export class TypingSession {
  private config: TypingSessionConfig;
  private typeOrder: number[];
  private displayOrder: number[];
  private currentStep = 0;

  private cursor = 0;
  private charStates: CharState[] = [];
  private hasPendingError = false;
  private wordSpans: WordSpan[] = [];
  private wordEnterTime: Map<number, number> = new Map();

  private sessionStartedAt: number | null = null;
  private totalKeystrokes = 0;
  private correctKeystrokes = 0;
  private errorCount = 0;
  private wordPaces: WordPace[] = [];
  private completedUnits: UnitResult[] = [];
  private errorWordsSet: Set<string> = new Set();
  private currentWordHadError = false;
  private comboCurrent = 0;
  private comboBest = 0;

  constructor(config: TypingSessionConfig) {
    this.config = config;
    this.typeOrder = config.units.map((_, i) => i);
    this.displayOrder = config.shuffled ? shuffle(this.typeOrder) : this.typeOrder.slice();
    this.resetUnit();
  }

  private currentUnit(): TypingUnit | null {
    const idx = this.typeOrder[this.currentStep];
    return this.config.units[idx] ?? null;
  }

  private resetUnit(): void {
    const unit = this.currentUnit();
    const text = unit?.text ?? '';
    this.cursor = 0;
    this.charStates = new Array(text.length).fill('pending');
    this.hasPendingError = false;
    this.wordSpans = computeWordSpans(text);
    this.wordEnterTime = new Map();
    this.currentWordHadError = false;
  }

  start(): void {
    if (this.sessionStartedAt == null) this.sessionStartedAt = Date.now();
  }

  setStrict(strict: boolean): void {
    this.config.strict = strict;
    this.hasPendingError = false;
  }

  getCurrentTargetText(): string {
    return this.currentUnit()?.text ?? '';
  }

  getCurrentTranslation(): string | null {
    return this.currentUnit()?.translationKo ?? null;
  }

  /** Units in the order they're shown as reference material (shuffled if configured). */
  getDisplayUnits(): TypingUnit[] {
    return this.displayOrder.map((i) => this.config.units[i]);
  }

  getProgress(): { current: number; total: number } {
    return { current: this.currentStep, total: this.typeOrder.length };
  }

  isSessionComplete(): boolean {
    return this.currentStep >= this.typeOrder.length;
  }

  private blankedWordIndices(): Set<number> {
    const set = new Set<number>();
    if (this.config.revealMode !== 'partial') return set;
    const ratio = Math.max(0, Math.min(1, this.config.blankRatio));
    this.wordSpans.forEach((span, i) => {
      if (span.text.length < MIN_WORD_LEN_FOR_PACE) return;
      if (stableHash(i + span.text.length) < ratio * 100) set.add(i);
    });
    return set;
  }

  /** Per-character render state, reveal-mode aware, for the UI to paint. */
  getRenderChars(): RenderChar[] {
    const target = this.getCurrentTargetText();
    const blanked = this.blankedWordIndices();

    return target.split('').map((ch, i) => {
      let state: CharState = 'pending';
      if (i < this.cursor) {
        state = this.charStates[i] === 'incorrect' ? 'incorrect' : 'correct';
      } else if (i === this.cursor) {
        state = this.hasPendingError ? 'incorrect' : 'current';
      }

      const notYetRevealed = i > this.cursor || (i === this.cursor && !this.hasPendingError && state !== 'correct');
      let masked = false;
      if (notYetRevealed && ch !== ' ') {
        if (this.config.revealMode === 'blind') {
          masked = true;
        } else if (this.config.revealMode === 'partial') {
          const wordIdx = this.wordSpans.findIndex((s) => i >= s.start && i < s.end);
          masked = wordIdx >= 0 && blanked.has(wordIdx);
        }
      }

      return { char: masked ? '•' : ch, state, masked };
    });
  }

  /** Feed a single visible character, or 'Backspace'. */
  pressKey(key: string): { accepted: boolean; correct: boolean } {
    this.start();
    const target = this.getCurrentTargetText();

    if (key === 'Backspace') {
      if (this.hasPendingError) {
        this.hasPendingError = false;
        return { accepted: true, correct: false };
      }
      if (this.cursor > 0) {
        this.cursor--;
        this.charStates[this.cursor] = 'pending';
      }
      return { accepted: true, correct: false };
    }

    if (this.cursor >= target.length) return { accepted: false, correct: false };

    // entering a word for the first time
    const wordIdx = this.wordSpans.findIndex((s) => this.cursor >= s.start && this.cursor < s.end);
    if (wordIdx >= 0 && !this.wordEnterTime.has(wordIdx)) {
      this.wordEnterTime.set(wordIdx, Date.now());
      this.currentWordHadError = false;
    }

    const expected = target[this.cursor];
    this.totalKeystrokes++;
    const isCorrect = key === expected;

    if (isCorrect) {
      this.correctKeystrokes++;
      this.charStates[this.cursor] = 'correct';
      this.hasPendingError = false;
      this.cursor++;

      // leaving a word (either hit trailing space or end of text)
      if (wordIdx >= 0 && this.cursor >= this.wordSpans[wordIdx].end) {
        const enteredAt = this.wordEnterTime.get(wordIdx);
        const span = this.wordSpans[wordIdx];
        if (enteredAt != null && span.text.length >= MIN_WORD_LEN_FOR_PACE) {
          const durationMs = Date.now() - enteredAt;
          this.wordPaces.push({ word: span.text, msPerChar: durationMs / span.text.length });
        }
        if (this.currentWordHadError) {
          this.comboCurrent = 0;
        } else {
          this.comboCurrent++;
          this.comboBest = Math.max(this.comboBest, this.comboCurrent);
        }
      }
    } else {
      this.errorCount++;
      this.charStates[this.cursor] = 'incorrect';
      this.comboCurrent = 0;
      if (wordIdx >= 0) {
        this.currentWordHadError = true;
        this.errorWordsSet.add(this.wordSpans[wordIdx].text);
      }
      if (this.config.strict) {
        this.hasPendingError = true;
      } else {
        this.cursor++;
      }
    }

    return { accepted: true, correct: isCorrect };
  }

  private computeWeakWords(): string[] {
    if (this.wordPaces.length < 3) return [];
    const sorted = [...this.wordPaces].sort((a, b) => a.msPerChar - b.msPerChar);
    // Floor at 1ms/char: a near-instant baseline (fast, consistent typing) would
    // otherwise round the median to 0 and mute outlier detection entirely.
    const median = Math.max(sorted[Math.floor(sorted.length / 2)].msPerChar, 1);

    const seen = new Set<string>();
    const weak: string[] = [];
    for (const p of this.wordPaces) {
      if (p.msPerChar > median * WEAK_WORD_PACE_MULTIPLIER) {
        const key = p.word.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          weak.push(p.word);
        }
      }
    }
    return weak.slice(0, 20);
  }

  getLiveMetrics(): TypingMetrics {
    const elapsedMs = this.sessionStartedAt ? Date.now() - this.sessionStartedAt : 0;
    const minutes = Math.max(elapsedMs / 60000, 1 / 60000);
    const wpm = Math.round(this.correctKeystrokes / 5 / minutes);
    const rawWpm = Math.round(this.totalKeystrokes / 5 / minutes);
    const accuracy = this.totalKeystrokes > 0
      ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100)
      : 100;

    return {
      wpm: Number.isFinite(wpm) ? wpm : 0,
      rawWpm: Number.isFinite(rawWpm) ? rawWpm : 0,
      accuracy,
      errorCount: this.errorCount,
      elapsedMs,
      weakWords: this.computeWeakWords(),
      errorWords: Array.from(this.errorWordsSet).slice(0, 20),
    };
  }

  /** Consecutive clean-word streak, for combo/fever-time UI. */
  getCombo(): ComboState {
    return {
      current: this.comboCurrent,
      best: this.comboBest,
      fever: this.comboCurrent >= FEVER_THRESHOLD,
    };
  }

  /** Finalize the current unit and advance. Call once the unit's text is fully correct. */
  completeUnit(): UnitResult {
    const unit = this.currentUnit();
    const metrics = this.getLiveMetrics();
    const result: UnitResult = {
      unitId: unit?.id ?? '',
      text: unit?.text ?? '',
      metrics,
    };
    this.completedUnits.push(result);
    this.currentStep++;
    if (!this.isSessionComplete()) this.resetUnit();
    return result;
  }

  isCurrentUnitComplete(): boolean {
    return this.cursor >= this.getCurrentTargetText().length;
  }

  getSessionSummary(): { metrics: TypingMetrics; results: UnitResult[] } {
    return { metrics: this.getLiveMetrics(), results: this.completedUnits };
  }
}

export type { RevealMode };
