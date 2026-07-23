// 동의어 게임 - Practice Gamification
// word_synonyms 테이블 기반

import type { VocabWordCore } from "@/models/vocab";

export interface WordWithSynonyms extends VocabWordCore {
  synonyms?: VocabWordCore[]; // tier 1 동의어만
}

export interface SynonymGameQuestion {
  id: string;
  targetWord: WordWithSynonyms;
  correctAnswer: WordWithSynonyms;
  options: WordWithSynonyms[]; // 4개 (정답 1 + 오답 3)
  difficulty: "easy" | "medium" | "hard";
}

export interface SynonymGameStats {
  correct: number;
  incorrect: number;
  streak: number;
  maxStreak: number;
  points: number;
  level: number;
}

export interface SynonymGameResult {
  questionId: string;
  targetWord: string;
  selectedWord: string;
  correct: boolean;
  pointsGained: number;
}

/**
 * 동의어 검증 (word_synonyms 기반)
 *
 * 정답 조건:
 * 1. targetWord.synonyms에 포함되어 있음 (tier 1)
 * 2. targetWord와 다름
 */
export function isValidSynonym(
  targetWord: WordWithSynonyms,
  candidate: WordWithSynonyms
): boolean {
  if (targetWord.id === candidate.id) return false;

  // synonyms 배열에 포함되어 있으면 정답
  return (targetWord.synonyms ?? []).some(s => s.id === candidate.id);
}

/**
 * 오답 검증 - 같은 품사이지만 동의어가 아님
 * (품사 정보 없으면 체크 스킵)
 */
export function isValidWrongAnswer(
  targetWord: WordWithSynonyms,
  candidate: WordWithSynonyms
): boolean {
  if (targetWord.id === candidate.id) return false;

  // 품사 매칭 (둘 다 품사 정보 있을 때만)
  if (targetWord.pos && candidate.pos && targetWord.pos !== candidate.pos) {
    return false;
  }

  // 동의어가 아니어야 함
  return !isValidSynonym(targetWord, candidate);
}

/**
 * 동의어 게임 질문 생성
 *
 * 정답: word_synonyms 테이블의 tier 1 동의어
 * 오답: 같은 품사 + 동의어 아님
 */
export function generateSynonymQuestion(
  targetWord: WordWithSynonyms,
  allWords: WordWithSynonyms[]
): SynonymGameQuestion | null {
  // 정답 후보 (tier 1 동의어)
  if (!targetWord || !targetWord.synonyms || targetWord.synonyms.length === 0) {
    console.warn(`No synonym candidates for word: ${targetWord?.text ?? 'unknown'}`);
    return null;
  }

  const correctCandidates = targetWord.synonyms;

  // 정답 선택
  const correctAnswer = correctCandidates[
    Math.floor(Math.random() * correctCandidates.length)
  ];

  // 오답 3개 선택 (같은 품사 + 동의어 아님)
  const wrongCandidates = allWords.filter(w =>
    isValidWrongAnswer(targetWord, w)
  );

  if (wrongCandidates.length < 3) {
    console.warn(
      `Not enough wrong candidates for word: ${targetWord.text} (need 3, found ${wrongCandidates.length})`
    );
    return null;
  }

  // 오답 3개 random select
  const selectedWrong = wrongCandidates
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // 보기 섞기
  const options = [correctAnswer, ...selectedWrong]
    .sort(() => Math.random() - 0.5);

  // 난이도 결정
  const difficulty = getDifficulty(targetWord);

  return {
    id: `${targetWord.id}_syn_${Date.now()}`,
    targetWord,
    correctAnswer,
    options,
    difficulty,
  };
}

/**
 * 단어 난이도 결정
 */
function getDifficulty(word: VocabWordCore): "easy" | "medium" | "hard" {
  const difficulty = word.difficulty ?? 5;
  if (difficulty <= 3) return "easy";
  if (difficulty <= 7) return "medium";
  return "hard";
}

/**
 * 포인트 계산
 */
export function calculatePoints(
  correct: boolean,
  difficulty: "easy" | "medium" | "hard",
  streak: number
): number {
  const basePoints = {
    easy: 10,
    medium: 20,
    hard: 30,
  };

  const streakMultiplier = Math.min(1 + streak * 0.1, 2); // 최대 2배
  return Math.floor(basePoints[difficulty] * streakMultiplier);
}

/**
 * 레벨 계산
 */
export function calculateLevel(points: number): number {
  return Math.floor(points / 100) + 1;
}

/**
 * 결과 업데이트
 */
export function updateGameStats(
  stats: SynonymGameStats,
  result: SynonymGameResult
): SynonymGameStats {
  const newStats = { ...stats };

  if (result.correct) {
    newStats.correct++;
    newStats.streak++;
    newStats.maxStreak = Math.max(newStats.streak, newStats.maxStreak);
  } else {
    newStats.incorrect++;
    newStats.streak = 0;
  }

  newStats.points += result.pointsGained;
  newStats.level = calculateLevel(newStats.points);

  return newStats;
}
