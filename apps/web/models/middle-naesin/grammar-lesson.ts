// 중학내신 문법 레슨: 설명 → 설명 쓰기 깜지 → 빈칸 → Drill(빈칸/틀린 곳 고치기+이유) → 문제
// grammar_point 콘텐츠의 extra_data.lesson 에 저장한다. status 가 'final' 일 때만 학생에게 보인다.

export const GRAMMAR_LESSON_LEVELS = ['basic', 'intermediate', 'advanced'] as const;
export type GrammarLessonLevel = (typeof GRAMMAR_LESSON_LEVELS)[number];

export const GRAMMAR_LEVEL_LABEL: Record<GrammarLessonLevel, string> = {
  basic: '초급',
  intermediate: '중급',
  advanced: '고급',
};

export const GRAMMAR_QUESTION_KINDS = ['count_wrong', 'pick_correct', 'pick_different', 'reason'] as const;
export type GrammarQuestionKind = (typeof GRAMMAR_QUESTION_KINDS)[number];

export const GRAMMAR_QUESTION_KIND_LABEL: Record<GrammarQuestionKind, string> = {
  count_wrong: '틀린 문장 개수',
  pick_correct: '맞는 문장 고르기',
  pick_different: '보기와 다른 것',
  reason: '이유 고르기',
};

export type GrammarLessonStatus = 'draft' | 'final';

export type GrammarLessonBilingual = { en: string; ko: string };

export type GrammarLessonBlank = {
  text: string; // '___' 한 곳이 빈칸
  answer: string;
  hint?: string;
};

export type GrammarLessonFill = {
  level: GrammarLessonLevel;
  sentence: string; // '___' 한 곳이 빈칸
  answer: string;
  choices?: string[]; // 있으면 보기 중 선택, 없으면 직접 입력
  ko?: string;
  noteKo?: string;
  hint?: string;
};

export type GrammarLessonFix = {
  level: GrammarLessonLevel;
  sentence: string; // 틀린 단어가 정확히 한 개 들어 있는 문장
  wrong: string; // 틀린 단어(문장 속 한 토큰)
  correct: string[]; // 허용되는 고친 답. '' 는 "삭제"가 정답
  reasonChoices: string[];
  reasonIndex: number;
  ko?: string;
};

export type GrammarLessonQuestion = {
  level: GrammarLessonLevel;
  kind: GrammarQuestionKind;
  stem: string; // 영어 문제 (여러 줄 가능)
  stemKo?: string;
  choices: { en: string; ko?: string }[]; // 보기와 그 해석
  answerIndex: number;
  explanationKo: string;
};

export type GrammarLesson = {
  version: 1;
  status: GrammarLessonStatus;
  topic: string;
  explanation: {
    titleKo: string;
    summaryEn: string;
    summaryKo: string;
    rules: GrammarLessonBilingual[];
    examples: GrammarLessonBilingual[];
  };
  cramText: string;
  blanks: GrammarLessonBlank[];
  drillFill: GrammarLessonFill[];
  drillFix: GrammarLessonFix[];
  questions: GrammarLessonQuestion[];
  reviewNote?: string;
  finalizedAt?: string;
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isLevel = (v: unknown): v is GrammarLessonLevel => (GRAMMAR_LESSON_LEVELS as readonly string[]).includes(v as string);
const isKind = (v: unknown): v is GrammarQuestionKind => (GRAMMAR_QUESTION_KINDS as readonly string[]).includes(v as string);

const normToken = (s: string) => s.toLowerCase().replace(/['’‘]/g, '').replace(/[^a-z0-9]+/g, '');

export function findWrongTokenIndex(sentence: string, wrong: string): number {
  const target = normToken(wrong);
  return sentence.split(/\s+/).findIndex((t) => normToken(t) === target);
}

// 관리자가 JSON 으로 저장할 때와 학생 화면에서 읽을 때 같은 규칙으로 검증한다.
export function validateGrammarLesson(
  raw: unknown,
): { ok: true; lesson: GrammarLesson } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!isObj(raw)) return { ok: false, errors: ['lesson 이 객체가 아닙니다.'] };

  const status = raw.status === 'final' ? 'final' : 'draft';
  if (!isStr(raw.topic) || !raw.topic.trim()) errors.push('topic 이 비어 있습니다.');

  const ex = raw.explanation;
  if (!isObj(ex) || !isStr(ex.titleKo) || !isStr(ex.summaryEn) || !isStr(ex.summaryKo)) {
    errors.push('explanation(titleKo/summaryEn/summaryKo) 이 올바르지 않습니다.');
  }
  const bilingual = (arr: unknown, label: string) => {
    if (!Array.isArray(arr)) {
      errors.push(`${label} 가 배열이 아닙니다.`);
      return;
    }
    arr.forEach((r, i) => {
      if (!isObj(r) || !isStr(r.en) || !isStr(r.ko)) errors.push(`${label}[${i + 1}] 에 en/ko 가 필요합니다.`);
    });
  };
  if (isObj(ex)) {
    bilingual(ex.rules, 'explanation.rules');
    bilingual(ex.examples, 'explanation.examples');
  }

  if (!isStr(raw.cramText) || !raw.cramText.trim()) errors.push('cramText 가 비어 있습니다.');

  const arr = (v: unknown, label: string): unknown[] => {
    if (!Array.isArray(v)) {
      errors.push(`${label} 가 배열이 아닙니다.`);
      return [];
    }
    return v;
  };

  arr(raw.blanks, 'blanks').forEach((b, i) => {
    if (!isObj(b) || !isStr(b.text) || !b.text.includes('___') || !isStr(b.answer) || !b.answer.trim()) {
      errors.push(`blanks[${i + 1}] 에는 '___' 가 들어 있는 text 와 answer 가 필요합니다.`);
    }
  });

  arr(raw.drillFill, 'drillFill').forEach((f, i) => {
    if (!isObj(f) || !isLevel(f.level) || !isStr(f.sentence) || !f.sentence.includes('___') || !isStr(f.answer)) {
      errors.push(`drillFill[${i + 1}] 에는 level, '___' 가 들어 있는 sentence, answer 가 필요합니다.`);
      return;
    }
    if (f.choices !== undefined) {
      if (!Array.isArray(f.choices) || !f.choices.every(isStr) || !f.choices.includes(f.answer as string)) {
        errors.push(`drillFill[${i + 1}] choices 에 answer 가 포함돼야 합니다.`);
      }
    }
  });

  arr(raw.drillFix, 'drillFix').forEach((f, i) => {
    if (
      !isObj(f) ||
      !isLevel(f.level) ||
      !isStr(f.sentence) ||
      !isStr(f.wrong) ||
      !Array.isArray(f.correct) ||
      f.correct.length === 0 ||
      !f.correct.every(isStr) ||
      !Array.isArray(f.reasonChoices) ||
      f.reasonChoices.length < 2 ||
      !f.reasonChoices.every(isStr) ||
      typeof f.reasonIndex !== 'number' ||
      f.reasonIndex < 0 ||
      f.reasonIndex >= f.reasonChoices.length
    ) {
      errors.push(`drillFix[${i + 1}] 형식이 올바르지 않습니다. (level/sentence/wrong/correct[]/reasonChoices/reasonIndex)`);
      return;
    }
    if (findWrongTokenIndex(f.sentence, f.wrong) < 0) {
      errors.push(`drillFix[${i + 1}] wrong "${f.wrong}" 이(가) 문장 안에 없습니다.`);
    }
  });

  arr(raw.questions, 'questions').forEach((q, i) => {
    if (
      !isObj(q) ||
      !isLevel(q.level) ||
      !isKind(q.kind) ||
      !isStr(q.stem) ||
      !Array.isArray(q.choices) ||
      q.choices.length < 2 ||
      !q.choices.every((c) => isObj(c) && isStr(c.en)) ||
      typeof q.answerIndex !== 'number' ||
      q.answerIndex < 0 ||
      q.answerIndex >= q.choices.length ||
      !isStr(q.explanationKo)
    ) {
      errors.push(`questions[${i + 1}] 형식이 올바르지 않습니다. (level/kind/stem/choices[]/answerIndex/explanationKo)`);
    }
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, lesson: { ...(raw as unknown as GrammarLesson), version: 1, status } };
}

export function parseGrammarLesson(extraData: unknown): GrammarLesson | null {
  const raw = (extraData as { lesson?: unknown } | null)?.lesson;
  if (!raw) return null;
  const res = validateGrammarLesson(raw);
  return res.ok ? res.lesson : null;
}

export function lessonCounts(lesson: GrammarLesson) {
  const byLevel = (items: { level: GrammarLessonLevel }[]) =>
    Object.fromEntries(GRAMMAR_LESSON_LEVELS.map((lv) => [lv, items.filter((x) => x.level === lv).length])) as Record<GrammarLessonLevel, number>;
  return {
    blanks: lesson.blanks.length,
    drillFill: byLevel(lesson.drillFill),
    drillFix: byLevel(lesson.drillFix),
    questions: byLevel(lesson.questions),
  };
}
