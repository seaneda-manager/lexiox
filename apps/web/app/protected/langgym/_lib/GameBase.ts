import { IGameBase, GameState, GameMechanics, GameFeedback, RewardSystem, GameAnswer } from '../_types';

export abstract class GameBase implements IGameBase {
  protected userId: string;
  protected gameId: string;
  protected gameAnswers: GameAnswer[] = [];
  protected startTime: number = 0;

  gameState: GameState = {
    status: 'ready',
    level: 1,
    score: 0,
    timeElapsed: 0,
  };

  mechanics: GameMechanics;
  feedback: GameFeedback = {
    isCorrect: false,
    message: '',
    animation: 'neutral',
  };

  rewardSystem: RewardSystem = {
    points: 0,
    badges: [],
    streakBonus: 0,
  };

  constructor(userId: string, gameId: string) {
    this.userId = userId;
    this.gameId = gameId;
    this.mechanics = this.initializeMechanics();
  }

  // 각 게임이 자신의 메커니즘을 정의
  protected abstract initializeMechanics(): GameMechanics;

  initialize(level: number): void {
    this.gameState.level = level;
    this.gameState.score = 0;
    this.gameState.timeElapsed = 0;
    this.gameAnswers = [];
    this.feedback = { isCorrect: false, message: '', animation: 'neutral' };
  }

  start(): void {
    this.gameState.status = 'playing';
    this.startTime = Date.now();
  }

  pause(): void {
    this.gameState.status = 'paused';
  }

  resume(): void {
    this.gameState.status = 'playing';
  }

  async complete(finalScore: number): Promise<void> {
    this.gameState.status = 'completed';
    this.gameState.score = finalScore;
    this.gameState.timeElapsed = Date.now() - this.startTime;

    // 게임 결과를 DB에 저장
    await this.saveGameResult();
  }

  fail(): void {
    this.gameState.status = 'failed';
    this.gameState.timeElapsed = Date.now() - this.startTime;
  }

  reset(): void {
    this.initialize(this.gameState.level);
    this.gameState.status = 'ready';
  }

  async handleAnswer(answer: string, question: string): Promise<boolean> {
    const isCorrect = await this.checkAnswer(answer, question);

    this.gameAnswers.push({
      question,
      answer,
      correct: isCorrect,
    });

    this.updateFeedback(isCorrect);
    if (isCorrect) {
      this.calculatePoints();
    }

    return isCorrect;
  }

  updateScore(points: number): void {
    this.gameState.score += points;
    this.rewardSystem.points += points;
  }

  getLevelDifficulty(level: number): number {
    // 난이도 배수: 1.0 ~ 2.5
    return 1.0 + (level - 1) * 0.3;
  }

  // 각 게임이 구현할 추상 메서드
  protected abstract checkAnswer(answer: string, question: string): Promise<boolean>;
  protected abstract calculatePoints(): void;

  private updateFeedback(isCorrect: boolean): void {
    this.feedback = {
      isCorrect,
      message: isCorrect ? '정답입니다! 🎉' : '다시 시도해주세요 💪',
      animation: isCorrect ? 'success' : 'fail',
    };
  }

  private async saveGameResult(): Promise<void> {
    try {
      await fetch('/api/langgym/game-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: this.userId,
          gameId: this.gameId,
          finalScore: this.gameState.score,
          level: this.gameState.level,
          answers: this.gameAnswers,
          timeSpent: this.gameState.timeElapsed,
          completedAt: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to save game result:', error);
    }
  }

  // 유틸리티: 난이도에 따른 시간 제한 계산
  protected getTimeLimitByDifficulty(baseTime: number): number {
    const difficulty = this.getLevelDifficulty(this.gameState.level);
    return Math.floor(baseTime / difficulty);
  }
}
