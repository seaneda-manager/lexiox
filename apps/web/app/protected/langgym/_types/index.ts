// 게임 상태
export type GameStatus = 'playing' | 'paused' | 'completed' | 'failed' | 'ready';
export type FeedbackAnimation = 'success' | 'fail' | 'neutral';
export type GameType = 'sentence_sprints' | 'archery' | 'inference';

// 게임 세션 정보
export interface GameState {
  status: GameStatus;
  level: number;
  score: number;
  timeElapsed: number;
  maxTime?: number;
}

// 게임 메커니즘
export interface GameMechanics {
  rules: string[];
  difficultyMultiplier: number;
  timeLimit?: number;
}

// 실시간 피드백
export interface GameFeedback {
  isCorrect: boolean;
  message: string;
  animation: FeedbackAnimation;
}

// 학습 데이터 기록
export interface GameAnswer {
  question: string;
  answer: string;
  correct: boolean;
}

export interface ProgressTracking {
  userId: string;
  gameId: string;
  gameType: GameType;
  completedAt: string;
  finalScore: number;
  level: number;
  answers: GameAnswer[];
  timeSpent: number; // milliseconds
}

// 보상 시스템
export interface RewardSystem {
  points: number;
  badges: string[];
  streakBonus: number;
}

// 게임 베이스 인터페이스 (모든 게임이 구현해야 함)
export interface IGameBase {
  gameState: GameState;
  mechanics: GameMechanics;
  feedback: GameFeedback;
  rewardSystem: RewardSystem;

  // 게임 라이프사이클
  initialize(level: number): void;
  start(): void;
  pause(): void;
  resume(): void;
  complete(finalScore: number): Promise<void>;
  fail(): void;
  reset(): void;

  // 게임 로직
  handleAnswer(answer: string, question: string): Promise<boolean>;
  updateScore(points: number): void;
  getLevelDifficulty(level: number): number;
}

// 게임 결과 저장 구조
export interface GameResult {
  id: string;
  userId: string;
  gameType: GameType;
  gameSessionId: string;
  levelReached: number;
  finalScore: number;
  totalTime: number; // milliseconds
  answers: GameAnswer[];
  completedAt: string;
  badges?: string[];
  streakBonus?: number;
}

// 게임 세션 (DB 모델)
export interface GameSession {
  id: string;
  userId: string;
  gameType: GameType;
  startedAt: string;
  completedAt?: string;
  finalScore: number;
  level: number;
  status: 'completed' | 'abandoned' | 'in_progress';
}

// 게임 허브 페이지에 표시될 게임 메타데이터
export interface GameMetadata {
  id: GameType;
  title: string;
  description: string;
  emoji: string;
  phase: 1 | 2 | 3;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedDuration: number; // minutes
  featured: boolean;
}
