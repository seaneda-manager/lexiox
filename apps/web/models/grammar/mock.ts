import type { GrammarUnitFull } from "./types";

export const MOCK_GRAMMAR_UNIT: GrammarUnitFull = {
  unit: {
    id: "noun-pronoun-agreement",
    label_ko: "명사-대명사 수일치",
    label_en: "Noun-Pronoun Agreement",
    description: "명사와 그것을 대신하는 대명사는 수(단수/복수)가 일치해야 한다.",
    level: "all",
    order_index: 1,
    status: "published",
  },

  segments: [
    {
      id: "seg-01",
      unit_id: "noun-pronoun-agreement",
      order_index: 1,
      type: "text",
      content: {
        text: "대명사(pronoun)는 앞에 나온 명사(noun)를 대신하는 말이다.",
      },
    },
    {
      id: "seg-02",
      unit_id: "noun-pronoun-agreement",
      order_index: 2,
      type: "animation",
      content: {
        key: "noun-pronoun-arrow",  // 명사→대명사 화살표 애니메이션
        duration_ms: 2000,
      },
    },
    {
      id: "seg-03",
      unit_id: "noun-pronoun-agreement",
      order_index: 3,
      type: "blank",
      content: {
        prompt: "명사가 단수이면 대명사도 ___이어야 한다.",
        answer: "단수",
        hint_ko: "단수 / 복수",
      },
    },
    {
      id: "seg-04",
      unit_id: "noun-pronoun-agreement",
      order_index: 4,
      type: "text",
      content: {
        text: "예: The student forgot his/her book. (student → his/her: 둘 다 단수 ✓)",
      },
    },
    {
      id: "seg-05",
      unit_id: "noun-pronoun-agreement",
      order_index: 5,
      type: "blank",
      content: {
        prompt: "명사가 복수이면 대명사도 ___이어야 한다.",
        answer: "복수",
        hint_ko: "단수 / 복수",
      },
    },
    {
      id: "seg-06",
      unit_id: "noun-pronoun-agreement",
      order_index: 6,
      type: "text",
      content: {
        text: "예: The students forgot their books. (students → their: 둘 다 복수 ✓)",
      },
    },
  ],

  drills: [
    {
      id: "drill-01",
      unit_id: "noun-pronoun-agreement",
      order_index: 1,
      type: "fill",
      sentence: "Each of the boys must bring ___ own lunch.",
      answer: "his",
      distractors: ["their", "its", "our"],
      grammar_labels: [
        { id: "lbl-a", label_ko: "명사-대명사 수일치", label_en: "Noun-Pronoun Agreement", is_correct: true },
        { id: "lbl-b", label_ko: "도치 + 수일치", label_en: "Inversion + Agreement", is_correct: false },
        { id: "lbl-c", label_ko: "분사구문", label_en: "Participial Phrase", is_correct: false },
        { id: "lbl-d", label_ko: "Fragment (불완전 문장)", label_en: "Sentence Fragment", is_correct: false },
      ],
    },
    {
      id: "drill-02",
      unit_id: "noun-pronoun-agreement",
      order_index: 2,
      type: "judgment",
      sentence: "The committee made their decision after a long debate.",
      answer: "correct",
      distractors: [],
      grammar_labels: [
        { id: "lbl-a", label_ko: "명사-대명사 수일치", label_en: "Noun-Pronoun Agreement", is_correct: true },
        { id: "lbl-b", label_ko: "시제 일관성", label_en: "Tense Consistency", is_correct: false },
        { id: "lbl-c", label_ko: "주어-동사 수일치", label_en: "Subject-Verb Agreement", is_correct: false },
        { id: "lbl-d", label_ko: "관계사절", label_en: "Relative Clause", is_correct: false },
      ],
    },
    {
      id: "drill-03",
      unit_id: "noun-pronoun-agreement",
      order_index: 3,
      type: "fill",
      sentence: "Neither of the girls remembered ___ password.",
      answer: "her",
      distractors: ["their", "his", "its"],
      grammar_labels: [
        { id: "lbl-a", label_ko: "명사-대명사 수일치", label_en: "Noun-Pronoun Agreement", is_correct: true },
        { id: "lbl-b", label_ko: "도치 + 시제", label_en: "Inversion + Tense", is_correct: false },
        { id: "lbl-c", label_ko: "병렬 구조", label_en: "Parallel Structure", is_correct: false },
        { id: "lbl-d", label_ko: "수식어 위치", label_en: "Modifier Placement", is_correct: false },
      ],
    },
  ],

  stylistic_items: [
    {
      id: "sty-01",
      unit_id: "noun-pronoun-agreement",
      order_index: 1,
      skill: "concision",
      prompt: "다음 중 더 자연스럽고 효과적인 문장은?",
      options: [
        {
          id: "opt-a",
          text: "The manager announced that the manager would review all reports personally.",
          is_correct: false,
        },
        {
          id: "opt-b",
          text: "The manager announced that she would review all reports personally.",
          is_correct: true,
        },
      ],
      explanation:
        "A는 'the manager'를 불필요하게 반복. B는 대명사 'she'로 간결하게 대체 — 명사 반복 대신 대명사 활용이 더 자연스럽다.",
    },
  ],
};

export const MOCK_GRAMMAR_UNITS_LIST = [
  {
    id: "noun-pronoun-agreement",
    label_ko: "명사-대명사 수일치",
    label_en: "Noun-Pronoun Agreement",
    level: "all" as const,
    order_index: 1,
    status: "published" as const,
    drill_count: 3,
  },
  {
    id: "subject-verb-agreement",
    label_ko: "주어-동사 수일치",
    label_en: "Subject-Verb Agreement",
    level: "all" as const,
    order_index: 2,
    status: "draft" as const,
    drill_count: 0,
  },
  {
    id: "parallel-structure",
    label_ko: "병렬 구조",
    label_en: "Parallel Structure",
    level: "hs" as const,
    order_index: 3,
    status: "draft" as const,
    drill_count: 0,
  },
];
