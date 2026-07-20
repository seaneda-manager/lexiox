import type { NaesinPassage } from "@/components/naesin/drill/types";

type LexiconEntry = {
  pos: string;
  meaning: string;
};

export const MOCK_LEXICON: Record<string, LexiconEntry> = {
  boy: { pos: "n.", meaning: "소년" },
  blue: { pos: "adj.", meaning: "파란" },
  cap: { pos: "n.", meaning: "모자" },
  ran: { pos: "v.", meaning: "달렸다" },
  quickly: { pos: "adv.", meaning: "빠르게" },
  store: { pos: "n.", meaning: "가게" },
  nearby: { pos: "adj./adv.", meaning: "근처의, 근처에" },
  classroom: { pos: "n.", meaning: "교실" },
  quiet: { pos: "adj.", meaning: "조용한" },
  during: { pos: "prep.", meaning: "~동안" },
  science: { pos: "n.", meaning: "과학" },
  project: { pos: "n.", meaning: "프로젝트" },
  teacher: { pos: "n.", meaning: "선생님" },
  gave: { pos: "v.", meaning: "주었다" },
  students: { pos: "n.", meaning: "학생들" },
  clear: { pos: "adj.", meaning: "분명한" },
  instructions: { pos: "n.", meaning: "지시사항" },
  because: { pos: "conj.", meaning: "~이기 때문에" },
  experiment: { pos: "n.", meaning: "실험" },
  required: { pos: "v.", meaning: "요구했다" },
  careful: { pos: "adj.", meaning: "주의 깊은" },
  observation: { pos: "n.", meaning: "관찰" },
  working: { pos: "part.", meaning: "작업하는" },
  together: { pos: "adv.", meaning: "함께" },
  team: { pos: "n.", meaning: "팀" },
  finished: { pos: "v.", meaning: "끝냈다" },
  task: { pos: "n.", meaning: "과제" },
  before: { pos: "prep./conj.", meaning: "~전에" },
  lunch: { pos: "n.", meaning: "점심" },
  excited: { pos: "adj.", meaning: "신이 난" },
  about: { pos: "prep.", meaning: "~에 대해" },
  results: { pos: "n.", meaning: "결과들" },
  thanked: { pos: "v.", meaning: "감사했다" },
  principal: { pos: "n.", meaning: "교장" },
  announced: { pos: "v.", meaning: "발표했다" },
  that: { pos: "conj.", meaning: "~라는 것" },
  school: { pos: "n.", meaning: "학교" },
  would: { pos: "modal v.", meaning: "~할 것이다" },
  hold: { pos: "v.", meaning: "개최하다" },
  special: { pos: "adj.", meaning: "특별한" },
  event: { pos: "n.", meaning: "행사" },
  next: { pos: "adj.", meaning: "다음의" },
  week: { pos: "n.", meaning: "주" },
};

export const MOCK_NAESIN_PASSAGE: NaesinPassage = {
  id: "naesin-demo-1",
  title: "Naesin Drill Demo Passage",
  sourceLabel: "Demo / Structure Analysis",
  paragraphs: [
    {
      id: "p1",
      label: "Paragraph 1",
      text: [
        "The boy who is wearing a blue cap ran quickly to the store.",
        "The nearby classroom was quiet during the science project.",
        "The teacher gave the students clear instructions because the experiment required careful observation.",
      ].join(" "),
      sentences: [
        {
          id: "s1",
          text: "The boy who is wearing a blue cap ran quickly to the store.",
          structureAnswer: {
            subject: {
              accepted: ["The boy who is wearing a blue cap", "The boy"],
            },
            verb: {
              accepted: ["ran"],
            },
            object: {
              accepted: [],
            },
            complement: {
              accepted: [],
            },
            modifiers: [
              {
                span: "who is wearing a blue cap",
                type: "형용사절",
                subtype: "relative_clause",
                targetType: "head_noun",
                target: "boy",
              },
              {
                span: "quickly",
                subtype: "adverb_word",
                targetType: "verb_phrase",
                target: "ran",
              },
              {
                span: "to the store",
                type: "부사구",
                subtype: "prepositional_phrase",
                targetType: "verb_phrase",
                target: "ran",
              },
            ],
          },
          sentenceFunctionAnswer: {
            correct: "scene_setting",
            accepted: ["topic_sentence"],
            explanation:
              "문단의 첫 문장으로 인물, 행동, 방향을 한 번에 열어 주는 장면 도입 문장이다. 현재 분류에서는 상황 제시가 가장 정확하다.",
            clue: "첫 문장 / 인물 + 행동 + 방향 / 장면 시작",
          },
          translationAnswer: {
            referenceKo:
              "파란 모자를 쓰고 있는 그 소년은 가게로 빠르게 달려갔다.",
            acceptableKeywords: [
              "소년",
              "파란 모자",
              "가게",
              "빠르게",
              "달려갔다",
            ],
            notes: [
              "who is wearing a blue cap은 boy를 꾸미는 수식절",
              "quickly는 ran을 수식하는 부사",
              "to the store는 도착 방향/목적지를 나타냄",
            ],
            chunks: [
              {
                id: "s1-c1",
                sourceSpan: "The boy who is wearing a blue cap",
                leadKo: "파",
                acceptableAnswers: [
                  "파란 모자를 쓰고 있는 그 소년은",
                  "파란 모자를 쓴 그 소년은",
                  "파란 모자를 쓰고 있는 소년은",
                ],
              },
              {
                id: "s1-c2",
                sourceSpan: "ran quickly",
                leadKo: "빠",
                acceptableAnswers: ["빠르게 달려갔다", "빠르게 달렸다"],
              },
              {
                id: "s1-c3",
                sourceSpan: "to the store",
                leadKo: "가",
                acceptableAnswers: ["가게로", "그 가게로"],
              },
            ],
          },
        },
        {
          id: "s2",
          text: "The nearby classroom was quiet during the science project.",
          structureAnswer: {
            subject: {
              accepted: ["The nearby classroom", "classroom"],
            },
            verb: {
              accepted: ["was"],
            },
            object: {
              accepted: [],
            },
            complement: {
              accepted: ["quiet"],
            },
            modifiers: [
              {
                span: "nearby",
                subtype: "adjective_word",
                targetType: "head_noun",
                target: "classroom",
              },
              {
                span: "during the science project",
                type: "부사구",
                subtype: "prepositional_phrase",
                targetType: "verb_phrase",
                target: "was",
              },
            ],
          },
          sentenceFunctionAnswer: {
            correct: "supporting_detail",
            explanation:
              "앞에서 제시된 장면을 더 구체적으로 설명하는 추가 정보이므로 뒷받침 문장으로 본다.",
            clue: "추가 설명 / 부가 정보",
          },
          translationAnswer: {
            referenceKo: "근처의 그 교실은 과학 프로젝트 동안 조용했다.",
            acceptableKeywords: [
              "근처의",
              "교실",
              "과학 프로젝트",
              "동안",
              "조용했다",
            ],
            notes: [
              "nearby는 classroom을 꾸미는 형용사적 표현",
              "during the science project는 시간/기간 의미",
              "quiet은 보어로 해석됨",
            ],
            chunks: [
              {
                id: "s2-c1",
                sourceSpan: "The nearby classroom",
                leadKo: "근",
                acceptableAnswers: ["근처의 그 교실은", "근처 교실은"],
              },
              {
                id: "s2-c2",
                sourceSpan: "during the science project",
                leadKo: "과",
                acceptableAnswers: [
                  "과학 프로젝트 동안",
                  "과학 실험 프로젝트 동안",
                ],
              },
              {
                id: "s2-c3",
                sourceSpan: "was quiet",
                leadKo: "조",
                acceptableAnswers: ["조용했다"],
              },
            ],
          },
        },
        {
          id: "s3",
          text: "The teacher gave the students clear instructions because the experiment required careful observation.",
          structureAnswer: {
            subject: {
              accepted: ["The teacher", "teacher"],
            },
            verb: {
              accepted: ["gave"],
            },
            object: {
              accepted: [
                "the students clear instructions",
                "clear instructions",
              ],
            },
            complement: {
              accepted: [],
            },
            modifiers: [
              {
                span: "clear",
                subtype: "adjective_word",
                targetType: "head_noun",
                target: "instructions",
              },
              {
                span: "because the experiment required careful observation",
                type: "부사절",
                subtype: "adverb_clause",
                targetType: "main_clause",
                target: "The teacher gave the students clear instructions",
              },
              {
                span: "careful",
                subtype: "adjective_word",
                targetType: "head_noun",
                target: "observation",
              },
            ],
          },
          sentenceFunctionAnswer: {
            correct: "supporting_detail",
            accepted: ["scene_setting"],
            explanation:
              "이 문장은 앞 장면 속 상황을 더 구체적으로 설명하는 문장이다. 마지막 문장이라고 해서 자동으로 결론은 아니며, 여기서는 왜 분명한 지시가 필요했는지를 덧붙여 주는 뒷받침 설명이 더 자연스럽다.",
            clue: "이유 제시 / because / 상황 보충 설명",
          },
          translationAnswer: {
            referenceKo:
              "그 선생님은 실험이 주의 깊은 관찰을 요구했기 때문에 학생들에게 분명한 지시를 주었다.",
            acceptableKeywords: [
              "선생님",
              "학생들",
              "분명한 지시",
              "주의 깊은 관찰",
              "요구했기 때문에",
            ],
            notes: [
              "because 절은 이유를 나타냄",
              "clear는 instructions를 꾸밈",
              "careful은 observation을 꾸밈",
            ],
            chunks: [
              {
                id: "s3-c1",
                sourceSpan: "The teacher",
                leadKo: "그",
                acceptableAnswers: ["그 선생님은", "선생님은"],
              },
              {
                id: "s3-c2",
                sourceSpan: "gave the students clear instructions",
                leadKo: "학",
                acceptableAnswers: [
                  "학생들에게 분명한 지시를 주었다",
                  "학생들에게 명확한 지시를 주었다",
                  "학생들에게 분명한 지시를 내렸다",
                ],
              },
              {
                id: "s3-c3",
                sourceSpan:
                  "because the experiment required careful observation",
                leadKo: "실",
                acceptableAnswers: [
                  "실험이 주의 깊은 관찰을 요구했기 때문에",
                  "실험이 세심한 관찰을 요구했기 때문에",
                  "실험이 주의 깊은 관찰을 필요로 했기 때문에",
                ],
              },
            ],
          },
        },
      ],
    },
    {
      id: "p2",
      label: "Paragraph 2",
      text: [
        "Working together, the team finished the task before lunch.",
        "Excited about the results, the students thanked the teacher.",
        "The principal announced that the school would hold a special event next week.",
      ].join(" "),
      sentences: [
        {
          id: "s4",
          text: "Working together, the team finished the task before lunch.",
          structureAnswer: {
            subject: {
              accepted: ["the team", "team"],
            },
            verb: {
              accepted: ["finished"],
            },
            object: {
              accepted: ["the task", "task"],
            },
            complement: {
              accepted: [],
            },
            modifiers: [
              {
                span: "Working together",
                type: "분사구문",
                subtype: "participial_construction",
                targetType: "main_clause",
                target: "the team finished the task before lunch",
              },
              {
                span: "before lunch",
                type: "부사구",
                subtype: "prepositional_phrase",
                targetType: "verb_phrase",
                target: "finished",
              },
            ],
          },
          sentenceFunctionAnswer: {
            correct: "scene_setting",
            accepted: ["topic_sentence"],
            explanation:
              "새 문단의 첫 문장으로 팀의 행동 장면을 바로 열어 주는 문장이라 상황 제시로 보는 편이 더 자연스럽다.",
            clue: "새 문단 시작 / 행동 장면 도입",
          },
          translationAnswer: {
            referenceKo:
              "함께 작업하면서, 그 팀은 점심 전에 그 과제를 끝냈다.",
            acceptableKeywords: [
              "함께",
              "팀",
              "점심 전에",
              "과제",
              "끝냈다",
            ],
            notes: [
              "Working together는 분사구문으로 주절 전체를 꾸밈",
              "before lunch는 시간의 선후 관계를 나타냄",
            ],
            chunks: [
              {
                id: "s4-c1",
                sourceSpan: "Working together",
                leadKo: "함",
                acceptableAnswers: ["함께 작업하면서", "함께 일하면서"],
              },
              {
                id: "s4-c2",
                sourceSpan: "the team finished the task",
                leadKo: "그",
                acceptableAnswers: [
                  "그 팀은 그 과제를 끝냈다",
                  "그 팀은 과제를 끝냈다",
                  "팀은 그 과제를 끝냈다",
                ],
              },
              {
                id: "s4-c3",
                sourceSpan: "before lunch",
                leadKo: "점",
                acceptableAnswers: ["점심 전에"],
              },
            ],
          },
        },
        {
          id: "s5",
          text: "Excited about the results, the students thanked the teacher.",
          structureAnswer: {
            subject: {
              accepted: ["the students", "students"],
            },
            verb: {
              accepted: ["thanked"],
            },
            object: {
              accepted: ["the teacher", "teacher"],
            },
            complement: {
              accepted: [],
            },
            modifiers: [
              {
                span: "Excited about the results",
                type: "분사구문",
                subtype: "participial_construction",
                targetType: "main_clause",
                target: "the students thanked the teacher",
              },
            ],
          },
          sentenceFunctionAnswer: {
            correct: "supporting_detail",
            explanation:
              "앞 문장의 결과 이후에 이어지는 반응을 덧붙여 설명하므로 뒷받침 문장이다.",
            clue: "앞 문장 결과에 대한 추가 반응",
          },
          translationAnswer: {
            referenceKo:
              "결과에 신이 난 학생들은 그 선생님에게 감사했다.",
            acceptableKeywords: [
              "결과",
              "신이 난",
              "학생들",
              "선생님",
              "감사했다",
            ],
            notes: [
              "Excited about the results는 학생들의 상태를 나타내는 분사구문",
            ],
            chunks: [
              {
                id: "s5-c1",
                sourceSpan: "Excited about the results, the students",
                leadKo: "결",
                acceptableAnswers: [
                  "결과에 신이 난 학생들은",
                  "결과에 들뜬 학생들은",
                ],
              },
              {
                id: "s5-c2",
                sourceSpan: "thanked the teacher",
                leadKo: "그",
                acceptableAnswers: [
                  "그 선생님에게 감사했다",
                  "선생님께 감사했다",
                ],
              },
            ],
          },
        },
        {
          id: "s6",
          text: "The principal announced that the school would hold a special event next week.",
          structureAnswer: {
            subject: {
              accepted: ["The principal", "principal"],
            },
            verb: {
              accepted: ["announced"],
            },
            object: {
              accepted: [
                "that the school would hold a special event next week",
              ],
            },
            complement: {
              accepted: [],
            },
            modifiers: [
              {
                span: "special",
                subtype: "adjective_word",
                targetType: "head_noun",
                target: "event",
              },
              {
                span: "next week",
                type: "부사구",
                subtype: "other",
                targetType: "verb_phrase",
                target: "would hold",
              },
            ],
          },
          sentenceFunctionAnswer: {
            correct: "conclusion",
            accepted: ["supporting_detail"],
            explanation:
              "문단의 마지막에서 이후 전개를 정리해 주는 마무리 문장 역할을 한다. 다만 문맥에 따라 추가 정보로도 읽을 수 있어 supporting_detail을 허용값으로 둔다.",
            clue: "문단 마지막 / 향후 계획 제시 / 마무리",
          },
          translationAnswer: {
            referenceKo:
              "그 교장은 학교가 다음 주에 특별한 행사를 열 것이라고 발표했다.",
            acceptableKeywords: [
              "교장",
              "학교",
              "다음 주",
              "특별한 행사",
              "발표했다",
            ],
            notes: [
              "that 절은 announced의 목적어 역할",
              "next week는 hold를 수식하는 시간 표현",
              "special은 event를 꾸밈",
            ],
            chunks: [
              {
                id: "s6-c1",
                sourceSpan: "The principal",
                leadKo: "그",
                acceptableAnswers: ["그 교장은", "교장은"],
              },
              {
                id: "s6-c2",
                sourceSpan: "announced",
                leadKo: "발",
                acceptableAnswers: ["발표했다", "알렸다"],
              },
              {
                id: "s6-c3",
                sourceSpan:
                  "that the school would hold a special event next week",
                leadKo: "학",
                acceptableAnswers: [
                  "학교가 다음 주에 특별한 행사를 열 것이라고",
                  "학교가 다음 주에 특별한 행사를 개최할 것이라고",
                ],
              },
            ],
          },
        },
      ],
    },
  ],
  sentenceOrderItems: [
    {
      id: "order-1",
      kind: "mock_fixed_lead_reorder",
      title: "모의고사형 유닛 배열",
      instructions:
        "먼저 제시된 첫 번째 파트 뒤에 이어질 3개의 파트를 올바른 순서로 배열하세요.",
      exposeFullOriginal: false,
      displayMode: "cards",
      labelStyle: "letters",
      fixedLead: {
        id: "u1",
        type: "part",
        text: "The teacher gave the students clear instructions before the activity began.",
      },
      reorderUnits: [
        {
          id: "u4",
          type: "part",
          label: "A",
          text: "This helped the class save time and stay focused.",
        },
        {
          id: "u2",
          type: "part",
          label: "B",
          text: "First, each group chose one member to write down the team's ideas.",
        },
        {
          id: "u3",
          type: "part",
          label: "C",
          text: "As a result, most groups were able to start the task without confusion.",
        },
      ],
      correctOrder: ["u2", "u3", "u4"],
      explanation: {
        summary:
          "활동 직후의 첫 단계가 먼저 오고, 그 결과가 이어진 뒤, 마지막에 그 효과를 정리하는 흐름이다.",
        koreanHint: "First, As a result, This 같은 연결 단서를 보세요.",
      },
    },
    {
      id: "order-2",
      kind: "naesin_excerpt_restore",
      title: "일반 내신형 문장 배열",
      instructions:
        "섞여 있는 문장들을 자연스러운 흐름에 맞게 배열하세요.",
      exposeFullOriginal: false,
      displayMode: "cards",
      labelStyle: "letters",
      excerptMeta: {
        sourceTitle: "내신형 발췌 샘플",
        schoolLevel: "high",
        examType: "practice",
        note: "시험형 발췌 문장 배열",
      },
      reorderUnits: [
        {
          id: "s2",
          type: "sentence",
          label: "A",
          text: "They were excited about the results of the experiment.",
        },
        {
          id: "s1",
          type: "sentence",
          label: "B",
          text: "The team finished the task before lunch.",
        },
        {
          id: "s3",
          type: "sentence",
          label: "C",
          text: "After that, they thanked the teacher for her help.",
        },
        {
          id: "s4",
          type: "sentence",
          label: "D",
          text: "The classroom soon became lively with cheerful conversation.",
        },
      ],
      correctOrder: ["s1", "s2", "s3", "s4"],
      explanation: {
        summary:
          "과제 완료가 먼저 나오고, 그 결과에 대한 반응이 이어진 뒤, 감사 표현과 마지막 분위기 묘사로 마무리된다.",
        koreanHint:
          "시간 순서와 감정 흐름, After that 같은 연결 표현을 먼저 보세요.",
      },
    },
  ],
};
