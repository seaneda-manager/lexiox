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
 * - word_to_meaning: 단어 → 뜻. 뜻이 1개면 주관식, 2개 이상(다의어)이면 객관식
 *   (자유 입력으로는 정답이 여러 개라 정확히 맞추기 어렵고 패러프레이즈도 판정 불가하므로)
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

  // 매 시험마다 단어 순서를 섞는다 (grouped여도 블록 내부 단어 순서는 매번 달라야 함)
  const shuffledWordIds = [...wordIds];
  shuffleArray(shuffledWordIds);

  // 다의어 객관식용 오답 풀: 이 시험에 포함된 모든 단어의 뜻을 (단어ID, 품사군)과 함께 모아둔다
  const meaningPool: Array<{ wordId: string; text: string; posClass: PosClass }> = [];
  for (const wordId of shuffledWordIds) {
    const wordData = wordDataMap.get(wordId);
    for (const m of wordData?.meanings_ko || []) {
      meaningPool.push({ wordId, text: m, posClass: guessPosClass(m) });
    }
  }

  for (const wordId of shuffledWordIds) {
    const wordData = wordDataMap.get(wordId);
    if (!wordData) continue;

    // (1) 단어 → 뜻
    const meanings = wordData.meanings_ko || [];
    if (meanings.length >= 2) {
      // 다의어: 객관식. 오답은 같은 품사군(어미 패턴)의 다른 단어 뜻에서만 뽑는다
      const correctMeaning = meanings[0];
      const posClass = guessPosClass(correctMeaning);
      const distractorPool = meaningPool
        .filter(m => m.wordId !== wordId && m.posClass === posClass)
        .map(m => m.text);
      const distractors = sampleRandom(distractorPool, 3);
      const options = buildMultipleChoice(correctMeaning, distractors);

      byType.word_to_meaning.push({
        id: nextId(),
        session_id: sessionId,
        question_number: 0,
        word_id: wordId,
        word_text: wordData.text,
        question_type: "word_to_meaning",
        options,
        correct_answer: options.find(o => o.is_correct)?.id || "",
        meaning_ko: meanings,
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
    } else {
      // 뜻이 1개뿐: 주관식 (암기 확인)
      byType.word_to_meaning.push({
        id: nextId(),
        session_id: sessionId,
        question_number: 0,
        word_id: wordId,
        word_text: wordData.text,
        question_type: "word_to_meaning",
        options: null,
        correct_answer: meanings[0] || "",
        meaning_ko: meanings,
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
 * 뜻 문자열의 대략적인 품사군 추정 (오답 선택지가 어미만 보고 티나지 않도록 필터링하는 용도).
 * 실제 품사 태깅 데이터가 없어 어미 패턴으로만 추정하는 휴리스틱 — 완벽하지 않지만
 * "관형사형 vs 서술형 vs 명사"의 가장 눈에 띄는 차이는 걸러낸다.
 */
type PosClass = "attributive" | "predicate" | "noun";

function guessPosClass(meaning: string): PosClass {
  const m = meaning.trim();
  // 관형사형 어미 (형용사적으로 명사를 꾸미는 형태): ~한/~는/~은/~인/~된/~진/~적인/~스러운/~로운/~같은
  if (/(적인|스러운|로운|같은|하는|한|된|진|는|은|인)$/.test(m)) return "attributive";
  // 서술형 (동사/형용사 기본형): ~다로 끝남
  if (/다$/.test(m)) return "predicate";
  return "noun";
}

/**
 * 배열에서 중복 없이 n개 무작위 추출
 */
function sampleRandom<T>(pool: T[], n: number): T[] {
  const copy = [...pool];
  shuffleArray(copy);
  return copy.slice(0, n);
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
 * correct_answer가 배열이면(다의어 뜻 등) 그중 하나만 일치해도 정답 처리
 */
export function scoreShortAnswer(
  student_answer: string | null,
  correct_answer: string | string[]
): boolean {
  if (!student_answer) return false;

  // 공백 제거 및 소문자 비교
  const normalized_student = student_answer.trim().toLowerCase();
  const acceptable = Array.isArray(correct_answer) ? correct_answer : [correct_answer];

  return acceptable.some(a => normalized_student === a.trim().toLowerCase());
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
