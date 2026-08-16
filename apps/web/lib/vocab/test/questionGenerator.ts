import { type VocabTestQuestion, type QuestionType } from "@/models/vocab/test.types";
import { POINTS_BASE } from "./scoring";

export type WordData = {
  id: string;
  text: string;
  meanings_ko?: string[];
  meanings_en?: string[];
  synonyms?: string[];
  audio_url?: string;
};

/**
 * 시험 문제 생성
 *
 * 문제 유형:
 * - word_to_meaning (주관식): 단어 → 뜻
 * - meaning_to_word (주관식): 뜻 → 단어
 * - synonym (객관식): 동의어 선택
 * - listening (객관식): 오디오 들고 뜻 선택
 */
export async function generateTestQuestions(
  sessionId: string,
  wordIds: string[],
  wordDataMap: Map<string, WordData>,
  arrangement: "grouped" | "random"
): Promise<VocabTestQuestion[]> {
  let questionNumber = 1;
  const nextId = () => `q-${sessionId}-${questionNumber++}`;

  // 1. 유형별 버킷에 각 단어의 문제를 채운다
  //    (word_to_meaning 전부, meaning_to_word 전부, synonym 전부, listening 전부)
  const byType: Record<QuestionType, VocabTestQuestion[]> = {
    word_to_meaning: [],
    meaning_to_word: [],
    synonym: [],
    listening: [],
  };

  for (const wordId of wordIds) {
    const wordData = wordDataMap.get(wordId);
    if (!wordData) continue;

    // (1) 단어 → 뜻 (주관식)
    byType.word_to_meaning.push({
      id: nextId(),
      session_id: sessionId,
      question_number: 0,
      word_id: wordId,
      word_text: wordData.text,
      question_type: "word_to_meaning",
      options: null,
      correct_answer: wordData.meanings_ko?.[0] || "",
      meaning_ko: wordData.meanings_ko || [],
      audio_url: null,
      hint_level: 0,
      student_answer: null,
      is_correct: null,
      points_earned: null,
      points_max: POINTS_BASE,
      streak_before: null,
      streak_bonus: 0,
      created_at: new Date().toISOString(),
    });

    // (2) 뜻 → 단어 (주관식)
    byType.meaning_to_word.push({
      id: nextId(),
      session_id: sessionId,
      question_number: 0,
      word_id: wordId,
      word_text: wordData.text,
      question_type: "meaning_to_word",
      options: null,
      correct_answer: wordData.text,
      meaning_ko: wordData.meanings_ko || [],
      audio_url: null,
      hint_level: 0,
      student_answer: null,
      is_correct: null,
      points_earned: null,
      points_max: POINTS_BASE,
      streak_before: null,
      streak_bonus: 0,
      created_at: new Date().toISOString(),
    });

    // (3) 동의어 (객관식) - 동의어 데이터가 있을 경우
    if (wordData.synonyms && wordData.synonyms.length > 0) {
      const options = buildMultipleChoice(
        wordData.text,
        wordData.synonyms
      );

      byType.synonym.push({
        id: nextId(),
        session_id: sessionId,
        question_number: 0,
        word_id: wordId,
        word_text: wordData.text,
        question_type: "synonym",
        options,
        correct_answer: options.find(o => o.is_correct)?.id || "",
        meaning_ko: null,
        audio_url: null,
        hint_level: 0,
        student_answer: null,
        is_correct: null,
        points_earned: null,
        points_max: POINTS_BASE,
        streak_before: null,
        streak_bonus: 0,
        created_at: new Date().toISOString(),
      });
    }

    // (4) 듣기 (객관식) - 오디오 URL이 있을 경우
    if (wordData.audio_url) {
      const meaningOptions = buildMultipleChoice(
        wordData.meanings_ko?.[0] || "",
        wordData.meanings_ko?.slice(1) || [],
        true
      );

      byType.listening.push({
        id: nextId(),
        session_id: sessionId,
        question_number: 0,
        word_id: wordId,
        word_text: wordData.text,
        question_type: "listening",
        options: meaningOptions,
        correct_answer: meaningOptions.find(o => o.is_correct)?.id || "",
        meaning_ko: null,
        audio_url: wordData.audio_url,
        hint_level: 0,
        student_answer: null,
        is_correct: null,
        points_earned: null,
        points_max: POINTS_BASE,
        streak_before: null,
        streak_bonus: 0,
        created_at: new Date().toISOString(),
      });
    }
  }

  // 2. 배열 방식에 따라 정렬
  let questions: VocabTestQuestion[];

  if (arrangement === "random") {
    // 모든 유형을 한 풀에 섞는다
    questions = [
      ...byType.word_to_meaning,
      ...byType.meaning_to_word,
      ...byType.synonym,
      ...byType.listening,
    ];
    shuffleArray(questions);
  } else {
    // grouped: 유형별 블록으로 이어붙인다 (블록 내부는 단어 순서 그대로)
    questions = [
      ...byType.word_to_meaning,
      ...byType.meaning_to_word,
      ...byType.synonym,
      ...byType.listening,
    ];
  }

  // 3. question_number 재정렬
  questions.forEach((q, idx) => {
    q.question_number = idx + 1;
  });

  return questions;
}

/**
 * 객관식 선택지 생성 (4개)
 * 정답 1개 + 오답 3개
 */
function buildMultipleChoice(
  correctAnswer: string,
  distractors: string[],
  isMeaning: boolean = false
): Array<{ id: string; text?: string; audio_url?: string; is_correct: boolean }> {
  // 오답 3개 선택 (있으면)
  const selectedDistractors = distractors.slice(0, 3);

  // 부족하면 더미 오답 추가
  while (selectedDistractors.length < 3) {
    selectedDistractors.push(`오답 ${selectedDistractors.length + 1}`);
  }

  // 4개 선택지 생성
  const choices = [
    { text: correctAnswer, is_correct: true },
    { text: selectedDistractors[0], is_correct: false },
    { text: selectedDistractors[1], is_correct: false },
    { text: selectedDistractors[2], is_correct: false },
  ];

  // 순서 섞기
  shuffleArray(choices);

  // ID 할당
  return choices.map((choice, idx) => ({
    id: `opt-${idx + 1}`,
    text: choice.text,
    is_correct: choice.is_correct,
  }));
}

/**
 * 배열 랜덤 섞기 (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * 주관식 답변 채점
 */
export function scoreShortAnswer(
  student_answer: string | null,
  correct_answer: string
): boolean {
  if (!student_answer) return false;

  // 공백 제거 및 소문자 비교
  const normalized_student = student_answer.trim().toLowerCase();
  const normalized_correct = correct_answer.trim().toLowerCase();

  return normalized_student === normalized_correct;
}

/**
 * 객관식 답변 채점
 */
export function scoreMultipleChoice(
  student_answer: string | null,
  correct_answer: string,
  options: any[]
): boolean {
  if (!student_answer) return false;

  const correctOption = options.find(o => o.is_correct);
  return student_answer === correctOption?.id;
}
