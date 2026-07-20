export type GrammarJudgmentLabelOption = {
  id: string;
  text: string;
};

export type GrammarJudgmentFactorOption = {
  id: string;
  text: string;
};

export type GrammarJudgmentChoiceOption = {
  id: string;
  text: string;
};

export type PassageGrammarTarget = {
  id: string;
  sentenceId: string;
  sentenceText: string;

  /**
   * UI에서 빈칸/선택 슬롯으로 보일 자리
   * 예: who / that, because / because of
   */
  blankLabel: string;

  /**
   * UI 하이라이트/대체용 텍스트
   * 실제 렌더 단계에서 span 기준으로 쓸 수 있음
   */
  targetText: string;

  prompt: string;

  choices: GrammarJudgmentChoiceOption[];
  correctChoiceId: string;

  /**
   * 학생이 고를 문법 label
   * 초기 demo에서는 1개 선택 기준
   */
  labelOptions: GrammarJudgmentLabelOption[];
  correctLabelIds: string[];

  /**
   * 학생이 고를 핵심 판단 요소
   * 초기 demo에서는 1~2개 선택 기준
   */
  factorOptions: GrammarJudgmentFactorOption[];
  correctFactorIds: string[];

  /**
   * 왜 다른 보기가 틀렸는지 고르는 영역
   * 초기 demo에서는 optional
   */
  wrongReasonOptions?: GrammarJudgmentFactorOption[];
  correctWrongReasonIds?: string[];

  explanation?: {
    summary?: string;
    koreanHint?: string;
  };
};

export const MOCK_GRAMMAR_TARGETS_DEMO: PassageGrammarTarget[] = [
  {
    id: "gt-s1-relative-pronoun",
    sentenceId: "s1",
    sentenceText: "The boy who is wearing a blue cap ran quickly to the store.",
    blankLabel: "관계사 선택",
    targetText: "who",
    prompt: "빈칸에 들어갈 가장 적절한 관계사를 고르세요.",
    choices: [
      { id: "choice-who", text: "who" },
      { id: "choice-which", text: "which" },
    ],
    correctChoiceId: "choice-who",
    labelOptions: [
      { id: "label-rel-human-subj", text: "사람-주격 관계대명사" },
      { id: "label-rel-thing-subj", text: "사물-주격 관계대명사" },
      { id: "label-rel-adv-where", text: "관계부사" },
      { id: "label-rel-human-obj", text: "사람-목적격 관계대명사" },
    ],
    correctLabelIds: ["label-rel-human-subj"],
    factorOptions: [
      { id: "factor-ante-human", text: "선행사가 사람이다" },
      { id: "factor-clause-needs-subj", text: "관계사절 안에 주어 자리가 비어 있다" },
      { id: "factor-ante-thing", text: "선행사가 사물이다" },
      { id: "factor-complete-clause", text: "뒤 절이 완전하다" },
    ],
    correctFactorIds: ["factor-ante-human", "factor-clause-needs-subj"],
    wrongReasonOptions: [
      { id: "wrong-which-human", text: "which는 사람 선행사에 쓰지 않는다" },
      { id: "wrong-clause-complete", text: "뒤 절이 완전하므로 관계부사를 써야 한다" },
      { id: "wrong-object-gap", text: "관계사절 안에 목적어 자리가 비어 있다" },
    ],
    correctWrongReasonIds: ["wrong-which-human"],
    explanation: {
      summary:
        "선행사 the boy가 사람이므로 who가 맞고, 관계사절 안에서는 is 앞 주어 자리가 비어 있다.",
      koreanHint: "사람 선행사 + 주격 빈자리인지 먼저 본다.",
    },
  },
  {
    id: "gt-s3-because-vs-because-of",
    sentenceId: "s3",
    sentenceText:
      "The teacher gave the students clear instructions because the experiment required careful observation.",
    blankLabel: "이유 표현 선택",
    targetText: "because",
    prompt: "빈칸에 들어갈 가장 적절한 이유 표현을 고르세요.",
    choices: [
      { id: "choice-because", text: "because" },
      { id: "choice-because-of", text: "because of" },
    ],
    correctChoiceId: "choice-because",
    labelOptions: [
      { id: "label-subordinator-reason", text: "이유 접속사" },
      { id: "label-preposition-reason", text: "이유 전치사" },
      { id: "label-contrast-conj", text: "양보 접속사" },
      { id: "label-time-prep", text: "시간 전치사" },
    ],
    correctLabelIds: ["label-subordinator-reason"],
    factorOptions: [
      { id: "factor-following-clause", text: "뒤에 주어 + 동사가 있는 절이 온다" },
      { id: "factor-following-np", text: "뒤에 명사구만 온다" },
      { id: "factor-reason-meaning", text: "이유 의미가 필요하다" },
      { id: "factor-time-meaning", text: "시간 의미가 필요하다" },
    ],
    correctFactorIds: ["factor-following-clause", "factor-reason-meaning"],
    wrongReasonOptions: [
      { id: "wrong-because-of-clause", text: "because of 뒤에는 절이 직접 올 수 없다" },
      { id: "wrong-contrast-meaning", text: "양보 의미가 필요하므로 although가 와야 한다" },
      { id: "wrong-time-slot", text: "시간 부사절 자리이므로 when이 와야 한다" },
    ],
    correctWrongReasonIds: ["wrong-because-of-clause"],
    explanation: {
      summary:
        "because 뒤에는 the experiment required ... 처럼 완전한 절이 오므로 because가 맞다.",
      koreanHint: "절이면 접속사, 명사구면 전치사를 먼저 본다.",
    },
  },
  {
    id: "gt-s4-participle-phrase",
    sentenceId: "s4",
    sentenceText:
      "Working together, the team finished the task before lunch.",
    blankLabel: "분사구문 선택",
    targetText: "Working",
    prompt: "빈칸에 들어갈 가장 적절한 분사 형태를 고르세요.",
    choices: [
      { id: "choice-working", text: "Working" },
      { id: "choice-worked", text: "Worked" },
    ],
    correctChoiceId: "choice-working",
    labelOptions: [
      { id: "label-participle-active", text: "능동 분사구문" },
      { id: "label-participle-passive", text: "수동 분사구문" },
      { id: "label-gerund-subject", text: "동명사 주어" },
      { id: "label-adverb-clause", text: "부사절" },
    ],
    correctLabelIds: ["label-participle-active"],
    factorOptions: [
      { id: "factor-team-does-action", text: "뒤 주어 the team이 함께 작업하는 주체이다" },
      { id: "factor-team-receives-action", text: "뒤 주어 the team이 작업을 당하는 대상이다" },
      { id: "factor-participle-subject", text: "분사구문의 의미상 주어는 뒤 주어와 같다" },
      { id: "factor-passive-needed", text: "수동 의미이므로 p.p.가 필요하다" },
    ],
    correctFactorIds: ["factor-team-does-action", "factor-participle-subject"],
    wrongReasonOptions: [
      { id: "wrong-worked-passive", text: "Worked는 수동 의미처럼 읽혀 문맥에 맞지 않는다" },
      { id: "wrong-gerund-main-subj", text: "문장 주어 자리에 온 동명사이므로 Working이 맞다" },
      { id: "wrong-finite-verb-needed", text: "주절 동사가 없으므로 worked가 필요하다" },
    ],
    correctWrongReasonIds: ["wrong-worked-passive"],
    explanation: {
      summary:
        "함께 작업하는 것은 the team이므로 능동 의미의 현재분사 Working이 맞다.",
      koreanHint: "분사구문의 의미상 주어가 뒤 주어와 맞는지 본다.",
    },
  },
  {
    id: "gt-s5-emotion-participle",
    sentenceId: "s5",
    sentenceText:
      "Excited about the results, the students thanked the teacher.",
    blankLabel: "감정분사 선택",
    targetText: "Excited",
    prompt: "빈칸에 들어갈 가장 적절한 감정분사를 고르세요.",
    choices: [
      { id: "choice-excited", text: "Excited" },
      { id: "choice-exciting", text: "Exciting" },
    ],
    correctChoiceId: "choice-excited",
    labelOptions: [
      { id: "label-emotion-pp", text: "감정분사 p.p." },
      { id: "label-emotion-ing", text: "감정분사 -ing" },
      { id: "label-participle-passive", text: "수동 분사구문" },
      { id: "label-plain-adjective", text: "일반 형용사" },
    ],
    correctLabelIds: ["label-emotion-pp"],
    factorOptions: [
      { id: "factor-students-feel", text: "students가 감정을 느끼는 주체이다" },
      { id: "factor-results-cause", text: "results가 감정을 유발하는 원인이다" },
      { id: "factor-pp-for-feeler", text: "감정을 느끼는 주체에는 p.p.를 쓴다" },
      { id: "factor-ing-for-cause", text: "감정을 느끼는 주체에는 -ing를 쓴다" },
    ],
    correctFactorIds: ["factor-students-feel", "factor-pp-for-feeler"],
    wrongReasonOptions: [
      { id: "wrong-exciting-cause", text: "Exciting은 감정을 일으키는 대상에 쓴다" },
      { id: "wrong-pp-passive-only", text: "p.p.는 항상 수동태일 때만 쓴다" },
      { id: "wrong-results-subject", text: "results가 문장의 주어이므로 exciting이 맞다" },
    ],
    correctWrongReasonIds: ["wrong-exciting-cause"],
    explanation: {
      summary:
        "학생들이 흥분한 상태이므로 감정을 느끼는 주체용 p.p.인 excited가 맞다.",
      koreanHint: "사람이 감정을 느끼면 p.p., 사물/상황이 유발하면 -ing.",
    },
  },
  {
    id: "gt-s6-that-vs-what",
    sentenceId: "s6",
    sentenceText:
      "The principal announced that the school would hold a special event next week.",
    blankLabel: "명사절 연결어 선택",
    targetText: "that",
    prompt: "빈칸에 들어갈 가장 적절한 연결어를 고르세요.",
    choices: [
      { id: "choice-that", text: "that" },
      { id: "choice-what", text: "what" },
    ],
    correctChoiceId: "choice-that",
    labelOptions: [
      { id: "label-that-noun-clause", text: "명사절 접속사 that" },
      { id: "label-what-noun-clause", text: "선행사를 포함한 what절" },
      { id: "label-relative-pronoun", text: "관계대명사" },
      { id: "label-adverb-clause", text: "부사절 접속사" },
    ],
    correctLabelIds: ["label-that-noun-clause"],
    factorOptions: [
      { id: "factor-complete-sentence", text: "뒤 절이 주어+동사를 갖춘 완전한 문장이다" },
      { id: "factor-object-of-announced", text: "announced의 목적어 역할을 하는 명사절이다" },
      { id: "factor-incomplete-clause", text: "뒤 절에 필수 성분이 빠져 있다" },
      { id: "factor-no-antecedent-needed", text: "선행사를 포함한 관계대명사가 필요하다" },
    ],
    correctFactorIds: ["factor-complete-sentence", "factor-object-of-announced"],
    wrongReasonOptions: [
      { id: "wrong-what-incomplete", text: "what은 뒤 절이 불완전할 때 쓴다" },
      { id: "wrong-relative-needs-antecedent", text: "관계대명사는 선행사와 연결되어야 한다" },
      { id: "wrong-adverb-clause-purpose", text: "목적을 나타내는 부사절이 필요하다" },
    ],
    correctWrongReasonIds: ["wrong-what-incomplete"],
    explanation: {
      summary:
        "announced 뒤에는 완전한 절이 목적어로 오므로 명사절 접속사 that이 맞다.",
      koreanHint: "뒤 절 완전성 + 주절 동사의 목적어 역할인지 본다.",
    },
  },
];
