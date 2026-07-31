import { GameBase } from '../GameBase';
import { GameMechanics } from '../../_types';

interface InferenceQuestion {
  id: string;
  passage: string;
  question: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  explanation: string;
  difficulty: number;
}

export class InferenceGame extends GameBase {
  private questions: InferenceQuestion[] = [];
  private currentQuestionIndex: number = 0;
  private correctAnswersCount: number = 0;

  protected initializeMechanics(): GameMechanics {
    return {
      rules: [
        '짧은 지문을 읽고 명시되지 않은 사실을 추론하세요',
        '지문에서 직접 나오지 않는 의미를 파악하는 것이 중요합니다',
        '논리적 사고로 올바른 답을 선택하세요',
      ],
      difficultyMultiplier: this.getLevelDifficulty(this.gameState.level),
      timeLimit: this.getTimeLimitByDifficulty(20000), // 기본 20초/문제
    };
  }

  async initialize(level: number): Promise<void> {
    super.initialize(level);
    this.correctAnswersCount = 0;
    this.currentQuestionIndex = 0;
    this.questions = this.generateQuestions(level);
  }

  private generateQuestions(level: number): InferenceQuestion[] {
    const questionCount = 4 + Math.min(level, 4);

    const passages = [
      {
        text: 'Sarah had not eaten all day. When she finally got home at 6 PM, her stomach was growling loudly. She went straight to the kitchen.',
        question: 'What can we infer about Sarah\'s next action?',
        options: [
          { text: 'She will prepare food to eat', isCorrect: true },
          { text: 'She will take a nap', isCorrect: false },
          { text: 'She will call her friend', isCorrect: false },
          { text: 'She will watch television', isCorrect: false },
        ],
        explanation: 'Sarah hasn\'t eaten all day and her stomach is growling. This indicates hunger, so she would likely prepare food.',
        difficulty: 2,
      },
      {
        text: 'The meteorologist predicted heavy snow for the next three days. The city immediately began distributing salt to clear roads, and schools announced they would have remote classes.',
        question: 'What can we infer about how the city takes weather warnings seriously?',
        options: [
          { text: 'They prepare in advance for predicted severe weather', isCorrect: true },
          { text: 'They only prepare after the weather occurs', isCorrect: false },
          { text: 'They ignore meteorological predictions', isCorrect: false },
          { text: 'They wait for the snow to start before acting', isCorrect: false },
        ],
        explanation: 'The city\'s quick preparation (distributing salt, planning remote classes) shows they take meteorological warnings seriously.',
        difficulty: 3,
      },
      {
        text: 'Despite investing millions in research and development, the company\'s profits have declined for two consecutive quarters. The CEO announced a new strategic direction focusing on innovation rather than cost-cutting.',
        question: 'What can we infer about the CEO\'s approach to solving the company\'s problems?',
        options: [
          { text: 'The CEO believes the solution lies in creating new products or services', isCorrect: true },
          { text: 'The CEO thinks the company should immediately reduce expenses', isCorrect: false },
          { text: 'The CEO plans to eliminate the research department', isCorrect: false },
          { text: 'The CEO believes the market conditions are temporary', isCorrect: false },
        ],
        explanation: 'The CEO chose innovation over cost-cutting, implying they believe developing new offerings is key to recovery.',
        difficulty: 4,
      },
      {
        text: 'A study found that students who used handwritten notes performed better on conceptual questions, while those who used laptops scored higher on factual recall questions.',
        question: 'What does this research imply about the relationship between note-taking method and learning type?',
        options: [
          { text: 'Different note-taking methods may be better suited for different types of learning', isCorrect: true },
          { text: 'Handwritten notes are superior to all other methods', isCorrect: false },
          { text: 'Laptop note-taking is completely ineffective', isCorrect: false },
          { text: 'Note-taking method has no impact on performance', isCorrect: false },
        ],
        explanation: 'The differential performance between note-taking methods suggests they affect different aspects of learning differently.',
        difficulty: 4,
      },
      {
        text: 'The ancient city was built at the convergence of three rivers. Archaeological evidence shows massive stone structures designed to manage water flow. Nearby, researchers found advanced drainage systems and agricultural tools.',
        question: 'What can we infer about this ancient civilization\'s priorities and capabilities?',
        options: [
          { text: 'They were technologically advanced and valued both water management and agriculture', isCorrect: true },
          { text: 'They lived in constant fear of floods', isCorrect: false },
          { text: 'They had no knowledge of engineering', isCorrect: false },
          { text: 'They relied solely on trading for survival', isCorrect: false },
        ],
        explanation: 'The sophisticated water management systems and agricultural tools indicate advanced technology and focus on civilization development.',
        difficulty: 5,
      },
    ];

    const selectedPassages = passages.filter(
      p => p.difficulty <= Math.min(level + 1, 5)
    );

    return selectedPassages.slice(0, questionCount).map((p, i) => ({
      ...p,
      id: `inference-${level}-${i}`,
      options: this.shuffleOptions(p.options),
    }));
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
    const basePoints = 15 * currentQuestion.difficulty;
    const difficultyBonus = Math.floor(basePoints * this.mechanics.difficultyMultiplier);

    this.updateScore(difficultyBonus);
  }

  getCurrentQuestion(): InferenceQuestion | null {
    return this.questions[this.currentQuestionIndex] || null;
  }

  getCurrentPassage(): string {
    const q = this.getCurrentQuestion();
    return q ? q.passage : '';
  }

  getRemainingCount(): number {
    return this.questions.length - this.currentQuestionIndex;
  }

  getAccuracy(): number {
    if (this.gameAnswers.length === 0) return 0;
    const correct = this.gameAnswers.filter(a => a.correct).length;
    return Math.round((correct / this.gameAnswers.length) * 100);
  }

  getExplanation(): string {
    const currentQuestion = this.questions[this.currentQuestionIndex - 1];
    return currentQuestion ? currentQuestion.explanation : '';
  }

  async completeLevel(): Promise<void> {
    const finalScore = this.correctAnswersCount * 20 + this.rewardSystem.points;
    await this.complete(finalScore);
  }
}
