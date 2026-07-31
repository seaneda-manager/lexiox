import { GameBase } from '../GameBase';
import { GameMechanics } from '../../_types';

interface TrainCar {
  id: string;
  text: string;
  position: number;
  speed: number;
}

interface SpeedTrainQuestion {
  id: string;
  trainCars: TrainCar[];
  question: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  difficulty: number;
  correctOrder: string[];
}

export class SentenceSpeedTrainGame extends GameBase {
  private questions: SpeedTrainQuestion[] = [];
  private currentQuestionIndex: number = 0;
  private correctAnswersCount: number = 0;
  private selectedAnswers: string[] = [];

  protected initializeMechanics(): GameMechanics {
    return {
      rules: [
        '기차가 화면을 지나갑니다',
        '객차의 단어를 읽고 기억하세요',
        '올바른 순서로 배열하세요',
      ],
      difficultyMultiplier: this.getLevelDifficulty(this.gameState.level),
      timeLimit: this.getTimeLimitByDifficulty(12000), // 기본 12초/문제
    };
  }

  async initialize(level: number): Promise<void> {
    super.initialize(level);
    this.correctAnswersCount = 0;
    this.selectedAnswers = [];
    this.currentQuestionIndex = 0;
    this.questions = this.generateQuestions(level);
  }

  private generateQuestions(level: number): SpeedTrainQuestion[] {
    const questionCount = 4 + Math.min(level, 3);

    const questionSets = [
      {
        cars: ['기차는', '어둠을', '달린다'],
        question: '올바른 순서로 배열하세요',
        difficulty: 1,
      },
      {
        cars: ['노란 우산을 쓴', '아이가', '빗속을 걸어간다'],
        question: '문맥에 맞게 배열하세요',
        difficulty: 2,
      },
      {
        cars: ['그는', '매일', '책을', '읽는다'],
        question: '올바른 순서로 배열하세요',
        difficulty: 2,
      },
      {
        cars: ['봄이', '오면', '꽃이', '핀다'],
        question: '논리적 순서로 배열하세요',
        difficulty: 2,
      },
      {
        cars: ['세상은', '변한다', '항상'],
        question: '의미 있게 배열하세요',
        difficulty: 3,
      },
      {
        cars: ['나는', '너를', '그리고', '그것을', '원한다'],
        question: '올바른 순서로 배열하세요',
        difficulty: 3,
      },
    ];

    const selected = questionSets.slice(0, Math.min(questionCount, questionSets.length));

    return selected.map((set, idx) => {
      const trainCars: TrainCar[] = set.cars.map((text, i) => ({
        id: `car-${idx}-${i}`,
        text,
        position: i,
        speed: 1 + (level * 0.2),
      }));

      const correctOrder = set.cars;
      const shuffledOptions = this.generateOptions(correctOrder);

      return {
        id: `speed-train-${level}-${idx}`,
        trainCars,
        question: set.question,
        options: shuffledOptions,
        difficulty: set.difficulty,
        correctOrder,
      };
    });
  }

  private generateOptions(
    correctOrder: string[]
  ): Array<{ text: string; isCorrect: boolean }> {
    const correctText = correctOrder.join(' · ');
    const options = [{ text: correctText, isCorrect: true }];

    // 1개 잘못된 배열
    const shuffled1 = [...correctOrder].sort(() => Math.random() - 0.5);
    options.push({ text: shuffled1.join(' · '), isCorrect: false });

    // 2개 잘못된 배열
    const shuffled2 = [...correctOrder].sort(() => Math.random() - 0.5);
    options.push({ text: shuffled2.join(' · '), isCorrect: false });

    // 3개 잘못된 배열
    const shuffled3 = [...correctOrder].reverse();
    options.push({ text: shuffled3.join(' · '), isCorrect: false });

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

    const basePoints = 10 * currentQuestion.difficulty;
    const difficultyBonus = Math.floor(basePoints * this.mechanics.difficultyMultiplier);

    this.updateScore(difficultyBonus);
  }

  getCurrentQuestion(): SpeedTrainQuestion | null {
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

  async submitAnswer(selectedOption: string): Promise<boolean> {
    const isCorrect = await this.handleAnswer(selectedOption, '');
    this.calculatePoints();
    return isCorrect;
  }

  async completeLevel(): Promise<void> {
    const finalScore = this.correctAnswersCount * 20 + this.rewardSystem.points;
    await this.complete(finalScore);
  }
}
