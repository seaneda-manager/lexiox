// 교재 1·2 목차 → 개념 매핑 (초안, 확정 전). 참고: docs/grammar-toc/concept_matrix_draft.md, book01_concepts_draft.md
// units 표기는 "챕터-유닛". b1 = 교재 1(book01), b2 = 교재 2(book02).
// ① NEW_CONCEPTS: 중3(neuron-middle3-concepts.ts)에 없는 기초 개념 — 새로 만든다.
// ② EXTRA_UNIT_LINKS: 중3에 이미 있는 개념에 교재 1·2 단원을 붙인다(한 개념 = 교재별 누적 커버리지).
export type BookUnits = { b1?: string[]; b2?: string[] };
export type NewConcept = BookUnits & { key: string; titleKo: string; titleEn: string; tier: 1 | 2 | 3 | 4 | 5; seeAlso?: string[] };

const n = (key: string, titleKo: string, titleEn: string, tier: NewConcept['tier'], units: BookUnits, extra: Partial<NewConcept> = {}): NewConcept => ({ key, titleKo, titleEn, tier, ...units, ...extra });

export const NEW_CONCEPTS: NewConcept[] = [
  n('personal-pronouns', '인칭대명사 (주격·격변화)', 'Personal Pronouns', 1, { b1: ['1-1', '6-1'] }),
  n('be-verb', 'be동사', 'Be-verb', 1, { b1: ['1-2', '1-3', '1-4', '1-5', '1-6', '1-7'] }),
  n('general-verbs', '일반동사', 'General Verbs', 1, { b1: ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7', '2-8'] }),
  n('future-expressions', '미래 표현 (will · be going to)', 'Future Expressions', 1, { b1: ['3-3', '3-4', '3-5'], b2: ['1-2'] }),
  n('countable-nouns', '셀 수 있는 명사와 복수형', 'Countable Nouns / Plurals', 1, { b1: ['5-1', '5-2', '5-3', '5-4'] }),
  n('uncountable-nouns', '셀 수 없는 명사와 수량 표현', 'Uncountable Nouns', 1, { b1: ['5-5', '5-6'] }),
  n('articles', '관사 (a(n) · the · 생략)', 'Articles', 1, { b1: ['5-1', '5-7', '5-8'] }),
  n('there-is-are', 'There is / are', 'There Is / Are', 1, { b1: ['5-9', '5-10'] }),
  n('reflexive-pronouns', '재귀대명사', 'Reflexive Pronouns', 1, { b1: ['6-2'], b2: ['6-5', '6-6'] }),
  n('demonstrative-it', '지시대명사·지시형용사·비인칭 it', 'Demonstratives / Impersonal It', 1, { b1: ['6-3', '6-4', '6-5'] }),
  n('adjectives', '형용사 (-thing + 형용사 포함)', 'Adjectives', 1, { b1: ['7-1', '7-2'], b2: ['6-7'] }),
  n('quantity-adjectives', '수량형용사', 'Quantity Adjectives', 1, { b1: ['7-3', '7-4', '7-5'], b2: ['6-8'] }),
  n('adverbs', '부사 (역할·형태·빈도부사)', 'Adverbs', 1, { b1: ['7-6', '7-7', '7-8', '7-9', '7-10'], b2: ['6-9', '6-10'] }),
  n('wh-questions', '의문사 의문문', 'Wh-questions', 1, { b1: ['8-1', '8-2', '8-3', '8-4', '8-5', '8-6'], b2: ['8-1', '8-2', '8-3', '8-4'] }),
  n('exclamations', '감탄문', 'Exclamations', 1, { b1: ['9-7', '9-8'], b2: ['8-5'] }),
  n('imperatives-suggestions', '명령문·청유문', 'Imperatives / Suggestions', 1, { b1: ['9-1', '9-2'] }),
  n('tag-questions', '부가의문문', 'Tag Questions', 2, { b1: ['9-3', '9-4'], b2: ['14-8', '14-9'] }),
  n('special-questions', '부정의문문·선택의문문', 'Negative / Alternative Questions', 2, { b1: ['9-5', '9-6'] }),
  n('coordinating-conjunctions', '등위접속사', 'Coordinating Conjunctions', 1, { b1: ['13-1', '13-2'], b2: ['10-1'] }),
  n('prepositions-time', '시간 전치사', 'Prepositions of Time', 1, { b1: ['12-1', '12-2'] }),
  n('prepositions-place', '장소·위치·방향·주요 전치사', 'Prepositions of Place / Direction', 1, { b1: ['12-3', '12-4', '12-5', '12-6'] }),
];

// 중3 개념 key → 교재 1·2 단원
export const EXTRA_UNIT_LINKS: Record<string, BookUnits> = {
  // 문장의 형식
  'sentence-patterns-123': { b1: ['10-1', '10-2', '10-3', '10-4'], b2: ['9-1', '9-2', '9-3', '9-4'] },
  'ditransitive-verbs': { b1: ['10-5', '10-6'], b2: ['9-4', '9-5'] },
  'object-complement': { b1: ['10-7', '10-8', '10-9'], b2: ['9-6', '9-11'] },
  'perception-verbs': { b2: ['9-8'] },
  'causative-verbs': { b2: ['9-9'] },
  'help-get': { b2: ['9-10'] },
  'to-inf-object-complement': { b2: ['4-5', '9-7'] },
  // 시제
  'verb-forms': { b2: ['1-1'] },
  'basic-tenses': { b1: ['3-1', '3-2', '3-6'], b2: ['1-2'] },
  'progressive-tenses': { b1: ['3-7', '3-8', '3-9', '3-10', '3-11', '3-12'], b2: ['1-3', '1-4'] },
  'present-perfect': { b2: ['1-5', '1-6', '1-7', '1-8', '1-9', '1-10'] },
  // 조동사
  'can-may': { b1: ['4-1', '4-2', '4-3', '4-4'], b2: ['2-1', '2-2'] },
  'must-have-to': { b1: ['4-5', '4-6'], b2: ['2-3', '2-4'] },
  'should-etc': { b1: ['4-7'], b2: ['2-5', '2-6'] },
  'used-to-would': { b2: ['2-7'] },
  // 비교
  'comparison-forms': { b1: ['7-11'], b2: ['7-3'] },
  'equal-comparison': { b1: ['7-12'], b2: ['7-1', '7-2'] },
  'comparative': { b1: ['7-13'], b2: ['7-4', '7-5', '7-6'] },
  'superlative': { b1: ['7-14'], b2: ['7-7', '7-8'] },
  'comparison-conversion': { b1: ['7-15'], b2: ['7-9'] },
  // 수동태
  'passive-basic': { b2: ['3-1', '3-2', '3-3', '3-4', '3-5', '3-7'] },
  'passive-modal-phrasal': { b2: ['3-6', '3-11'] },
  'passive-ditransitive-oc': { b2: ['3-8', '3-9'] },
  'passive-perception-causative': { b2: ['3-10'] },
  // to부정사
  'to-inf-noun': { b1: ['11-1', '11-2', '11-3'], b2: ['4-1', '4-2', '4-3', '4-4', '4-9'] },
  'to-inf-adjective': { b1: ['11-4'], b2: ['4-6'] },
  'to-inf-adverb': { b1: ['11-5', '11-6'], b2: ['4-7', '4-8'] },
  'too-enough-to': { b2: ['4-10', '4-11'] },
  // 동명사·분사
  'gerund-basic': { b1: ['11-7', '11-8'], b2: ['5-1', '5-2'] },
  'gerund-vs-to': { b1: ['11-9'], b2: ['5-3', '5-4', '5-5'] },
  'gerund-idioms': { b1: ['11-10'], b2: ['5-6'] },
  'participle-adjective': { b2: ['5-7', '5-8', '11-1', '11-2'] },
  'participle-complement': { b2: ['5-9', '5-10'] },
  'gerund-vs-participle': { b2: ['5-11'] },
  'participial-basic': { b2: ['11-3', '11-4', '11-5', '11-6'] },
  // 접속사
  'adverb-clauses': { b1: ['13-3', '13-4'], b2: ['10-3', '10-4', '10-6', '10-8', '10-10'] },
  'so-that': { b2: ['10-7'] },
  'noun-clauses': { b1: ['13-5'], b2: ['10-9'] },
  'imperative-and-or': { b2: ['10-5'] },
  'correlative-conjunctions': { b2: ['10-2'] },
  // 대명사
  'indefinite-pronouns': { b1: ['6-6', '6-7', '6-8'], b2: ['6-1', '6-2', '6-3', '6-4'] },
  // 관계사
  'relative-subject': { b2: ['12-1', '12-2', '12-5'] },
  'relative-object': { b2: ['12-3'] },
  'relative-possessive': { b2: ['12-4'] },
  'relative-that-omission': { b2: ['12-6', '12-7', '12-8'] },
  'relative-what': { b2: ['12-9'] },
  'relative-adverbs': { b2: ['12-10', '12-11'] },
  // 가정법
  'subjunctive-basic': { b2: ['13-1', '13-4'] },
  'wish-as-if-time': { b2: ['13-2', '13-3', '13-5', '13-6'] },
  // 일치·화법·강조·도치
  'sequence-of-tenses': { b2: ['14-1', '14-2'] },
  'emphasis': { b2: ['14-3'] },
  'inversion': { b2: ['14-4'] },
  'reported-speech': { b2: ['14-5', '14-6', '14-7'] },
};
