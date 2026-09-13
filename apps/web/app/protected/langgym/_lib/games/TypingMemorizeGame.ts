import { GameBase } from '../GameBase';
import { GameMechanics } from '../../_types';
import type { RevealMode, TypingMetrics, UnitResult } from '@/lib/typing/types';

export type TypingContentSource = 'vocab' | 'content' | 'completed';

export class TypingMemorizeGame extends GameBase {
  private unitResults: UnitResult[] = [];
  private lastUnitMetrics: TypingMetrics | null = null;

  protected initializeMechanics(): GameMechanics {
    return {
      rules: [
        '화면에 표시된 문장을 정확하게 타이핑하세요',
        'Strict 모드에서는 오타를 정정해야 다음 글자로 넘어갈 수 있습니다',
        'WPM(속도)과 정확도가 높을수록 더 많은 포인트를 획득합니다',
      ],
      difficultyMultiplier: this.getLevelDifficulty(this.gameState.level),
    };
  }

  /** Called by the Play component once a single unit (word/sentence) is fully typed. */
  async recordUnitCompletion(result: UnitResult): Promise<void> {
    this.unitResults.push(result);
    this.lastUnitMetrics = result.metrics;
    await this.handleAnswer(String(result.metrics.accuracy), result.text);
  }

  protected async checkAnswer(_answer: string, _question: string): Promise<boolean> {
    return (this.lastUnitMetrics?.accuracy ?? 0) >= 80;
  }

  protected calculatePoints(): void {
    const m = this.lastUnitMetrics;
    if (!m) return;
    const points = Math.round(((m.wpm * m.accuracy) / 10) * this.mechanics.difficultyMultiplier);
    this.updateScore(Math.max(points, 0));
  }

  getUnitResults(): UnitResult[] {
    return this.unitResults;
  }

  /** Aggregate metrics across all completed units, for the end-of-session summary. */
  getSessionMetrics(): TypingMetrics {
    const n = this.unitResults.length;
    if (n === 0) {
      return { wpm: 0, rawWpm: 0, accuracy: 0, errorCount: 0, elapsedMs: 0, weakWords: [] };
    }
    const sum = (fn: (r: UnitResult) => number) => this.unitResults.reduce((s, r) => s + fn(r), 0);
    return {
      wpm: Math.round(sum((r) => r.metrics.wpm) / n),
      rawWpm: Math.round(sum((r) => r.metrics.rawWpm) / n),
      accuracy: Math.round(sum((r) => r.metrics.accuracy) / n),
      errorCount: sum((r) => r.metrics.errorCount),
      elapsedMs: sum((r) => r.metrics.elapsedMs),
      weakWords: Array.from(new Set(this.unitResults.flatMap((r) => r.metrics.weakWords))).slice(0, 20),
    };
  }

  /** Finalizes the game (base lifecycle) and persists rich metrics to our own endpoint. */
  async completeSession(opts: {
    contentSource: TypingContentSource;
    contentId: string | null;
    contentRef?: string | null;
    revealMode: RevealMode;
    shuffled: boolean;
    strict: boolean;
  }): Promise<void> {
    const summary = this.getSessionMetrics();
    await this.complete(this.rewardSystem.points);

    try {
      await fetch('/api/typing-practice/attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: opts.contentId,
          contentRef: opts.contentRef ?? null,
          contentSource: opts.contentSource,
          revealMode: opts.revealMode,
          shuffled: opts.shuffled,
          strict: opts.strict,
          wpm: summary.wpm,
          accuracy: summary.accuracy,
          errorCount: summary.errorCount,
          durationSec: Math.round(summary.elapsedMs / 1000),
          weakWords: summary.weakWords,
        }),
      });
    } catch (error) {
      console.error('Failed to save typing practice attempt:', error);
    }
  }
}
