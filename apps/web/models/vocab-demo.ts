// apps/web/models/vocab-demo.ts
import type { VocabWordCore, GradeBand } from "@/models/vocab";

const now = new Date().toISOString();
const baseGradeBands: GradeBand[] = ["K3_4"];

/** 🔹 Drill 전용 부가 타입들 (지금은 여기서 정의, 나중에 models/vocab.ts로 옮겨도 됨) */
type VocabPosTag = "n" | "v" | "adj" | "adv" | "phr-v" | "idiom";

type VocabDrillVerbForms = {
  past?: string;
  pastParticiple?: string;
  ing?: string;
  thirdPerson?: string;
};

type VocabDrillExample = {
  sentence: string;
  ko?: string;
};

type VocabDrillSense = {
  meaningKo: string;
  meaningEnShort?: string;
  examples?: VocabDrillExample[];
};

type VocabDrillCollocation = {
  phrase: string;
  koHint?: string;
};

type VocabDrillEntry = {
  posTag: VocabPosTag;
  verbForms?: VocabDrillVerbForms; // 동사일 경우 사용
  senses: VocabDrillSense[];       // 이 품사에서의 여러 뜻
  collocations?: VocabDrillCollocation[];
  usageNoteKo?: string;
};

/** 🔹 기존 VocabWordCore를 Drill 용도로 살짝 확장한 타입 */
export type VocabWordWithDrill = VocabWordCore & {
  phoneticBrE?: string;
  phoneticNAm?: string;
  drillEntries?: VocabDrillEntry[];
};

export const demoVocabWords: VocabWordWithDrill[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    text: "grasp",
    lemma: "grasp",
    pos: "v.",
    is_function_word: false,

    meanings_ko: ["이해하다"],
    meanings_en_simple: ["understand"],
    examples_easy: ["The students tried to grasp the main idea."],
    examples_normal: [] as string[],
    derived_terms: [] as string[],

    difficulty: 2,
    frequency_score: null,
    notes: null,

    created_at: now,
    updated_at: now,

    gradeBands: baseGradeBands,
    sources: [],
    semanticTags: [],
    grammarHints: [],

    // 🔹 Drill용 확장 필드
    phoneticBrE: "/ɡrɑːsp/",
    phoneticNAm: "/ɡræsp/",
    drillEntries: [
      {
        posTag: "v",
        verbForms: {
          past: "grasped",
          pastParticiple: "grasped",
          ing: "grasping",
          thirdPerson: "grasps",
        },
        senses: [
          {
            meaningKo: "이해하다, 파악하다",
            meaningEnShort: "to understand something clearly",
            examples: [
              {
                sentence: "The students tried to grasp the main idea.",
                ko: "학생들은 글의 중심 생각을 이해하려고 노력했다.",
              },
            ],
          },
          {
            meaningKo: "꽉 잡다, 움켜쥐다",
            meaningEnShort: "to take and hold something firmly",
            examples: [
              {
                sentence: "He grasped her hand tightly.",
                ko: "그는 그녀의 손을 꽉 잡았다.",
              },
            ],
          },
        ],
        collocations: [
          { phrase: "grasp the main idea", koHint: "중심 생각을 파악하다" },
          { phrase: "grasp the concept", koHint: "개념을 이해하다" },
          { phrase: "grasp tightly", koHint: "꽉 잡다" },
        ],
        usageNoteKo:
          "추상적인 것(생각, 개념)을 '이해하다'라는 뜻과, 물리적으로 '꽉 잡다'라는 뜻 둘 다 있다. 문맥을 보고 구분해야 한다.",
      },
    ],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    text: "scatter",
    lemma: "scatter",
    pos: "v.",
    is_function_word: false,

    meanings_ko: ["흩어지다"],
    meanings_en_simple: ["spread out"],
    examples_easy: ["The wind caused the leaves to scatter."],
    examples_normal: [] as string[],
    derived_terms: [] as string[],

    difficulty: 2,
    frequency_score: null,
    notes: null,

    created_at: now,
    updated_at: now,

    gradeBands: baseGradeBands,
    sources: [],
    semanticTags: [],
    grammarHints: [],

    // 🔹 Drill용 확장 필드
    phoneticBrE: "/ˈskætə/",
    phoneticNAm: "/ˈskætər/",
    drillEntries: [
      {
        posTag: "v",
        verbForms: {
          past: "scattered",
          pastParticiple: "scattered",
          ing: "scattering",
          thirdPerson: "scatters",
        },
        senses: [
          {
            meaningKo: "흩어지다, 흩뿌리다",
            meaningEnShort:
              "to move or make things move in different directions over a wide area",
            examples: [
              {
                sentence: "The wind caused the leaves to scatter.",
                ko: "바람 때문에 나뭇잎들이 흩어졌다.",
              },
              {
                sentence: "The children scattered when the bell rang.",
                ko: "종이 울리자 아이들이 사방으로 흩어졌다.",
              },
            ],
          },
        ],
        collocations: [
          { phrase: "scatter leaves", koHint: "나뭇잎을 흩어지게 하다" },
          { phrase: "scatter in all directions", koHint: "사방으로 흩어지다" },
          { phrase: "be scattered across", koHint: "~ 전역에 흩어져 있다" },
        ],
        usageNoteKo:
          "무언가가 '사방으로 퍼져 나가다/흩어지다'는 이미지. 사람·사물 모두에 쓸 수 있다. 수동형(be scattered)도 많이 나온다.",
      },
    ],
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    text: "whisper",
    lemma: "whisper",
    pos: "v.",
    is_function_word: false,

    meanings_ko: ["속삭이다"],
    meanings_en_simple: ["speak softly"],
    examples_easy: ["She whispered the answer to her friend."],
    examples_normal: [] as string[],
    derived_terms: [] as string[],

    difficulty: 1,
    frequency_score: null,
    notes: null,

    created_at: now,
    updated_at: now,

    gradeBands: baseGradeBands,
    sources: [],
    semanticTags: [],
    grammarHints: [],

    // 🔹 Drill용 확장 필드
    phoneticBrE: "/ˈwɪspə/",
    phoneticNAm: "/ˈwɪspər/",
    drillEntries: [
      {
        posTag: "v",
        verbForms: {
          past: "whispered",
          pastParticiple: "whispered",
          ing: "whispering",
          thirdPerson: "whispers",
        },
        senses: [
          {
            meaningKo: "속삭이다, 작은 소리로 말하다",
            meaningEnShort: "to speak very quietly",
            examples: [
              {
                sentence: "She whispered the answer to her friend.",
                ko: "그녀는 친구에게 답을 속삭여 주었다.",
              },
              {
                sentence: "They whispered so the teacher wouldn’t hear.",
                ko: "그들은 선생님이 듣지 못하도록 속삭였다.",
              },
            ],
          },
        ],
        collocations: [
          { phrase: "whisper softly", koHint: "작게 속삭이다" },
          { phrase: "whisper in someone's ear", koHint: "누군가의 귀에 속삭이다" },
          { phrase: "a whisper", koHint: "속삭임, 작은 소리" },
        ],
        usageNoteKo:
          "보통 비밀이거나, 조용해야 하는 상황에서 '작은 소리로 말하다'라는 느낌. 명사로도 '속삭임'이라는 뜻이 있다.",
      },
    ],
  },
];
