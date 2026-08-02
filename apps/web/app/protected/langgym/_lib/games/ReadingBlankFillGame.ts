import { GameBase } from '../GameBase';
import { GameMechanics } from '../../_types';

interface BlankWord {
  id: string;
  word: string;
  prefix: string;
  blank: string;
}

interface Sentence {
  id: string;
  original: string;
  blankWords: BlankWord[];
  parts: Array<{ text: string; blankWord?: BlankWord }>;
}

export class ReadingBlankFillGame extends GameBase {
  private passages: Array<{ id: string; text: string; title: string }> = [];
  private currentPassageIndex: number = 0;
  private sentences: Sentence[] = [];
  private currentSentenceIndex: number = 0;
  private correctAnswersCount: number = 0;

  protected initializeMechanics(): GameMechanics {
    return {
      rules: [
        '지문의 단어 일부가 빈칸으로 표시됩니다',
        '빈 부분을 완성해 단어를 채워주세요',
        '정답 판정은 대소문자를 구분하지 않습니다',
      ],
      difficultyMultiplier: this.getLevelDifficulty(this.gameState.level),
      timeLimit: this.getTimeLimitByDifficulty(30000),
    };
  }

  async initialize(level: number): Promise<void> {
    super.initialize(level);
    this.correctAnswersCount = 0;
    this.currentPassageIndex = 0;
    this.currentSentenceIndex = 0;
    this.passages = this.generatePassages(level);
    this.loadPassage(0);
  }

  private generatePassages(level: number): Array<{ id: string; text: string; title: string }> {
    const passages = [
      {
        id: 'passage-1',
        title: 'Technology and Society',
        text: 'The evolution of technology has fundamentally transformed how we communicate, work, and learn. The internet, which emerged from military and academic research in the 1970s, has become an indispensable tool for billions of people worldwide. Social media platforms have revolutionized personal connections, enabling individuals to share experiences instantaneously across continents.',
      },
      {
        id: 'passage-2',
        title: 'Environmental Conservation',
        text: 'Climate change represents one of the most pressing challenges of our time. Rising global temperatures have contributed to melting polar ice caps, rising sea levels, and increasingly severe weather patterns. Scientists worldwide are working collaboratively to develop sustainable solutions and reduce carbon emissions.',
      },
      {
        id: 'passage-3',
        title: 'Human Psychology',
        text: 'Emotional intelligence plays a crucial role in personal and professional success. Individuals with high emotional intelligence demonstrate greater self-awareness, empathy, and interpersonal skills. Research suggests that emotional intelligence can be developed and improved through practice and self-reflection.',
      },
    ];

    return passages.slice(0, level + 1);
  }

  private loadPassage(passageIndex: number): void {
    const passage = this.passages[passageIndex];
    if (!passage) return;

    this.sentences = this.createSentencesWithBlanks(passage.text, 2);
  }

  private createSentencesWithBlanks(text: string, wordsPerSentence: number): Sentence[] {
    const sentenceTexts = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);

    return sentenceTexts.map((sentenceText, idx) =>
      this.createSentenceWithBlanks(sentenceText, idx, wordsPerSentence)
    );
  }

  private createSentenceWithBlanks(sentenceText: string, idx: number, wordsPerSentence: number): Sentence {
    const words = sentenceText
      .replace(/[,;:—-]+/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 5 && /^[a-z]+$/i.test(w));

    const unique = Array.from(new Set(words));
    const selectedWords = unique.sort(() => Math.random() - 0.5).slice(0, wordsPerSentence);

    const blankWordMap = new Map<string, BlankWord>();
    selectedWords.forEach(word => {
      const lowerWord = word.toLowerCase();
      const splitPoint = Math.max(1, Math.ceil(lowerWord.length * 0.7));
      blankWordMap.set(lowerWord, {
        id: `${idx}-${lowerWord}`,
        word: lowerWord,
        prefix: lowerWord.substring(0, splitPoint),
        blank: lowerWord.substring(splitPoint),
      });
    });

    const tokens = sentenceText.split(/\s+/);
    const parts: Sentence['parts'] = [];

    tokens.forEach(token => {
      const cleanToken = token.replace(/[,;:—-]+/g, '');
      const blankWord = blankWordMap.get(cleanToken.toLowerCase());

      if (blankWord) {
        parts.push({ text: '', blankWord });
        parts.push({ text: ' ' });
      } else {
        parts.push({ text: token + ' ' });
      }
    });

    return {
      id: `sentence-${idx}`,
      original: sentenceText,
      blankWords: Array.from(blankWordMap.values()),
      parts,
    };
  }

  protected async checkAnswer(answer: string, question: string): Promise<boolean> {
    const currentSentence = this.sentences[this.currentSentenceIndex];
    if (!currentSentence) return false;

    const blankWord = currentSentence.blankWords.find(bw => bw.id === question);
    if (!blankWord) return false;

    const isCorrect = answer.toLowerCase().trim() === blankWord.blank.toLowerCase().trim();

    if (isCorrect) {
      this.correctAnswersCount++;
    }

    return isCorrect;
  }

  protected calculatePoints(): void {
    const basePoints = 20;
    const difficultyBonus = Math.floor(basePoints * this.mechanics.difficultyMultiplier);
    this.updateScore(difficultyBonus);
  }

  getCurrentSentence(): Sentence | null {
    return this.sentences[this.currentSentenceIndex] || null;
  }

  getCurrentPassage(): { id: string; text: string; title: string } | null {
    return this.passages[this.currentPassageIndex] || null;
  }

  getProgress(): { current: number; total: number } {
    return {
      current: this.currentSentenceIndex + 1,
      total: this.sentences.length,
    };
  }

  getAccuracy(): number {
    if (this.gameAnswers.length === 0) return 0;
    const correct = this.gameAnswers.filter(a => a.correct).length;
    return Math.round((correct / this.gameAnswers.length) * 100);
  }

  nextSentence(): boolean {
    if (this.currentSentenceIndex < this.sentences.length - 1) {
      this.currentSentenceIndex++;
      return true;
    }

    if (this.currentPassageIndex < this.passages.length - 1) {
      this.currentPassageIndex++;
      this.currentSentenceIndex = 0;
      this.loadPassage(this.currentPassageIndex);
      return true;
    }

    return false;
  }

  async completeLevel(): Promise<void> {
    const finalScore = this.correctAnswersCount * 25 + this.rewardSystem.points;
    await this.complete(finalScore);
  }
}
