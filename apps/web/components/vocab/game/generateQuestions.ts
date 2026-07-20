import type { SessionWord } from "@/models/vocab/SessionWord";
import type { ComboQuestion, GameMode } from "./dodgematch.types";

export function generateComboQuestions(word: SessionWord, modes: GameMode[]): ComboQuestion[] {
  const questions: ComboQuestion[] = [];

  for (const mode of modes) {
    const question = generateSingleQuestion(word, mode);
    if (question) {
      questions.push(question);
    }
  }

  return questions;
}

function generateSingleQuestion(word: SessionWord, mode: GameMode): ComboQuestion | null {
  const wordText = String(word.text ?? word.lemma ?? "").trim();
  if (!wordText) return null;

  const meanings = Array.isArray(word.meanings_ko)
    ? word.meanings_ko.map((m) => String(m).trim()).filter(Boolean)
    : [];

  if (meanings.length === 0) return null;

  switch (mode) {
    case "WORD_TO_MEANING": {
      const correctAnswer = meanings[0];
      const options = shuffleArray([
        correctAnswer,
        ...generateFakeMeanings(meanings.slice(1), 2),
      ]);

      return {
        mode,
        wordId: word.id,
        question: `"${wordText}"의 뜻은?`,
        options,
        correctAnswer,
        difficulty: 1,
      };
    }

    case "MEANING_TO_WORD": {
      const correctAnswer = wordText;
      // 다른 단어들 필요 - 현재는 간단하게 생성
      const options = [correctAnswer, "support", "maintain", "require"];

      return {
        mode,
        wordId: word.id,
        question: `"${meanings[0]}"를 의미하는 단어는?`,
        options: shuffleArray(options),
        correctAnswer,
        difficulty: 2,
      };
    }

    case "PARTS_OF_SPEECH": {
      const pos = word.pos ? String(word.pos).split(",")[0].trim() : "동사";
      const posKorean = translatePOS(pos);
      const options = shuffleArray([
        posKorean,
        "명사",
        "형용사",
        "부사",
      ]).slice(0, 3);

      return {
        mode,
        wordId: word.id,
        question: `"${wordText}"의 품사는?`,
        options,
        correctAnswer: posKorean,
        difficulty: 2,
      };
    }

    case "MATCHING_WORDS": {
      // 유사한 의미의 다른 단어들
      const synonymOptions = [
        "support",
        "sustain",
        "continue",
        "preserve",
      ];

      return {
        mode,
        wordId: word.id,
        question: `"${wordText}"와 비슷한 의미의 단어는?`,
        options: shuffleArray(synonymOptions).slice(0, 3),
        correctAnswer: "support", // 임시
        difficulty: 3,
      };
    }

    case "SENTENCE_CONTEXT": {
      const correctAnswer = wordText;
      const sentences = [
        `We need to ${correctAnswer} our friendship.`,
        `Please ${correctAnswer} your balance.`,
        `They want to ${correctAnswer} the tradition.`,
      ];

      return {
        mode,
        wordId: word.id,
        question: sentences[0],
        options: shuffleArray([correctAnswer, "support", "manage", "control"]),
        correctAnswer,
        difficulty: 3,
      };
    }

    default:
      return null;
  }
}

function translatePOS(pos: string): string {
  const map: Record<string, string> = {
    n: "명사",
    v: "동사",
    a: "형용사",
    r: "부사",
    adj: "형용사",
    adv: "부사",
    verb: "동사",
    noun: "명사",
  };
  return map[pos.toLowerCase()] || pos;
}

function generateFakeMeanings(existing: string[], count: number): string[] {
  const fakes = [
    "확장하다",
    "늘리다",
    "지지하다",
    "필요하다",
    "요구하다",
    "영향을 미치다",
    "문제",
    "발행하다",
    "감소하다",
    "유지하다",
  ];

  return fakes
    .filter((f) => !existing.includes(f))
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
}

function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
