import { GameBase } from '../GameBase';
import { GameMechanics } from '../../_types';

interface ArcheryQuestion {
  id: string;
  word: string;
  definition: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  difficulty: number;
}

export class ArcheryGame extends GameBase {
  private questions: ArcheryQuestion[] = [];
  private currentQuestionIndex: number = 0;
  private correctAnswersCount: number = 0;

  protected initializeMechanics(): GameMechanics {
    return {
      rules: [
        '과녁(단어)에 활을 쏘아 정의를 맞추세요',
        '4개의 선택지 중 올바른 답을 선택하세요',
        '높은 난이도일수록 더 많은 포인트를 획득합니다',
      ],
      difficultyMultiplier: this.getLevelDifficulty(this.gameState.level),
      timeLimit: this.getTimeLimitByDifficulty(15000), // 기본 15초/문제
    };
  }

  async initialize(level: number): Promise<void> {
    super.initialize(level);
    this.correctAnswersCount = 0;
    this.currentQuestionIndex = 0;
    this.questions = this.generateQuestions(level);
  }

  private generateQuestions(level: number): ArcheryQuestion[] {
    const questionCount = 5 + Math.min(level, 5);

    const vocabPool = [
      {
        word: 'pragmatic',
        definition: '실용적인, 현실적인',
        difficulty: 3,
      },
      {
        word: 'ambiguous',
        definition: '애매한, 불분명한',
        difficulty: 3,
      },
      {
        word: 'eloquent',
        definition: '웅변적인, 표현력 있는',
        difficulty: 4,
      },
      {
        word: 'meticulous',
        definition: '세심한, 꼼꼼한',
        difficulty: 4,
      },
      {
        word: 'benevolent',
        definition: '자선적인, 친절한',
        difficulty: 3,
      },
      {
        word: 'ubiquitous',
        definition: '어디에나 있는, 널리 퍼진',
        difficulty: 5,
      },
      {
        word: 'ephemeral',
        definition: '일시적인, 수명이 짧은',
        difficulty: 4,
      },
      {
        word: 'pungent',
        definition: '강한 냄새나 맛의, 신랄한',
        difficulty: 3,
      },
      {
        word: 'lucid',
        definition: '명확한, 이해하기 쉬운',
        difficulty: 3,
      },
      {
        word: 'ornate',
        definition: '화려하게 장식한, 화려한',
        difficulty: 3,
      },
    ];

    // 난이도에 맞는 문제 선택
    const selectedVocab = vocabPool.filter(
      v => v.difficulty <= Math.min(level + 2, 5)
    );

    const questions: ArcheryQuestion[] = [];
    for (let i = 0; i < Math.min(questionCount, selectedVocab.length); i++) {
      const vocab = selectedVocab[i];
      const distractors = this.generateDistractors(vocab, selectedVocab);

      questions.push({
        id: `archery-${level}-${i}`,
        word: vocab.word,
        definition: vocab.definition,
        options: this.shuffleOptions([
          { text: vocab.definition, isCorrect: true },
          ...distractors,
        ]),
        difficulty: vocab.difficulty,
      });
    }

    return questions;
  }

  private generateDistractors(
    target: { word: string; definition: string },
    vocabPool: typeof vocabPool
  ) {
    // 다른 정의들을 방해 선택지로 사용
    return vocabPool
      .filter(v => v.word !== target.word)
      .slice(0, 3)
      .map(v => ({ text: v.definition, isCorrect: false }));
  }

  private shuffleOptions(options: Array<{ text: string; isCorrect: boolean }>) {
    return options.sort(() => Math.random() - 0.5);
  }

  protected async checkAnswer(answer: string, question: string): Promise<boolean> {
    const currentQuestion = this.questions[this.currentQuestionIndex];
    if (!currentQuestion) return false;

    const isCorrect = currentQuestion.options.some(
      opt => opt.text === answer && opt.isCorrect
    );

    if (isCorrect) {
      this.correctAnswersCount++;
    }

    this.currentQuestionIndex++;
    return isCorrect;
  }

  protected calculatePoints(): void {
    const currentQuestion = this.questions[this.currentQuestionIndex - 1];
    if (!currentQuestion) return;

    // 난이도에 따른 포인트
    const basePoints = 10 * currentQuestion.difficulty;
    const difficultyBonus = Math.floor(basePoints * this.mechanics.difficultyMultiplier);

    this.updateScore(difficultyBonus);
  }

  getCurrentQuestion(): ArcheryQuestion | null {
    return this.questions[this.currentQuestionIndex] || null;
  }

  getRemainingCount(): number {
    return this.questions.length - this.currentQuestionIndex;
  }

  getAccuracy(): number {
    if (this.gameAnswers.length === 0) return 0;
    const correct = this.gameAnswers.filter(a => a.correct).length;
    return Math.round((correct / this.gameAnswers.length) * 100);
  }

  async completeLevel(): Promise<void> {
    const finalScore = this.correctAnswersCount * 15 + this.rewardSystem.points;
    await this.complete(finalScore);
  }
}
