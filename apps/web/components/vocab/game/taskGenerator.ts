import type { SessionWord } from "@/models/vocab/SessionWord";
import type { Task, TaskType } from "./asteroid.types";

const TASK_TYPES: TaskType[] = ["word", "meaning", "synonym", "collocation", "blank"];

export function generateTask(word: SessionWord, taskTypeIndex: number): Task | null {
  const taskType = TASK_TYPES[taskTypeIndex % TASK_TYPES.length];

  switch (taskType) {
    case "word":
      return generateWordTask(word);
    case "meaning":
      return generateMeaningTask(word);
    case "synonym":
      return generateSynonymTask(word);
    case "collocation":
      return generateCollocationTask(word);
    case "blank":
      return generateBlankTask(word);
    default:
      return null;
  }
}

function generateWordTask(word: SessionWord): Task | null {
  const text = word.text ?? word.lemma;
  if (!text) return null;

  const meanings = word.meanings_ko ?? [];
  const meaningText = meanings[0] ? `"${meanings[0]}"` : "";

  return {
    id: `${word.id}-word-${Date.now()}`,
    type: "word",
    word,
    question: meaningText ? `다음 뜻을 가진 단어는?` : "다음 단어를 찾으세요",
    correctAnswer: text,
    options: [text, "continue", "support", "maintain"].sort(() => Math.random() - 0.5),
  };
}

function generateMeaningTask(word: SessionWord): Task | null {
  const meanings = word.meanings_ko ?? [];
  if (meanings.length === 0) return null;

  const correctMeaning = meanings[0];
  const text = word.text ?? word.lemma ?? "";

  return {
    id: `${word.id}-meaning-${Date.now()}`,
    type: "meaning",
    word,
    question: `"${text}"의 뜻은?`,
    correctAnswer: correctMeaning,
    options: [
      correctMeaning,
      meanings[1] || "다른 뜻",
      meanings[2] || "또 다른 뜻",
      "모르겠음",
    ].sort(() => Math.random() - 0.5),
  };
}

function generateSynonymTask(word: SessionWord): Task | null {
  const synonyms = word.synonyms_en_simple ?? [];
  if (synonyms.length === 0) return null;

  const correctSynonym = synonyms[0];
  const text = word.text ?? word.lemma ?? "";

  return {
    id: `${word.id}-synonym-${Date.now()}`,
    type: "synonym",
    word,
    question: `"${text}"의 동의어는?`,
    correctAnswer: correctSynonym,
    options: [correctSynonym, synonyms[1] || "other", "different", "word"].sort(
      () => Math.random() - 0.5,
    ),
  };
}

function generateCollocationTask(word: SessionWord): Task | null {
  const collocations = word.collocations ?? [];
  if (collocations.length === 0) return null;

  const correctCollocation = collocations[0];

  return {
    id: `${word.id}-collocation-${Date.now()}`,
    type: "collocation",
    word,
    question: `"${correctCollocation}" 연어를 완성하세요`,
    correctAnswer: word.text ?? word.lemma ?? "",
  };
}

function generateBlankTask(word: SessionWord): Task | null {
  const text = word.text ?? word.lemma;
  if (!text) return null;

  const meanings = word.meanings_ko ?? [];
  const meaningText = meanings[0] ? `"${meanings[0]}"` : "이 단어로";

  return {
    id: `${word.id}-blank-${Date.now()}`,
    type: "blank",
    word,
    question: `_____ ${meaningText}`,
    correctAnswer: text,
    options: [text, "continue", "support", "maintain"].sort(() => Math.random() - 0.5),
  };
}

export function getNextTaskTypeIndex(currentIndex: number): number {
  return currentIndex + 1;
}
