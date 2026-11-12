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

// 예문 모음: 설명 속 모든 포인트별 예문. tag=형태 표시(원형/v-ing/p.p.), note=한 줄 설명, wrong=틀린 예(✗)
export type GrammarLessonExample = {
  en: string;
  ko: string;
  tag?: string;
  note?: string;
  wrong?: boolean;
};

export type GrammarLessonExampleGroup = {
  title: string;
  note?: string;
  examples: GrammarLessonExample[];
};

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

// ── 강의형 확장 (모두 선택. 없으면 기존 레슨 그대로 동작) ─────────────────────────
// 강의: 음성(narration) + 판서가 순서대로 나타나는 세그먼트. 판서는 lines 가 한 줄씩 나타난다. docs/GRAMMAR_STYLE_GUIDE.md 6절
export type GrammarLectureTiming = { text: string; start: number; end: number }; // 자막 문장 하나와 그 문장이 읽히는 구간(초)
export type GrammarLectureSegment = {
  type: 'text' | 'board';
  text?: string; // type=text
  title?: string; // type=board
  lines?: string[]; // type=board
  speech?: string; // 있으면 음성은 narration 대신 이 문장으로 한 번에 합성한다(영어 단어를 한글 발음으로 바꿔 쓴 버전). 자막은 narration 을 보여 준다
  narration: string; // TTS 로 읽을 대본. 한국어 문장 속 영어는 [en]…[/en] 로 감싼다 (lib/elevenlabs 와 같은 규칙)
  timings?: GrammarLectureTiming[]; // 음성에서 문장별 시작/끝(초). 자막·칠판을 음성과 맞추는 데 쓴다. 음성을 다시 만들면 같이 바뀐다
  audioUrl?: string; // ElevenLabs(선생님 클론 목소리)로 만든 음성. 대본을 고치면 다시 만들어야 한다
};
export type GrammarTopPoint = { text: string; example?: GrammarLessonBilingual };
export type GrammarDeepDive = { title: string; ko: string; examples?: GrammarLessonBilingual[] };
// 팝업 퀴즈: 문법 관문 퀴즈와 같은 형태 (models/grammar/types.ts BlankSegmentContent)
export type GrammarPopupQuiz = { prompt: string; answer: string; answers?: string[]; options?: string[]; hint_ko?: string };
export const GRAMMAR_WRITTEN_KINDS = ['rewrite', 'order', 'fix_write'] as const;
export type GrammarWrittenKind = (typeof GRAMMAR_WRITTEN_KINDS)[number];
export const GRAMMAR_WRITTEN_KIND_LABEL: Record<GrammarWrittenKind, string> = {
  rewrite: '다시 쓰기',
  order: '배열 영작',
  fix_write: '어법 고쳐 쓰기',
};
export type GrammarWrittenTask = {
  level: GrammarLessonLevel;
  kind: GrammarWrittenKind;
  prompt: string; // rewrite/fix_write: 원 문장. order: 빈 문자열("")
  promptKo: string; // 지시문(rewrite/fix_write) 또는 우리말 뜻(order)
  words?: string[]; // order: 섞인 단어들
  answers: string[]; // 허용되는 정답 문장들
  noteKo?: string;
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
  exampleGroups?: GrammarLessonExampleGroup[];
  cramText: string;
  blanks: GrammarLessonBlank[];
  drillFill: GrammarLessonFill[];
  drillFix: GrammarLessonFix[];
  questions: GrammarLessonQuestion[];
  lecture?: GrammarLectureSegment[];
  examPoints?: string[]; // 기출 유형
  topPoints?: GrammarTopPoint[]; // 1등급 포인트
  deepDive?: GrammarDeepDive[]; // 심화
  popupQuiz?: GrammarPopupQuiz[];
  writtenTasks?: GrammarWrittenTask[];
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

  if (raw.exampleGroups !== undefined) {
    if (!Array.isArray(raw.exampleGroups)) {
      errors.push('exampleGroups 가 배열이 아닙니다.');
    } else {
      raw.exampleGroups.forEach((g, i) => {
        if (!isObj(g) || !isStr(g.title) || !Array.isArray(g.examples) || g.examples.length === 0) {
          errors.push(`exampleGroups[${i + 1}] 에는 title 과 examples[] 가 필요합니다.`);
          return;
        }
        g.examples.forEach((e, j) => {
          if (!isObj(e) || !isStr(e.en) || !e.en.trim() || !isStr(e.ko)) {
            errors.push(`exampleGroups[${i + 1}].examples[${j + 1}] 에 en/ko 가 필요합니다.`);
          }
        });
      });
    }
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

  // 강의형 확장 (있을 때만 검사)
  const optArr = (v: unknown, label: string, each: (x: unknown, i: number) => string | null) => {
    if (v === undefined) return;
    if (!Array.isArray(v)) {
      errors.push(`${label} 가 배열이 아닙니다.`);
      return;
    }
    v.forEach((x, i) => {
      const m = each(x, i);
      if (m) errors.push(`${label}[${i + 1}] ${m}`);
    });
  };
  const bil = (x: unknown) => isObj(x) && isStr(x.en) && isStr(x.ko);
  optArr(raw.lecture, 'lecture', (s) => {
    if (!isObj(s) || !isStr(s.narration) || !s.narration.trim()) return '에는 narration 이 필요합니다.';
    if (s.audioUrl !== undefined && !isStr(s.audioUrl)) return 'audioUrl 은 문자열이어야 합니다.';
    if (s.speech !== undefined && !isStr(s.speech)) return 'speech 는 문자열이어야 합니다.';
    if (s.type === 'text') return isStr(s.text) && s.text.trim() ? null : '(text) 에는 text 가 필요합니다.';
    if (s.type === 'board') return Array.isArray(s.lines) && s.lines.length > 0 && s.lines.every(isStr) ? null : '(board) 에는 lines[] 가 필요합니다.';
    return 'type 은 text | board 여야 합니다.';
  });
  optArr(raw.examPoints, 'examPoints', (x) => (isStr(x) && x.trim() ? null : '는 비어 있지 않은 문자열이어야 합니다.'));
  optArr(raw.topPoints, 'topPoints', (x) => (isObj(x) && isStr(x.text) && x.text.trim() && (x.example === undefined || bil(x.example)) ? null : '에는 text (+ example{en,ko}) 가 필요합니다.'));
  optArr(raw.deepDive, 'deepDive', (x) =>
    isObj(x) && isStr(x.title) && isStr(x.ko) && (x.examples === undefined || (Array.isArray(x.examples) && x.examples.every(bil))) ? null : '에는 title, ko (+ examples[{en,ko}]) 가 필요합니다.',
  );
  optArr(raw.popupQuiz, 'popupQuiz', (x) => {
    if (!isObj(x) || !isStr(x.prompt) || !x.prompt.includes('___') || !isStr(x.answer) || !x.answer.trim()) return "에는 '___' 가 들어 있는 prompt 와 answer 가 필요합니다.";
    if (x.answers !== undefined && !(Array.isArray(x.answers) && x.answers.every(isStr))) return 'answers 는 문자열 배열이어야 합니다.';
    if (x.options !== undefined && !(Array.isArray(x.options) && x.options.every(isStr))) return 'options 는 문자열 배열이어야 합니다.';
    return null;
  });
  optArr(raw.writtenTasks, 'writtenTasks', (x) => {
    if (!isObj(x) || !isLevel(x.level) || !(GRAMMAR_WRITTEN_KINDS as readonly string[]).includes(x.kind as string) || !isStr(x.prompt) || !isStr(x.promptKo)) {
      return '에는 level, kind(rewrite|order|fix_write), prompt, promptKo 가 필요합니다.';
    }
    if (!Array.isArray(x.answers) || x.answers.length === 0 || !x.answers.every((a) => isStr(a) && a.trim())) return 'answers[] 가 필요합니다.';
    if (x.kind === 'order' && !(Array.isArray(x.words) && x.words.length >= 3 && x.words.every(isStr))) return '(order) 에는 words[] 가 3개 이상 필요합니다.';
    return null;
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
    exampleCount: (lesson.exampleGroups ?? []).reduce((a, g) => a + g.examples.length, 0),
    blanks: lesson.blanks.length,
    drillFill: byLevel(lesson.drillFill),
    drillFix: byLevel(lesson.drillFix),
    questions: byLevel(lesson.questions),
  };
}
