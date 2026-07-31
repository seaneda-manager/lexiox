import { GameBase } from '../GameBase';
import { GameMechanics } from '../../_types';

interface SprintSentence {
  id: string;
  text: string;
  keyWords: string[];
  direction: 'left' | 'right' | 'up' | 'down';
}

export class SentenceSprintsGame extends GameBase {
  private sentences: SprintSentence[] = [];
  private currentSentenceIndex: number = 0;
  private correctAnswersCount: number = 0;
  private streakCount: number = 0;

  protected initializeMechanics(): GameMechanics {
    return {
      rules: [
        '화면을 지나가는 문장을 읽으세요',
        '문장의 핵심 의미를 선택하세요',
        '제한된 시간 내에 답해야 합니다',
      ],
      difficultyMultiplier: this.getLevelDifficulty(this.gameState.level),
      timeLimit: this.getTimeLimitByDifficulty(10000), // 기본 10초
    };
  }

  async initialize(level: number): Promise<void> {
    super.initialize(level);
    this.correctAnswersCount = 0;
    this.streakCount = 0;
    this.currentSentenceIndex = 0;
    this.sentences = this.generateSentences(level);
  }

  /**
   * 난이도별 문장 생성
   * Level 1-2: 간단한 문장, 좌→우 이동
   * Level 3-4: 중간 길이, 다중 방향
   * Level 5+: 복잡한 문장, 배경 방해 요소
   */
  private generateSentences(level: number): SprintSentence[] {
    const difficulties = [
      {
        sentenceCount: 5,
        minLength: 10,
        maxLength: 30,
        directions: ['left', 'right'] as const,
      },
      {
        sentenceCount: 6,
        minLength: 20,
        maxLength: 45,
        directions: ['left', 'right', 'up'] as const,
      },
      {
        sentenceCount: 7,
        minLength: 30,
        maxLength: 60,
        directions: ['left', 'right', 'up', 'down'] as const,
      },
      {
        sentenceCount: 8,
        minLength: 40,
        maxLength: 75,
        directions: ['left', 'right', 'up', 'down'] as const,
      },
      {
        sentenceCount: 10,
        minLength: 50,
        maxLength: 100,
        directions: ['left', 'right', 'up', 'down'] as const,
      },
    ];

    const config = difficulties[Math.min(level - 1, 4)];
    const sampleSentences = [
      'The quick brown fox jumps over the lazy dog.',
      'Success is not final, failure is not fatal.',
      'Innovation distinguishes between a leader and a follower.',
      'Life is what happens when you are busy making other plans.',
      'The only way to do great work is to love what you do.',
      'Your time is limited, do not waste it living someone else\'s life.',
      'Technology is best when it brings people together.',
      'The future belongs to those who believe in the beauty of their dreams.',
      'Education is the most powerful weapon which you can use to change the world.',
      'Creativity is intelligence having fun.',
    ];

    const sentences: SprintSentence[] = [];
    for (let i = 0; i < config.sentenceCount; i++) {
      const sentence = sampleSentences[i % sampleSentences.length];
      const direction = config.directions[i % config.directions.length];
      const keyWords = this.extractKeyWords(sentence);

      sentences.push({
        id: `sprint-${level}-${i}`,
        text: sentence,
        keyWords,
        direction,
      });
    }

    return sentences;
  }

  private extractKeyWords(sentence: string): string[] {
    // 간단한 키워드 추출 (3-4단어)
    const words = sentence.split(' ').filter(w => w.length > 3);
    return words.slice(0, 3);
  }

  protected async checkAnswer(answer: string, question: string): Promise<boolean> {
    // 키워드가 포함되어 있는지 확인
    const currentSentence = this.sentences[this.currentSentenceIndex];
    if (!currentSentence) return false;

    const answerLower = answer.toLowerCase();
    const isCorrect = currentSentence.keyWords.some(kw =>
      answerLower.includes(kw.toLowerCase())
    );

    if (isCorrect) {
      this.correctAnswersCount++;
      this.streakCount++;
      this.rewardSystem.streakBonus = Math.max(
        this.rewardSystem.streakBonus,
        this.streakCount
      );
    } else {
      this.streakCount = 0;
    }

    this.currentSentenceIndex++;
    return isCorrect;
  }

  protected calculatePoints(): void {
    // 난이도 * 연속 정답 보너스
    const basePoints = 10;
    const difficultyBonus = Math.floor(basePoints * this.mechanics.difficultyMultiplier);
    const streakBonus = Math.floor(this.streakCount * 2);

    this.updateScore(difficultyBonus + streakBonus);
  }

  // 게임별 추가 메서드
  getCurrentSentence(): SprintSentence | null {
    return this.sentences[this.currentSentenceIndex] || null;
  }

  getRemainingCount(): number {
    return this.sentences.length - this.currentSentenceIndex;
  }

  getAccuracy(): number {
    if (this.gameAnswers.length === 0) return 0;
    const correct = this.gameAnswers.filter(a => a.correct).length;
    return Math.round((correct / this.gameAnswers.length) * 100);
  }

  async completeLevel(): Promise<void> {
    const finalScore = this.correctAnswersCount * 10 + this.rewardSystem.streakBonus;
    await this.complete(finalScore);
  }
}
