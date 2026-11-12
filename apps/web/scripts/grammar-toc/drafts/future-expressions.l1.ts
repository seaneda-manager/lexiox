// 미래 표현 (will · be going to) L1 초안. 업로드: npx tsx scripts/grammar-toc/upsert-draft.ts scripts/grammar-toc/drafts/future-expressions.l1.ts
const ex = (en: string, ko: string, tag = '', note = '', wrong = false) => ({ en, ko, tag, note, wrong });
const ch = (en: string, ko: string) => ({ en, ko });
const pc = (stem: string, stemKo: string, level: string, c: [string, string][], answerIndex: number, explanationKo: string, kind = 'pick_correct') => ({
  kind, stem, level, stemKo, choices: c.map(([en, ko]) => ch(en, ko)), answerIndex, explanationKo,
});
const CNT = [ch('None', '0개'), ch('One', '1개'), ch('Two', '2개'), ch('Three', '3개')];

export default {
  conceptKey: 'future-expressions',
  level: 1,
  lesson: {
    version: 1,
    status: 'draft',
    topic: '미래 표현 - 1부',
    explanation: {
      titleKo: '미래 표현 — will · be going to',
      summaryEn: 'We use will or be going to + a base verb to talk about the future.',
      summaryKo: '앞으로 일어날 일은 「will + 동사원형」이나 「be going to + 동사원형」으로 말합니다.',
      rules: [
        { en: 'Use will + a base verb. The form of will never changes.', ko: '「will + 동사원형」은 주어가 무엇이든 will의 모양이 똑같습니다. (I will go. / She will go.)' },
        { en: 'Use am, are, or is + going to + a base verb for plans.', ko: '「be going to + 동사원형」은 주어에 맞게 am, are, is를 씁니다. 이미 정해 둔 계획을 말할 때 자주 씁니다.' },
        { en: 'Put not after will or after be to make a negative sentence.', ko: '부정문은 will 뒤에 not(will not = won\'t), 또는 be동사 뒤에 not을 붙입니다.' },
        { en: 'Put will or be before the subject to ask a question.', ko: '의문문은 will이나 be동사를 주어 앞으로 보냅니다. (Will you help me? / Are you going to swim?)' },
      ],
      examples: [ex('I will visit my aunt tomorrow.', '나는 내일 이모를 방문할 것이다.'), ex('She is going to buy a new bike.', '그녀는 새 자전거를 살 예정이다.'), ex('Will you help me?', '나를 도와줄래?')],
    },
    exampleGroups: [
      { title: 'will + 동사원형', note: '주어가 달라져도 will은 그대로, 뒤에는 동사원형입니다.', examples: [
        ex('I will visit my aunt tomorrow.', '나는 내일 이모를 방문할 것이다.', 'I + will', '주어가 I여도 will + 원형입니다.'),
        ex('She will call you tonight.', '그녀가 오늘 밤 네게 전화할 것이다.', 'she + will', 'will은 she여도 모양이 같고 call은 원형입니다.'),
        ex('They will play tennis next week.', '그들은 다음 주에 테니스를 칠 것이다.', 'they + will', 'next week 같은 미래 시간 표현과 함께 씁니다.'),
      ] },
      { title: 'be going to + 동사원형', note: 'be동사는 주어에 맞게 am, are, is로 바꿉니다.', examples: [
        ex('I am going to study tonight.', '나는 오늘 밤 공부할 예정이다.', 'I am going to', '주어가 I이면 am입니다.'),
        ex('He is going to cook dinner.', '그는 저녁을 요리할 예정이다.', 'he is going to', '주어가 he이면 is입니다.'),
        ex('We are going to travel next month.', '우리는 다음 달에 여행할 예정이다.', 'we are going to', '주어가 we이면 are입니다.'),
      ] },
      { title: '부정문', note: 'will 뒤나 be동사 뒤에 not.', examples: [
        ex('I will not be late.', '나는 늦지 않을 것이다.', 'will not', 'will 바로 뒤에 not을 씁니다.'),
        ex("She won't come tomorrow.", '그녀는 내일 오지 않을 것이다.', "won't", 'will not의 줄임말은 won\'t입니다.'),
        ex('He is not going to join the club.', '그는 동아리에 가입하지 않을 것이다.', 'be not going to', 'be동사 뒤에 not을 씁니다.'),
      ] },
      { title: '의문문', note: 'will이나 be동사를 주어 앞으로.', examples: [
        ex('Will you help me?', '나를 도와줄래?', 'Will + 주어', 'will을 주어 앞으로 보냅니다.'),
        ex('Will they come to the party?', '그들이 파티에 올까?', 'Will + 주어', '뒤의 동사는 원형 come입니다.'),
        ex('Are you going to play soccer?', '너는 축구할 거니?', 'Are + 주어 + going to', 'be동사를 주어 앞으로 보냅니다.'),
      ] },
      { title: '틀린 예', note: 'will 뒤에는 동사원형, be going to에는 be동사가 꼭 필요합니다.', examples: [
        ex('She will goes to Busan.', '「will + 동사원형」 → She will go to Busan.', '', '', true),
        ex('They will to visit Jeju.', 'will 뒤에는 to가 없습니다 → They will visit Jeju.', '', '', true),
        ex('He are going to visit us.', '주어가 he이면 is → He is going to visit us.', '', '', true),
      ] },
    ],
    cramText:
      '■ 핵심 요약\n앞으로 일어날 일은 「will + 동사원형」이나 「be going to + 동사원형」으로 말합니다.\n\n■ 규칙\n1. will은 주어가 무엇이든 모양이 같고, 뒤에는 동사원형이 옵니다.\n2. be going to는 주어에 맞게 am, are, is를 쓰고, 뒤에는 동사원형이 옵니다.\n3. 부정문은 will 뒤나 be동사 뒤에 not을 붙입니다. (will not = won\'t)\n4. 의문문은 will이나 be동사를 주어 앞으로 보냅니다.\n\n■ 예문 뜻\n나는 내일 이모를 방문할 것이다.\n그는 저녁을 요리할 예정이다.\n나를 도와줄래?',
    blanks: [
      { text: '앞일을 말할 때는 will 뒤에 ___을 씁니다.', answer: '동사원형', hint: '네 글자' },
      { text: 'be going to 뒤에는 동사의 ___이 옵니다.', answer: '원형', hint: '두 글자' },
      { text: 'will의 부정문은 will 뒤에 ___을 붙입니다.', answer: 'not', hint: 'n___' },
      { text: 'will의 의문문은 will을 ___ 앞으로 보냅니다.', answer: '주어', hint: '두 글자' },
    ],
    drillFill: [
      { level: 'basic', sentence: 'I ___ visit my grandmother tomorrow.', answer: 'will', choices: ['will', 'am', 'to'], ko: '나는 내일 할머니를 방문할 것이다.', noteKo: '앞일은 will + 동사원형입니다.', hint: '미래' },
      { level: 'basic', sentence: 'She is ___ to buy a new bike.', answer: 'going', choices: ['go', 'goes', 'going'], ko: '그녀는 새 자전거를 살 예정이다.', noteKo: 'be going to 구조입니다.', hint: 'be ___ to' },
      { level: 'basic', sentence: 'We will ___ at home tonight.', answer: 'stay', choices: ['stays', 'stay', 'staying'], ko: '우리는 오늘 밤 집에 있을 것이다.', noteKo: 'will 뒤에는 동사원형입니다.', hint: '원형' },
      { level: 'intermediate', sentence: 'He ___ going to cook dinner.', answer: 'is', choices: ['is', 'are', 'am'], ko: '그는 저녁을 요리할 예정이다.', noteKo: '주어가 he이면 is입니다.', hint: '주어 he' },
      { level: 'intermediate', sentence: 'They ___ not come to the party tomorrow.', answer: 'will', choices: ['do', 'are', 'will'], ko: '그들은 내일 파티에 오지 않을 것이다.', noteKo: '뒤에 동사원형 come이 있으므로 will not입니다.', hint: '미래 부정' },
      { level: 'intermediate', sentence: '___ you help me with my homework?', answer: 'Will', choices: ['Are', 'Will', 'Is'], ko: '내 숙제를 도와줄래?', noteKo: '뒤에 동사원형 help가 있으므로 Will로 시작합니다.', hint: '부탁' },
      { level: 'advanced', sentence: '___ she going to take the test next week?', answer: 'Is', choices: ['Does', 'Is', 'Will'], ko: '그녀는 다음 주에 시험을 볼 예정이니?', noteKo: 'be going to 의문문은 be동사를 주어 앞으로 보냅니다.', hint: '주어 she' },
      { level: 'advanced', sentence: 'My brother is going to ___ a doctor.', answer: 'be', choices: ['is', 'being', 'be'], ko: '내 형은 의사가 될 것이다.', noteKo: 'to 뒤에는 동사원형 be가 옵니다.', hint: '원형' },
    ],
    drillFix: [
      { level: 'basic', sentence: 'She will goes to Busan.', wrong: 'goes', correct: ['go'], reasonChoices: ['will 뒤에는 동사원형을 씁니다.', '주어가 she라서 goes를 씁니다.', 'Busan 앞에 to가 필요합니다.'], reasonIndex: 0, ko: 'She will go to Busan. → will 뒤에는 동사원형' },
      { level: 'intermediate', sentence: 'He are going to visit us.', wrong: 'are', correct: ['is'], reasonChoices: ['going 앞에 will이 필요합니다.', '주어가 he이면 be동사는 is입니다.', 'visit 뒤에 not이 필요합니다.'], reasonIndex: 1, ko: 'He is going to visit us. → 주어 he에는 is' },
      { level: 'intermediate', sentence: 'They will to visit Jeju.', wrong: 'to', correct: [''], reasonChoices: ['will 뒤에는 to 없이 동사원형을 씁니다.', '주어가 복수라서 to가 필요합니다.', 'visit은 명사라서 to가 필요합니다.'], reasonIndex: 0, ko: 'They will visit Jeju. → will 뒤에는 to가 없다' },
    ],
    questions: [
      pc('Choose the correct sentence.', '올바른 문장을 고르세요.', 'basic', [['I will to go tomorrow.', '나는 내일 갈 것이다.'], ['I will go tomorrow.', '나는 내일 갈 것이다.'], ['I will goes tomorrow.', '나는 내일 갈 것이다.'], ['I going tomorrow.', '나는 내일 갈 것이다.']], 1, 'will 뒤에는 to 없이 동사원형을 씁니다.'),
      pc('Choose the correct sentence.', '올바른 문장을 고르세요.', 'basic', [['He going to visit Jeju.', '그는 제주도를 방문할 예정이다.'], ['He is go to visit Jeju.', '그는 제주도를 방문할 예정이다.'], ['He are going to visit Jeju.', '그는 제주도를 방문할 예정이다.'], ['He is going to visit Jeju.', '그는 제주도를 방문할 예정이다.']], 3, 'be going to에는 주어에 맞는 be동사가 필요합니다. he에는 is입니다.'),
      pc('Choose the correct sentence.', '올바른 문장을 고르세요.', 'basic', [['She will comes not.', '그녀는 오지 않을 것이다.'], ['She not will come.', '그녀는 오지 않을 것이다.'], ['She will not come.', '그녀는 오지 않을 것이다.'], ["She won't comes.", '그녀는 오지 않을 것이다.']], 2, '부정문은 will 바로 뒤에 not, 그 뒤에는 동사원형입니다.'),
      pc('Choose the correct sentence.', '올바른 문장을 고르세요.', 'intermediate', [['Will you help me?', '나를 도와줄래?'], ['You will help me?', '나를 도와줄래?'], ['Do you will help me?', '나를 도와줄래?'], ['Are you will help me?', '나를 도와줄래?']], 0, '의문문은 will을 주어 앞으로 보냅니다. do나 are를 더 붙이지 않습니다.'),
      pc('Choose the correct sentence.', '올바른 문장을 고르세요.', 'intermediate', [['Is you going to play soccer?', '너는 축구할 거니?'], ['Are you going to play soccer?', '너는 축구할 거니?'], ['Do you going to play soccer?', '너는 축구할 거니?'], ['Are you go to play soccer?', '너는 축구할 거니?']], 1, '주어가 you이면 Are로 시작하고 going to를 그대로 씁니다.'),
      pc('Choose the sentence that does not talk about the future.', '미래를 나타내지 않는 문장을 고르세요.', 'intermediate', [['I will meet Tom tomorrow.', '나는 내일 톰을 만날 것이다.'], ['He goes to school every day.', '그는 매일 학교에 간다.'], ['We are going to travel next month.', '우리는 다음 달에 여행할 예정이다.'], ['She will call you tonight.', '그녀가 오늘 밤 네게 전화할 것이다.']], 1, '두 번째는 매일 반복되는 일을 말하는 현재형입니다.', 'pick_different'),
      pc('Choose the sentence that is wrong.', '틀린 문장을 고르세요.', 'intermediate', [['He will visit us.', '그는 우리를 방문할 것이다.'], ['I will not be late.', '나는 늦지 않을 것이다.'], ['She will goes home.', '그녀는 집에 갈 것이다.'], ['Will they come?', '그들이 올까?']], 2, 'will 뒤에는 동사원형을 써야 하므로 will goes는 will go로 고쳐야 합니다.', 'pick_different'),
      { kind: 'count_wrong', stem: 'How many sentences are wrong?\n① I will go.\n② She will goes.\n③ They are going to eat.', level: 'basic', stemKo: '틀린 문장의 개수를 고르세요.', choices: CNT, answerIndex: 1, explanationKo: '②만 will goes가 틀렸고 will go여야 하므로 틀린 문장은 1개입니다.' },
      { kind: 'count_wrong', stem: 'How many sentences are wrong?\n① He will not comes.\n② I am going to study.\n③ We going to swim.\n④ Will you help me?', level: 'advanced', stemKo: '틀린 문장의 개수를 고르세요.', choices: CNT, answerIndex: 2, explanationKo: '①은 will not come, ③은 We are going to swim으로 고쳐야 하므로 틀린 문장은 2개입니다.' },
      pc('Why is the sentence "He will goes to school." wrong?', '이 문장이 틀린 이유로 올바른 설명을 고르세요.', 'intermediate', [['Because go should be going.', 'go를 going으로 바꿔야 하기 때문에'], ['Because he must be they.', 'he를 they로 바꿔야 하기 때문에'], ['Because tomorrow is missing.', 'tomorrow가 빠졌기 때문에'], ['Because will must be followed by the base form.', 'will 뒤에는 동사원형을 써야 하기 때문에']], 3, 'will 뒤에는 주어와 상관없이 동사원형을 씁니다. goes → go.', 'reason'),
    ],
    popupQuiz: [
      { prompt: 'I ___ visit my aunt tomorrow.', answer: 'will', options: ['am', 'to'], hint_ko: '앞일' },
      { prompt: 'She is ___ to buy a bike.', answer: 'going', options: ['go', 'goes'], hint_ko: 'be ___ to' },
      { prompt: 'I will ___ late. (부정문: will not be)', answer: 'not be', options: ['be not', 'not is'], hint_ko: 'will 뒤' },
      { prompt: '___ you help me?', answer: 'Will', options: ['Do', 'Is'], hint_ko: '부탁' },
    ],
    writtenTasks: [
      { kind: 'fix_write', level: 'basic', prompt: 'He will goes home.', promptKo: '틀린 곳을 찾아 문장 전체를 바르게 고쳐 쓰시오.', answers: ['He will go home.'], noteKo: 'will 뒤에는 동사원형입니다.' },
      { kind: 'rewrite', level: 'basic', prompt: 'You will help me.', promptKo: '의문문으로 바꿔 쓰시오.', answers: ['Will you help me?'], noteKo: 'will을 주어 앞으로 보냅니다.' },
    ],
    topPoints: [{ text: 'will 뒤에는 주어와 상관없이 동사원형이 온다. goes, to, ing를 붙이면 틀린다. be going to는 be동사가 주어에 맞아야 한다.', example: { en: 'She will go. / She is going to go.', ko: '그녀는 갈 것이다.' } }],
    examPoints: [],
    deepDive: [],
    lecture: [
      { type: 'text', text: '미래 표현 — will · be going to', narration: '오늘은 앞으로 일어날 일을 말하는 방법을 배워요. [en]will[/en]과 [en]be going to[/en] 두 가지예요.' },
      { type: 'board', title: 'will + 동사원형', lines: ['I [b]will[/b] visit my aunt.', 'She [b]will[/b] call you.', 'will 뒤에는 동사원형!'], narration: '[en]will[/en] 뒤에는 동사원형이 와요. [en]I will visit my aunt.[/en] 나는 이모를 방문할 거야. 주어가 [en]she[/en]여도 [en]will[/en]은 그대로예요.' },
      { type: 'board', title: 'be going to + 동사원형', lines: ['I [b]am[/b] going to study.', 'He [b]is[/b] going to cook.', 'We [b]are[/b] going to travel.'], narration: '[en]be going to[/en]는 이미 정해 둔 계획을 말할 때 자주 써요. [en]be[/en]동사는 주어에 맞게 [en]am[/en], [en]are[/en], [en]is[/en]로 바꿔요. 뒤에는 동사원형이 와요.' },
      { type: 'board', title: '부정문', lines: ['I will [b]not[/b] be late.', "will not = won't", 'He is [b]not[/b] going to join.'], narration: '부정문은 [en]will[/en] 바로 뒤에 [en]not[/en]을 붙여요. [en]will not[/en]은 줄여서 [en]won\'t[/en]라고도 해요. [en]be going to[/en]는 [en]be[/en]동사 뒤에 [en]not[/en]을 붙여요.' },
      { type: 'board', title: '의문문', lines: ['[b]Will[/b] you help me?', '[b]Are[/b] you going to play soccer?', 'will, be를 주어 앞으로!'], narration: '의문문은 [en]will[/en]이나 [en]be[/en]동사를 주어 앞으로 보내요. [en]Will you help me?[/en] 나를 도와줄래? [en]Are you going to play soccer?[/en] 너는 축구할 거니?' },
      { type: 'board', title: '자주 틀리는 문장', lines: ['× She will [b]goes[/b] home.', '○ She will [b]go[/b] home.', '× They will [b]to[/b] visit Jeju.', '× He [b]are[/b] going to visit us.'], narration: '[en]will[/en] 뒤에는 동사원형이에요. [en]will goes[/en]는 틀리고 [en]will go[/en]가 맞아요. [en]will to[/en]처럼 [en]to[/en]를 붙이면 안 돼요. [en]He are going to[/en]는 틀리고 [en]He is going to[/en]가 맞아요.' },
      { type: 'text', text: '정리: will + 동사원형 / be going to + 동사원형', narration: '정리할게요. 앞일은 [en]will[/en] 뒤에 동사원형, 또는 [en]be going to[/en] 뒤에 동사원형으로 말해요. 부정문은 [en]not[/en]을 뒤에, 의문문은 [en]will[/en]이나 [en]be[/en]를 앞으로 보내요.' },
    ],
  },
};
