// 뉴런 중3 목차 121유닛 → 개념(grammar_concepts) 묶음안 + 난이도 순서안 + 기존 중학내신 레슨 매핑.
// units = "챕터-유닛". tier = 개념 난이도 1(쉬움)~5(어려움). 배열 순서 = 학습 권장 순서(difficulty_rank).
// 책 순서와 다른 점: 비교 표현(7장)을 수동태·부정사보다 앞으로, 관계사(10장)를 분사구문(9장)보다 앞으로.
export type Concept = {
  key: string;
  titleKo: string;
  titleEn: string;
  units: string[];
  tier: 1 | 2 | 3 | 4 | 5;
  note?: string;
  seeAlso?: string[]; // 다른 개념과 교차 참조(비교 필요한 짝)
};

const c = (key: string, titleKo: string, titleEn: string, tier: Concept['tier'], units: string[], extra: Partial<Concept> = {}): Concept => ({ key, titleKo, titleEn, tier, units, ...extra });

export const NEURON_MIDDLE3_CONCEPTS: Concept[] = [
  // ── 문장의 동사 (1장)
  c('sentence-patterns-123', '1·2·3형식 동사', 'Sentence Patterns 1-3', 1, ['1-1', '1-2', '1-3']),
  c('ditransitive-verbs', '4형식 수여동사', 'Ditransitive Verbs', 2, ['1-4']),
  c('object-complement', '5형식과 목적격보어', 'Object Complements', 2, ['1-5', '1-6', '1-10']),
  c('perception-verbs', '지각동사', 'Verbs of Perception', 3, ['1-7', '5-12'], { seeAlso: ['passive-perception-causative'] }),
  c('causative-verbs', '사역동사', 'Causative Verbs', 3, ['1-8', '5-11'], { seeAlso: ['passive-perception-causative'] }),
  c('help-get', 'help·get 5형식', 'Help / Get + Object', 3, ['1-9']),
  c('to-inf-object-complement', '목적격보어로 쓰이는 to부정사', 'To-infinitive as Object Complement', 3, ['5-10']),

  // ── 시제 (2장)
  c('verb-forms', '동사 변화형', 'Verb Forms', 1, ['2-1']),
  c('basic-tenses', '기본시제(현재·과거·미래)', 'Simple Tenses', 1, ['2-2']),
  c('progressive-tenses', '진행시제', 'Progressive Tenses', 1, ['2-3']),
  c('present-perfect', '현재완료', 'Present Perfect', 2, ['2-4', '2-5', '2-6']),
  c('present-perfect-progressive', '현재완료 진행', 'Present Perfect Progressive', 3, ['2-7']),
  c('past-perfect', '과거완료·과거완료 진행', 'Past Perfect', 3, ['2-8', '2-9']),

  // ── 조동사 (3장)
  c('can-may', 'can·could·may·might', 'Can / May', 1, ['3-1', '3-2']),
  c('must-have-to', 'must·have to', 'Must / Have to', 2, ['3-3', '3-4']),
  c('should-etc', 'should·ought to·had better·would rather', 'Advice Modals', 2, ['3-5', '3-6']),
  c('used-to-would', 'used to·would (과거의 습관)', 'Used to / Would', 3, ['3-7'], { note: '기존 레슨 있음 (6과). be used to + V-ing 는 동명사 관용 표현(6-5)과 짝', seeAlso: ['gerund-idioms'] }),
  c('modal-have-pp', '조동사+have+p.p.', 'Modal + Have + p.p.', 4, ['3-8']),

  // ── 비교 표현 (7장) — 쉬워서 앞쪽으로
  c('comparison-forms', '비교급·최상급 만드는 법', 'Comparative / Superlative Forms', 1, ['7-3']),
  c('equal-comparison', '원급 비교', 'As ~ As', 2, ['7-1', '7-2']),
  c('comparative', '비교급과 비교 표현', 'Comparatives', 2, ['7-4', '7-5', '7-6']),
  c('superlative', '최상급과 최상급 표현', 'Superlatives', 2, ['7-7', '7-8']),
  c('comparison-conversion', '원급·비교급·최상급 전환', 'Comparison Conversion', 4, ['7-9']),

  // ── 수동태 (4장)
  c('passive-basic', '수동태의 의미·형식·시제', 'Passive Voice Basics', 2, ['4-1', '4-2', '4-3']),
  c('passive-modal-phrasal', '조동사·동사구 수동태', 'Passive with Modals / Phrasal Verbs', 3, ['4-4', '4-5']),
  c('passive-that-clause', 'that절이 뒤에 나오는 수동태', 'It Is Said That ...', 4, ['4-6']),
  c('passive-ditransitive-oc', '4·5형식 문장의 수동태', 'Passive of Patterns 4-5', 4, ['4-7', '4-8']),
  c('passive-perception-causative', '지각동사·사역동사의 수동태', 'Passive of Perception / Causative', 4, ['4-9'], { seeAlso: ['perception-verbs', 'causative-verbs'] }),

  // ── 부정사 (5장)
  c('to-inf-noun', 'to부정사 명사적 용법·의미상 주어·의문사+to', 'To-infinitive: Noun Use', 2, ['5-1', '5-2', '5-3']),
  c('to-inf-adjective', 'to부정사 형용사적 용법·be to', 'To-infinitive: Adjective Use', 2, ['5-4', '5-5']),
  c('to-inf-adverb', 'to부정사 부사적 용법과 역할', 'To-infinitive: Adverb Use', 3, ['5-6', '5-7']),
  c('too-enough-to', 'too ~ to / enough to', 'Too ~ To / Enough To', 3, ['5-8'], { seeAlso: ['so-that'] }),
  c('seem-to', 'seem to·완료부정사', 'Seem To / Perfect Infinitive', 4, ['5-9']),
  c('independent-infinitive', '독립부정사', 'Independent Infinitives', 4, ['5-13']),

  // ── 동명사와 분사 (6장)
  c('gerund-basic', '동명사 (주어·보어·목적어)', 'Gerund Basics', 2, ['6-1']),
  c('gerund-vs-to', '동명사 vs. to부정사', 'Gerund vs. To-infinitive', 3, ['6-2']),
  c('gerund-advanced', '동명사 의미상 주어·부정·시제·수동태', 'Gerund: Subject / Negation / Tense', 4, ['6-3', '6-4']),
  c('gerund-idioms', '동명사 관용 표현', 'Gerund Idioms', 3, ['6-5'], { seeAlso: ['used-to-would'] }),
  c('participle-adjective', '현재분사 vs. 과거분사 / 분사의 수식', 'Participles as Modifiers', 2, ['6-6', '6-7']),
  c('participle-complement', '보어로 쓰이는 분사·감정 분사', 'Participle as Complement / Emotion Verbs', 3, ['6-8', '6-9']),
  c('gerund-vs-participle', '동명사 vs. 현재분사', 'Gerund vs. Present Participle', 3, ['6-10']),

  // ── 접속사 (8장)
  c('adverb-clauses', '부사절 접속사 (시간·조건·원인·양보)', 'Adverbial Clause Conjunctions', 2, ['8-1', '8-2', '8-3', '8-4']),
  c('so-that', 'so ~ that / so that', 'So ~ That / So That', 3, ['8-5'], { note: '기존 레슨 있음 (5과)', seeAlso: ['too-enough-to'] }),
  c('multi-meaning-conjunctions', '여러 의미를 지닌 접속사·접속부사', 'Multi-meaning Conjunctions / Conjunctive Adverbs', 3, ['8-6', '8-9']),
  c('noun-clauses', '명사절 접속사 (that·whether/if)', 'Noun Clauses', 3, ['8-7', '8-8']),
  c('imperative-and-or', '명령문+and/or', 'Imperative + And / Or', 2, ['8-10']),
  c('correlative-conjunctions', '상관접속사', 'Correlative Conjunctions', 3, ['8-11']),

  // ── 관계사 (10장)
  c('relative-subject', '주격 관계대명사', 'Subject Relative Pronouns', 3, ['10-1']),
  c('relative-object', '목적격 관계대명사', 'Object Relative Pronouns', 3, ['10-2'], { note: '기존 레슨 있음 (6과)' }),
  c('relative-that-omission', '관계대명사 that·생략', 'Relative That / Omission', 3, ['10-3', '10-5']),
  c('relative-possessive', '소유격 관계대명사', 'Whose', 3, ['10-4']),
  c('relative-what', '관계대명사 what', 'Relative What', 3, ['10-6']),
  c('preposition-relative', '전치사+관계대명사', 'Preposition + Relative Pronoun', 4, ['10-7']),
  c('relative-adverbs', '관계부사', 'Relative Adverbs', 4, ['10-8']),
  c('non-restrictive', '관계사의 계속적 용법', 'Non-restrictive Relative Clauses', 4, ['10-9']),
  c('compound-relatives', '복합관계사', 'Compound Relatives', 5, ['10-10', '10-11', '10-12']),

  // ── 분사구문 (9장)
  c('participial-basic', '분사구문 만드는 법·의미·부정', 'Participial Constructions', 4, ['9-1', '9-2']),
  c('participial-perfect', '완료형 분사구문·Being/Having been 생략', 'Perfect Participial / Omission', 4, ['9-3', '9-4']),
  c('absolute-participle', '독립분사구문·비인칭 독립분사구문', 'Absolute Participial Constructions', 5, ['9-5', '9-6']),
  c('with-participle', 'with + (대)명사 + 분사', 'With + Noun + Participle', 4, ['9-7']),

  // ── 가정법 (11장)
  c('subjunctive-basic', '가정법 과거·과거완료·직설법 전환', 'Conditionals: Past / Past Perfect', 4, ['11-1', '11-3']),
  c('subjunctive-mixed', '혼합 가정법', 'Mixed Conditionals', 5, ['11-2']),
  c('wish-as-if-time', 'I wish·as if·It\'s time + 가정법', 'Wish / As If / It\'s Time', 4, ['11-4', '11-5', '11-7']),
  c('without-but-for', 'Without[But for] + 가정법', 'Without / But For', 5, ['11-6']),

  // ── 일치와 화법 (12장)
  c('subject-verb-agreement', '수의 일치', 'Subject-Verb Agreement', 3, ['12-1']),
  c('sequence-of-tenses', '시제 일치와 예외', 'Sequence of Tenses', 4, ['12-2']),
  c('reported-speech', '간접화법 전환', 'Reported Speech', 4, ['12-3', '12-4', '12-5']),

  // ── 강조·부정·도치·부정대명사 (13장)
  c('emphasis', '강조 (do 강조·It is ~ that)', 'Emphasis', 4, ['13-1', '13-2']),
  c('negation-partial-total', '전체 부정 & 부분 부정', 'Total / Partial Negation', 4, ['13-3']),
  c('inversion', '도치', 'Inversion', 5, ['13-4']),
  c('indefinite-pronouns', '부정대명사', 'Indefinite Pronouns', 3, ['13-5']),

  // ── 문장의 이해 (14장) — 종합
  c('sentence-structure', '문장 성분 자리 이해 (주어·보어·목적어·수식어)', 'Sentence Structure', 5, ['14-1', '14-2', '14-3', '14-4', '14-5', '14-6']),
];

// 기존 중학내신 레슨(동아 M2, extra_data.lesson) ↔ 개념 매핑. lesson = `${lessonNumber}-${sortOrder}` 키(grammar-lesson-drafts.ts)
export const EXISTING_LESSON_MAP: Array<{ lessonKey: string; lessonTitle: string; conceptKey: string; unit: string; gap?: string }> = [
  { lessonKey: '5-0', lessonTitle: 'so ~ that', conceptKey: 'so-that', unit: '8-5' },
  { lessonKey: '5-1', lessonTitle: '지각동사', conceptKey: 'perception-verbs', unit: '1-7', gap: '수동태 짝(4-9)과 to부정사 ✗ 비교는 별도' },
  { lessonKey: '6-0', lessonTitle: '목적격 관계대명사', conceptKey: 'relative-object', unit: '10-2', gap: '10-3(that)·10-5(생략)·10-7(전치사+관계대명사)은 아직 없음' },
  { lessonKey: '6-1', lessonTitle: 'used to', conceptKey: 'used-to-would', unit: '3-7', gap: 'be used to + V-ing 는 6-5 동명사 관용 표현 개념으로 이관' },
];
