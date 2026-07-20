import type { SessionWord } from "@/models/vocab/SessionWord";

export type AsteroidType = "regular" | "word" | "special";
export type TaskType = "word" | "meaning" | "synonym" | "collocation" | "blank";

export interface Asteroid {
  id: string;
  type: AsteroidType; // regular, word, special
  text?: string; // 운석에 표시될 텍스트
  x: number; // 0-100 (%)
  y: number; // 0-100 (%)
  velocityY: number; // 내려오는 속도
  linkedWordId?: string; // word asteroid인 경우 연결된 단어 ID
  isCorrectAnswer?: boolean; // 현재 task에 대한 정답 여부
}

export interface Task {
  id: string;
  type: TaskType;
  word: SessionWord;
  question: string; // "extend의 뜻은?" 같은 질문
  correctAnswer: string; // 정답 텍스트
  options?: string[]; // 선택지 (선택형인 경우)
}

export interface GameState {
  level: number;
  score: number;
  shield: number; // 0-100 (보호막)
  ammunition: number; // 특수탄 개수
  points: number; // 자동 업그레이드용 포인트
  asteroids: Asteroid[];
  bullets: Bullet[];
  currentTask: Task | null;
  baseVelocity: number; // 기본 속도
  speedMultiplier: number; // 속도 배수
  weapon: Weapon; // 무기 상태
  gameOver: boolean;
  playerX: number; // 플레이어 X 위치 (0-100)
}

export interface Bullet {
  id: string;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  isSpecial: boolean;
  size: number;
}

export type WeaponUpgrade =
  | "fireRate" // 발사 속도
  | "bulletSize" // 탄환 크기
  | "range" // 범위
  | "chainExplosion" // 연쇄 폭발
  | "shieldRegen" // 보호막 재생
  | "autoSpecial"; // 특수탄 자동화

export interface Weapon {
  fireRate: number; // 0-1000ms (작을수록 빠름)
  bulletSize: number; // 1.0 = 기본
  range: number; // 1.0 = 기본
  chainExplosion: boolean;
  shieldRegen: boolean;
  autoSpecial: boolean;
}

export interface GameConfig {
  initialShield: number;
  initialBaseVelocity: number;
  asteroidSpawnInterval: number; // ms
  regularAsteroidRatio: number; // 0-1: 일반 운석 비율
  maxAsteroids: number;
  pointsPerCorrectAnswer: number;
  upgradeThreshold: number; // 포인트 업그레이드 기준 (50, 100, 150...)
}
