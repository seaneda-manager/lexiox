// 중학내신 문법 레슨 초안 (동아 윤정미 M2 2학기 5과·6과). 검수 후 확정하기 전에는 학생에게 보이지 않는다.
// 문제 난이도: basic(형태 확인) → intermediate(오류 고치기·구별) → advanced(내신 고난도·구문 전환·개수 세기)
import type { GrammarLesson } from '../../models/middle-naesin/grammar-lesson';
import { EXTRA_QUESTIONS } from './grammar-lesson-extra-questions';

type Draft = { lessonNumber: number; sortOrder: number; lesson: GrammarLesson };

const opt = (en: string, ko?: string) => ({ en, ko });

export const GRAMMAR_LESSON_DRAFTS: Draft[] = [
  // ───────────────────────── 5과 · so ~ that ─────────────────────────
  {
    lessonNumber: 5,
    sortOrder: 0,
    lesson: {
      version: 1,
      status: 'draft',
      topic: 'so ~ that 구문',
      explanation: {
        titleKo: 'so ~ that 구문 (너무 ~해서 …하다)',
        summaryEn:
          "We use 'so + adjective/adverb + that + subject + verb' to show a result. It means 'so ... that ...'.",
        summaryKo:
          "'so + 형용사/부사 + that + 주어 + 동사'는 '너무 ~해서 (그 결과) …하다'라는 뜻으로, 원인과 결과를 나타낸다.",
        rules: [
          {
            en: 'so + adjective/adverb + that + S + V',
            ko: 'so 바로 뒤에는 형용사/부사가 오고, that 뒤에는 결과를 나타내는 절(주어 + 동사)이 온다.',
          },
          {
            en: "Never use 'very' with 'so'. (× so very tall that)",
            ko: 'so와 very는 함께 쓰지 않는다. "so very"는 절대 안 된다. (× so very tall that ...)',
          },
          {
            en: "so ... that S can't = too ... to",
            ko: "'so ~ that 주어 can't ...'는 'too ~ to ...'로 바꿔 쓸 수 있다. (that절이 있으면 too를 쓰지 않는다.)",
          },
          {
            en: "'so + adjective + a + noun' is not used. Use 'such + a + adjective + noun'.",
            ko: "'a + 형용사 + 명사'가 뒤에 오면 so가 아니라 such를 쓴다. (such a kind girl)",
          },
          {
            en: "'so that + S + can/will' shows a purpose. It is different from 'so ~ that'.",
            ko: "'so that + 주어 + can/will ...'은 '~하도록, ~하기 위해서'(목적)이다. so와 that 사이에 형용사/부사가 있으면 결과 구문이다.",
          },
        ],
        examples: [
          { en: 'I was so tired that I fell asleep on the bus.', ko: '나는 너무 피곤해서 버스에서 잠들었다.' },
          { en: "The bag was so heavy that I couldn't carry it.", ko: '그 가방은 너무 무거워서 나는 그것을 들 수 없었다.' },
          { en: 'He ran so fast that nobody could catch him.', ko: '그는 너무 빨리 달려서 아무도 그를 잡을 수 없었다.' },
          {
            en: "The soup was so hot that I couldn't eat it. = The soup was too hot for me to eat.",
            ko: '그 수프는 너무 뜨거워서 나는 먹을 수 없었다.',
          },
        ],
      },
      cramText:
        "We use 'so + adjective/adverb + that + subject + verb' to show a result.\nNever use 'very' with 'so'.\nThe bag was so heavy that I couldn't carry it.\nHe ran so fast that nobody could catch him.",
      blanks: [
        { text: "We use 'so + adjective/adverb + ___ + subject + verb' to show a result.", answer: 'that', hint: 't___' },
        { text: "We never use '___' with 'so'. (× so very tired that)", answer: 'very', hint: 'v___' },
        { text: "The bag was so ___ that I couldn't carry it.", answer: 'heavy', hint: 'h____' },
        { text: 'He ran so ___ that nobody could catch him.', answer: 'fast', hint: 'f___' },
      ],
      drillFill: [
        { level: 'basic', sentence: 'I was so hungry ___ I ate three sandwiches.', answer: 'that', ko: '나는 너무 배가 고파서 샌드위치를 세 개 먹었다.' },
        { level: 'basic', sentence: 'The movie was so ___ that we all cried.', answer: 'sad', choices: ['sad', 'sadly'], ko: '그 영화는 너무 슬퍼서 우리 모두 울었다.' },
        { level: 'intermediate', sentence: 'The math test was so difficult ___ nobody finished it.', answer: 'that', ko: '수학 시험이 너무 어려워서 아무도 끝내지 못했다.' },
        { level: 'intermediate', sentence: "She spoke so ___ that I couldn't hear her.", answer: 'quietly', choices: ['quiet', 'quietly'], ko: '그녀는 너무 조용히 말해서 나는 그녀의 말을 들을 수 없었다.', noteKo: 'spoke(동사)를 꾸미는 말' },
        { level: 'advanced', sentence: 'The box was so heavy that I ___ lift it.', answer: "couldn't", choices: ['could', "couldn't"], ko: '그 상자는 너무 무거워서 나는 들 수 없었다.' },
        { level: 'advanced', sentence: 'The tea was so hot that I couldn\'t drink it. = The tea was ___ hot for me to drink.', answer: 'too', ko: '그 차는 너무 뜨거워서 나는 마실 수 없었다.', hint: 't__' },
      ],
      drillFix: [
        {
          level: 'basic',
          sentence: 'I was so very tired that I went to bed early.',
          wrong: 'very',
          correct: [''],
          reasonChoices: ['so와 very는 함께 쓰지 않는다', 'that 뒤에는 명사가 와야 한다', 'tired는 부사로 바꿔야 한다'],
          reasonIndex: 0,
          ko: '나는 너무 피곤해서 일찍 잠자리에 들었다.',
        },
        {
          level: 'basic',
          sentence: 'The room was so cold what I put on a coat.',
          wrong: 'what',
          correct: ['that'],
          reasonChoices: ['결과절을 이끄는 접속사는 that이다', 'what은 형용사 앞에만 쓴다', 'so 뒤에는 동사가 와야 한다'],
          reasonIndex: 0,
          ko: '방이 너무 추워서 나는 코트를 입었다.',
        },
        {
          level: 'intermediate',
          sentence: 'She was so a kind girl that everyone liked her.',
          wrong: 'so',
          correct: ['such'],
          reasonChoices: ["'a + 형용사 + 명사'가 뒤에 오면 so가 아니라 such를 쓴다", 'such 뒤에는 that을 쓸 수 없다', 'a 앞에는 very가 와야 한다'],
          reasonIndex: 0,
          ko: '그녀는 너무 친절한 소녀여서 모두가 그녀를 좋아했다.',
        },
        {
          level: 'intermediate',
          sentence: 'He walked so slow that he missed the bus.',
          wrong: 'slow',
          correct: ['slowly'],
          reasonChoices: ['walked(동사)를 꾸미므로 부사가 필요하다', 'that 앞에는 형용사만 온다', 'slow는 명사다'],
          reasonIndex: 0,
          ko: '그는 너무 느리게 걸어서 버스를 놓쳤다.',
        },
        {
          level: 'advanced',
          sentence: "The question was so easy that anyone can't answer it.",
          wrong: "can't",
          correct: ['could'],
          reasonChoices: [
            "'쉬워서 누구나 답할 수 있다'는 긍정이어야 하고, 앞이 과거이므로 could를 쓴다",
            'so ~ that에서는 부정문을 쓰면 안 된다',
            'anyone은 can\'t와 쓸 수 없다',
          ],
          reasonIndex: 0,
          ko: '그 질문은 너무 쉬워서 누구나 답할 수 있었다.',
        },
        {
          level: 'advanced',
          sentence: "He was too tired that he couldn't walk.",
          wrong: 'too',
          correct: ['so'],
          reasonChoices: ["'too ~ to' 구문에서는 that절을 쓰지 않는다. that절이 오려면 so를 쓴다", 'too 뒤에는 명사가 온다', 'that절에는 couldn\'t를 쓸 수 없다'],
          reasonIndex: 0,
          ko: '그는 너무 피곤해서 걸을 수 없었다.',
        },
      ],
      questions: [
        {
          level: 'basic',
          kind: 'pick_correct',
          stem: 'Which sentence is correct?',
          choices: [
            opt('I was so tired that I fell asleep.', '나는 너무 피곤해서 잠들었다.'),
            opt('I was so very tired that I fell asleep.', 'so와 very를 함께 씀 (오류)'),
            opt('I was so tired what I fell asleep.', 'that 대신 what (오류)'),
            opt('I was so tired to I fell asleep.', 'that 대신 to (오류)'),
          ],
          answerIndex: 0,
          explanationKo: 'so + 형용사 + that + 주어 + 동사의 형태이다. so와 very는 함께 쓰지 않고, 접속사는 that이다.',
        },
        {
          level: 'basic',
          kind: 'reason',
          stem: "Why is this sentence wrong?\n'She is so very smart that she got a perfect score.'",
          choices: [
            opt("We can't use 'very' with 'so'.", "so와 very는 함께 쓸 수 없다."),
            opt("'that' must be 'what'.", "that은 what이어야 한다."),
            opt("'smart' must be an adverb.", "smart는 부사여야 한다."),
            opt("'got' must be 'get'.", "got은 get이어야 한다."),
          ],
          answerIndex: 0,
          explanationKo: "so ~ that 구문에서 so와 very를 함께 쓰지 않는다. (so very → so)",
        },
        {
          level: 'basic',
          kind: 'count_wrong',
          stem: 'How many sentences are wrong?\n(a) It was so cold that we stayed home.\n(b) It was so very cold that we stayed home.\n(c) It was so cold what we stayed home.',
          choices: [opt('0', '0개'), opt('1', '1개'), opt('2', '2개'), opt('3', '3개')],
          answerIndex: 2,
          explanationKo: '(b)는 so very, (c)는 that 대신 what을 써서 틀렸다. (a)는 맞다.',
        },
        {
          level: 'intermediate',
          kind: 'pick_different',
          stem: 'Choose the sentence that is different from the others.',
          choices: [
            opt('The tea was so hot that I couldn\'t drink it.', '결과 구문'),
            opt("He was so busy that he couldn't call me.", '결과 구문'),
            opt('She studied so hard that she passed the test.', '결과 구문'),
            opt('I got up early so that I could catch the bus.', '목적 구문 (~하기 위해서)'),
          ],
          answerIndex: 3,
          explanationKo: '①②③은 so + 형용사/부사 + that(결과)이고, ④는 so that + 주어 + could(목적)이다.',
        },
        {
          level: 'intermediate',
          kind: 'pick_correct',
          stem: 'Which sentence is correct?',
          choices: [
            opt('He was so a good singer that everyone loved him.', 'so a (오류)'),
            opt('He was such a good singer that everyone loved him.', '그는 너무 훌륭한 가수여서 모두가 그를 사랑했다.'),
            opt('He was so good singer that everyone loved him.', '관사 없음 (오류)'),
            opt('He was such good singer that everyone loved him.', '관사 없음 (오류)'),
          ],
          answerIndex: 1,
          explanationKo: "'a + 형용사 + 명사' 앞에는 so가 아니라 such를 쓴다. such a good singer.",
        },
        {
          level: 'intermediate',
          kind: 'count_wrong',
          stem: "How many sentences are wrong?\n(a) The box was so heavy that I couldn't lift it.\n(b) She sang so beautiful that we all clapped.\n(c) He was so very angry that he shouted.\n(d) The test was so hard that nobody passed it.",
          choices: [opt('1', '1개'), opt('2', '2개'), opt('3', '3개'), opt('4', '4개')],
          answerIndex: 1,
          explanationKo: '(b)는 sang(동사)을 꾸미므로 beautifully, (c)는 so very가 틀렸다.',
        },
        {
          level: 'advanced',
          kind: 'reason',
          stem: "Why is this sentence wrong?\n'The bag was too heavy that I couldn't carry it.'",
          choices: [
            opt("'too ~ to' does not take a that-clause; use 'so ~ that'.", "'too ~ to'는 that절을 쓰지 않는다. that절이면 so ~ that을 쓴다."),
            opt("'heavy' must be 'heavily'.", "heavy는 heavily여야 한다."),
            opt("'carry' must be 'carried'.", "carry는 carried여야 한다."),
            opt("'it' must be deleted.", "it을 삭제해야 한다."),
          ],
          answerIndex: 0,
          explanationKo: "too ~ that은 없는 구문이다. so ~ that 또는 too ~ to를 쓴다.",
        },
        {
          level: 'advanced',
          kind: 'pick_correct',
          stem: "Which sentence has the same meaning as\n'The soup was so hot that I couldn't eat it.'?",
          choices: [
            opt('The soup was too hot for me to eat.', '그 수프는 너무 뜨거워서 내가 먹을 수 없었다.'),
            opt('The soup was hot enough for me to eat.', '먹을 수 있을 만큼 뜨거웠다 (의미 다름)'),
            opt('The soup was so hot that I could eat it.', '먹을 수 있었다 (의미 다름)'),
            opt('The soup was too hot for me to eat it.', 'it이 중복됨 (오류)'),
          ],
          answerIndex: 0,
          explanationKo: "so ~ that ... can't = too ~ to. too ~ to에서는 목적어 it을 다시 쓰지 않는다.",
        },
        {
          level: 'advanced',
          kind: 'count_wrong',
          stem: "How many sentences are wrong?\n(a) He was so tired that he couldn't walk.\n(b) He was too tired that he couldn't walk.\n(c) She was so very happy that she jumped.\n(d) The book was so interesting that I read it twice.\n(e) It was so a nice day that we went out.",
          choices: [opt('1', '1개'), opt('2', '2개'), opt('3', '3개'), opt('4', '4개')],
          answerIndex: 2,
          explanationKo: '(b) too ~ that, (c) so very, (e) so a nice day(→ such a nice day)가 틀렸다.',
        },
      ],
    },
  },

  // ───────────────────────── 5과 · 지각동사 ─────────────────────────
  {
    lessonNumber: 5,
    sortOrder: 1,
    lesson: {
      version: 1,
      status: 'draft',
      topic: '지각동사 + 목적어 + 목적격보어',
      explanation: {
        titleKo: '지각동사 + 목적어 + 목적격보어 (원형 / v-ing / p.p.)',
        summaryEn:
          "Perception verbs (see, watch, hear, listen to, feel, smell, notice) are followed by an object and a complement. The complement can be a base verb, an -ing form, or a past participle. It cannot be 'to + verb'.",
        summaryKo:
          "지각동사(see, watch, hear, listen to, feel, smell, notice 등) 뒤에는 '목적어 + 목적격보어'가 온다. 목적격보어는 동사원형, v-ing, p.p.가 가능하고, 'to + 동사원형'은 쓸 수 없다.",
        rules: [
          {
            en: 'O + base verb: we saw or heard the whole action.',
            ko: '동사원형: 동작이 처음부터 끝까지 일어난 것 전체를 보고/듣고/느꼈다. (I saw him cross the street.)',
          },
          {
            en: 'O + -ing: the action was in progress.',
            ko: 'v-ing: 동작이 진행 중인 모습을 보고/듣고/느꼈다. (I saw him crossing the street.)',
          },
          {
            en: 'O + p.p.: the object receives the action (passive).',
            ko: 'p.p.: 목적어가 어떤 일을 당하는(수동) 관계일 때. (I heard my name called.)',
          },
          {
            en: "Never use 'to + verb' after perception verbs. (× I saw him to cross)",
            ko: '지각동사 뒤에는 to부정사를 쓰지 않는다.',
          },
          {
            en: "'listen to' and 'look at' work in the same way.",
            ko: "listen to, look at도 지각동사처럼 '목적어 + 원형/v-ing'를 쓴다. (I listened to her sing.)",
          },
        ],
        examples: [
          { en: 'I saw him cross the street.', ko: '나는 그가 길을 건너는 것을 (처음부터 끝까지) 보았다.' },
          { en: 'I saw him crossing the street.', ko: '나는 그가 길을 건너고 있는 것을 보았다.' },
          { en: 'She heard her name called.', ko: '그녀는 자기 이름이 불리는 것을 들었다.' },
          { en: 'We watched the birds fly away.', ko: '우리는 새들이 날아가는 것을 보았다.' },
        ],
      },
      cramText:
        "Perception verbs are followed by an object and a complement.\nThe complement can be a base verb, an -ing form, or a past participle.\nWe never use 'to + verb' after perception verbs.\nI saw him cross the street.\nI saw him crossing the street.",
      blanks: [
        { text: 'The complement can be a base verb, an -ing form, or a past ___.', answer: 'participle', hint: 'p________' },
        { text: "We never use '___ + verb' after perception verbs.", answer: 'to', hint: 't_' },
        { text: 'I saw him ___ the street. (I saw the whole action.)', answer: 'cross', hint: 'c____' },
        { text: 'I saw him ___ the street. (He was in the middle of crossing.)', answer: 'crossing', hint: 'c_______' },
      ],
      drillFill: [
        { level: 'basic', sentence: 'I heard my brother ___ in the shower.', answer: 'sing', choices: ['sing', 'to sing'], ko: '나는 형이 샤워하면서 노래하는 것을 들었다.' },
        { level: 'basic', sentence: 'We watched the children ___ soccer.', answer: 'play', choices: ['play', 'to play'], ko: '우리는 아이들이 축구하는 것을 지켜보았다.' },
        { level: 'intermediate', sentence: 'At that moment, I saw a boy ___ on the road.', answer: 'running', choices: ['run', 'running'], ko: '그때 나는 한 소년이 길에서 달리고 있는 것을 보았다.', noteKo: '진행 중인 동작' },
        { level: 'intermediate', sentence: 'She heard her name ___ by someone.', answer: 'called', choices: ['call', 'called'], ko: '그녀는 누군가가 자기 이름을 부르는 것을 들었다.', noteKo: '이름은 불리는 것 (수동)' },
        { level: 'advanced', sentence: 'I listened to her ___ the piano.', answer: 'play', choices: ['play', 'to play', 'played'], ko: '나는 그녀가 피아노를 치는 것을 귀 기울여 들었다.' },
        { level: 'advanced', sentence: 'She felt her hair ___ by the wind.', answer: 'blown', choices: ['blow', 'blown'], ko: '그녀는 머리카락이 바람에 날리는 것을 느꼈다.', noteKo: '머리카락은 바람에 날리는 것 (수동)' },
      ],
      drillFix: [
        {
          level: 'basic',
          sentence: 'I saw him to leave the room.',
          wrong: 'to',
          correct: [''],
          reasonChoices: ['지각동사 뒤에는 to부정사를 쓰지 않는다', 'see는 목적어를 취하지 않는다', 'leave는 과거형이어야 한다'],
          reasonIndex: 0,
          ko: '나는 그가 방을 나가는 것을 보았다.',
        },
        {
          level: 'basic',
          sentence: 'She heard the baby cries.',
          wrong: 'cries',
          correct: ['cry', 'crying'],
          reasonChoices: ['지각동사의 목적격보어는 동사원형(또는 v-ing)이다. 3인칭 -s를 붙이지 않는다', 'baby는 복수여야 한다', 'heard는 hear로 바꿔야 한다'],
          reasonIndex: 0,
          ko: '그녀는 아기가 우는 소리를 들었다.',
        },
        {
          level: 'intermediate',
          sentence: 'We watched the boys played soccer.',
          wrong: 'played',
          correct: ['play', 'playing'],
          reasonChoices: ['지각동사 뒤 목적격보어는 원형이나 v-ing이지 과거형이 아니다', 'watch는 to가 필요하다', 'boys는 단수여야 한다'],
          reasonIndex: 0,
          ko: '우리는 소년들이 축구하는 것을 지켜보았다.',
        },
        {
          level: 'intermediate',
          sentence: 'I heard my name calling by someone.',
          wrong: 'calling',
          correct: ['called'],
          reasonChoices: ['이름은 불리는 것이므로 수동 관계 → p.p.를 쓴다', 'name은 복수여야 한다', 'by 앞에는 원형이 온다'],
          reasonIndex: 0,
          ko: '나는 누군가가 내 이름을 부르는 것을 들었다.',
        },
        {
          level: 'advanced',
          sentence: 'I heard my name announcing at the ceremony.',
          wrong: 'announcing',
          correct: ['announced'],
          reasonChoices: ['이름은 발표되는 것이므로 수동 관계 → p.p.를 쓴다', 'ceremony 앞에는 to가 필요하다', 'heard는 hearing이어야 한다'],
          reasonIndex: 0,
          ko: '나는 시상식에서 내 이름이 발표되는 것을 들었다.',
        },
        {
          level: 'advanced',
          sentence: 'I looked at the birds to fly over the lake.',
          wrong: 'to',
          correct: [''],
          reasonChoices: ["look at도 지각동사처럼 to 없이 원형/v-ing를 쓴다", 'birds는 단수여야 한다', 'over는 on이어야 한다'],
          reasonIndex: 0,
          ko: '나는 새들이 호수 위를 날아가는 것을 바라보았다.',
        },
      ],
      questions: [
        {
          level: 'basic',
          kind: 'pick_correct',
          stem: 'Which sentence is correct?',
          choices: [
            opt('I saw him to run.', 'to run (오류)'),
            opt('I saw him run.', '나는 그가 달리는 것을 보았다.'),
            opt('I saw him ran.', 'ran (오류)'),
            opt('I saw he run.', 'he (오류)'),
          ],
          answerIndex: 1,
          explanationKo: '지각동사 + 목적어(him) + 동사원형. to부정사, 과거형은 쓸 수 없고, 목적어는 목적격(him)이다.',
        },
        {
          level: 'basic',
          kind: 'reason',
          stem: "Why is this sentence wrong?\n'She heard the boy to sing.'",
          choices: [
            opt("We don't use 'to' after a perception verb.", '지각동사 뒤에는 to를 쓰지 않는다.'),
            opt("'heard' must be 'hear'.", 'heard는 hear여야 한다.'),
            opt("'boy' must be 'boys'.", 'boy는 boys여야 한다.'),
            opt("'sing' must be 'sang'.", 'sing은 sang이어야 한다.'),
          ],
          answerIndex: 0,
          explanationKo: '지각동사의 목적격보어에는 to부정사를 쓰지 않는다. (to sing → sing / singing)',
        },
        {
          level: 'basic',
          kind: 'count_wrong',
          stem: 'How many sentences are wrong?\n(a) I heard her sing.\n(b) I saw them to dance.\n(c) He felt the ground shake.',
          choices: [opt('0', '0개'), opt('1', '1개'), opt('2', '2개'), opt('3', '3개')],
          answerIndex: 1,
          explanationKo: '(b)만 틀렸다. saw them to dance → saw them dance/dancing.',
        },
        {
          level: 'intermediate',
          kind: 'pick_different',
          stem: 'Choose the sentence that is different from the others.',
          choices: [
            opt('I saw him crossing the road.', '옳은 문장'),
            opt('She heard the birds singing.', '옳은 문장'),
            opt('We watched the kids playing soccer.', '옳은 문장'),
            opt('I heard the door to open.', 'to open (오류)'),
          ],
          answerIndex: 3,
          explanationKo: "①②③은 v-ing를 바르게 썼지만 ④는 지각동사 뒤에 to부정사를 써서 틀렸다. (to open → open/opening)",
        },
        {
          level: 'intermediate',
          kind: 'pick_correct',
          stem: "Which sentence means 'I saw the boy who was in the middle of running'?",
          choices: [
            opt('I saw the boy run.', '소년이 달리는 것 전체를 보았다.'),
            opt('I saw the boy running.', '소년이 달리고 있는 모습을 보았다.'),
            opt('I saw the boy to run.', 'to run (오류)'),
            opt('I saw the boy ran.', 'ran (오류)'),
          ],
          answerIndex: 1,
          explanationKo: '진행 중인 동작을 보았을 때는 v-ing를 쓴다.',
        },
        {
          level: 'intermediate',
          kind: 'count_wrong',
          stem: 'How many sentences are wrong?\n(a) I heard my name called.\n(b) I heard my name calling.\n(c) I saw him to enter.\n(d) She felt someone touch her arm.',
          choices: [opt('1', '1개'), opt('2', '2개'), opt('3', '3개'), opt('4', '4개')],
          answerIndex: 1,
          explanationKo: '(b) 이름은 불리는 것이라 called, (c) to enter는 enter/entering이어야 한다.',
        },
        {
          level: 'advanced',
          kind: 'reason',
          stem: "Why is this sentence wrong?\n'I heard my name calling.'",
          choices: [
            opt("My name is called by someone, so the past participle 'called' is needed.", '이름은 불리는 것(수동)이라 p.p.인 called가 필요하다.'),
            opt("'heard' must be 'hear'.", 'heard는 hear여야 한다.'),
            opt("'name' must be plural.", 'name은 복수여야 한다.'),
            opt("'calling' must be 'to call'.", 'calling은 to call이어야 한다.'),
          ],
          answerIndex: 0,
          explanationKo: '목적어와 목적격보어가 수동 관계이면 p.p.를 쓴다. 이름(목적어)은 스스로 부르는 것이 아니라 불리는 대상이다.',
        },
        {
          level: 'advanced',
          kind: 'pick_correct',
          stem: 'Which sentence is correct?',
          choices: [
            opt('She felt her hair blowing by the wind.', 'blowing (오류: 수동 관계)'),
            opt('She felt her hair blown by the wind.', '그녀는 머리카락이 바람에 날리는 것을 느꼈다.'),
            opt('She felt her hair to blow by the wind.', 'to blow (오류)'),
            opt('She felt her hair blows by the wind.', 'blows (오류)'),
          ],
          answerIndex: 1,
          explanationKo: '머리카락이 바람에 날리는(수동) 관계이므로 p.p.(blown)를 쓴다.',
        },
        {
          level: 'advanced',
          kind: 'count_wrong',
          stem: 'How many sentences are wrong?\n(a) I watched the boys played baseball.\n(b) I listened to her play the violin.\n(c) He saw a man to steal the bag.\n(d) We heard the song sung by children.\n(e) I felt my heart to beat fast.',
          choices: [opt('1', '1개'), opt('2', '2개'), opt('3', '3개'), opt('4', '4개')],
          answerIndex: 2,
          explanationKo: '(a) played → play/playing, (c) to steal → steal/stealing, (e) to beat → beat/beating이 틀렸다.',
        },
      ],
    },
  },

  // ───────────────────────── 6과 · 목적격 관계대명사 ─────────────────────────
  {
    lessonNumber: 6,
    sortOrder: 0,
    lesson: {
      version: 1,
      status: 'draft',
      topic: '목적격 관계대명사 (뒤 구조)',
      explanation: {
        titleKo: '목적격 관계대명사 (who(m), which, that) — 뒤 구조',
        summaryEn:
          'An object relative pronoun (who/whom, which, that) connects a noun with a clause. The clause after it has a subject and a verb, but the object is missing.',
        summaryKo:
          '목적격 관계대명사(who(m), which, that)는 앞의 명사(선행사)를 꾸미는 절을 이끈다. 뒤에는 "주어 + 동사"가 오고, 목적어 자리가 비어 있는(불완전한) 구조이다.',
        rules: [
          { en: 'Person: who/whom/that. Thing: which/that.', ko: '선행사가 사람이면 who(m)/that, 사물이면 which/that을 쓴다.' },
          {
            en: 'After it: S + V (the object is missing). Do not write the object again. (× the book which I read it)',
            ko: '관계대명사 뒤에는 "주어 + 동사"가 오고 목적어가 빠져 있다. 관계대명사가 이미 목적어 역할을 하므로 목적어를 다시 쓰면 안 된다.',
          },
          {
            en: 'It can be omitted: The book (which) I read was fun.',
            ko: '목적격 관계대명사는 생략할 수 있다. 명사 바로 뒤에 "주어 + 동사"가 오면 관계대명사가 생략된 것이라는 신호이다.',
          },
          {
            en: 'If the verb takes a preposition, the preposition stays at the end: the friend (who) I talked to.',
            ko: '동사에 딸린 전치사는 절 끝에 남는다. 전치사의 목적어가 관계대명사로 빠진 것이므로 그 자리에 대명사를 또 쓰지 않는다.',
          },
        ],
        examples: [
          { en: 'The book (which) I bought yesterday is interesting.', ko: '내가 어제 산 책은 재미있다.' },
          { en: 'The man (who) you met is my uncle.', ko: '네가 만난 남자는 나의 삼촌이다.' },
          { en: 'This is the movie (that) I told you about.', ko: '이것은 내가 네게 이야기했던 영화이다.' },
          { en: 'The girl (that) Tom likes is my classmate.', ko: 'Tom이 좋아하는 소녀는 나의 반 친구이다.' },
        ],
      },
      cramText:
        'An object relative pronoun connects a noun with a clause.\nThe clause after it has a subject and a verb, but the object is missing.\nThe book (which) I bought yesterday is interesting.\nThe man (who) you met is my uncle.',
      blanks: [
        { text: 'Person: who/whom/that. Thing: ___/that.', answer: 'which', hint: 'w____' },
        { text: 'After an object relative pronoun, we write a subject and a ___, but the object is missing.', answer: 'verb', hint: 'v___' },
        { text: 'The book (which) I bought is fun. The relative pronoun can be ___.', answer: 'omitted', hint: 'o______' },
        { text: 'This is the movie (that) I told you ___.', answer: 'about', hint: 'a____' },
      ],
      drillFill: [
        { level: 'basic', sentence: 'This is the book ___ I read last week.', answer: 'which', choices: ['which', 'who'], ko: '이것은 내가 지난주에 읽은 책이다.' },
        { level: 'basic', sentence: 'The boy ___ I met at the park is Tom.', answer: 'who', choices: ['who', 'which'], ko: '내가 공원에서 만난 소년은 Tom이다.' },
        { level: 'intermediate', sentence: 'The bag ___ my mom gave me is red.', answer: 'that', choices: ['that', 'what'], ko: '엄마가 나에게 주신 가방은 빨간색이다.' },
        { level: 'intermediate', sentence: 'She is the girl ___ I talked to.', answer: 'who', choices: ['who', 'which'], ko: '그녀는 내가 이야기했던 소녀이다.' },
        { level: 'advanced', sentence: 'The cookies which she made ___ were delicious.', answer: '(nothing)', choices: ['them', '(nothing)'], ko: '그녀가 만든 쿠키는 맛있었다.', noteKo: '관계대명사 뒤 구조: 목적어가 빠져 있다' },
        { level: 'advanced', sentence: 'She is the friend (who) I played tennis ___.', answer: 'with', ko: '그녀는 내가 함께 테니스를 친 친구이다.', hint: 'w___' },
      ],
      drillFix: [
        {
          level: 'basic',
          sentence: 'The book which I read it was interesting.',
          wrong: 'it',
          correct: [''],
          reasonChoices: ['목적격 관계대명사 뒤에서는 목적어가 빠져 있어야 한다 (which가 목적어 역할)', 'which는 주어이므로 it이 필요하다', 'read는 과거형이어야 한다'],
          reasonIndex: 0,
          ko: '내가 읽은 책은 흥미로웠다.',
        },
        {
          level: 'basic',
          sentence: 'The girl who I met her is kind.',
          wrong: 'her',
          correct: [''],
          reasonChoices: ['목적격 관계대명사 뒤에서는 목적어가 빠져 있어야 한다 (who가 목적어 역할)', 'who 뒤에는 목적어가 꼭 필요하다', 'met은 meet이어야 한다'],
          reasonIndex: 0,
          ko: '내가 만난 소녀는 친절하다.',
        },
        {
          level: 'intermediate',
          sentence: 'This is the movie who I saw last night.',
          wrong: 'who',
          correct: ['which', 'that'],
          reasonChoices: ['선행사가 사물이면 which/that을 쓴다', '선행사가 사물이면 whom을 쓴다', 'who는 목적어 앞에 온다'],
          reasonIndex: 0,
          ko: '이것은 내가 어젯밤에 본 영화이다.',
        },
        {
          level: 'intermediate',
          sentence: 'The man which I met yesterday is my uncle.',
          wrong: 'which',
          correct: ['who', 'whom', 'that'],
          reasonChoices: ['선행사가 사람이면 who(m)/that을 쓴다', '선행사가 사람이면 which를 쓴다', 'man은 복수여야 한다'],
          reasonIndex: 0,
          ko: '내가 어제 만난 남자는 나의 삼촌이다.',
        },
        {
          level: 'advanced',
          sentence: 'The friend I talked to him is Sam.',
          wrong: 'him',
          correct: [''],
          reasonChoices: ['전치사 to의 목적어가 관계대명사로 빠졌으므로 him을 또 쓰면 안 된다', 'talked는 talk이어야 한다', 'is는 are여야 한다'],
          reasonIndex: 0,
          ko: '내가 이야기했던 친구는 Sam이다.',
        },
        {
          level: 'advanced',
          sentence: 'The song what I like most is this one.',
          wrong: 'what',
          correct: ['which', 'that'],
          reasonChoices: ['what은 선행사를 꾸미는 관계대명사로 쓸 수 없다. 선행사(the song)가 있으면 which/that을 쓴다', 'what은 사람에게만 쓴다', 'song은 복수여야 한다'],
          reasonIndex: 0,
          ko: '내가 가장 좋아하는 노래는 이것이다.',
        },
      ],
      questions: [
        {
          level: 'basic',
          kind: 'pick_correct',
          stem: 'Which sentence is correct?',
          choices: [
            opt('The book which I read it was fun.', 'it 중복 (오류)'),
            opt('The book which I read was fun.', '내가 읽은 책은 재미있었다.'),
            opt('The book who I read was fun.', 'who (오류)'),
            opt('The book what I read was fun.', 'what (오류)'),
          ],
          answerIndex: 1,
          explanationKo: '목적격 관계대명사 뒤는 "주어 + 동사"이고 목적어(it)가 빠져 있어야 한다. 선행사가 사물이므로 which/that을 쓴다.',
        },
        {
          level: 'basic',
          kind: 'reason',
          stem: "Why is this sentence wrong?\n'The boy who I met him is Tom.'",
          choices: [
            opt("The object is missing after 'who', so 'him' must be deleted.", "who 뒤에서는 목적어가 빠져야 하므로 him을 삭제해야 한다."),
            opt("'who' must be 'which'.", 'who는 which여야 한다.'),
            opt("'met' must be 'meet'.", 'met은 meet이어야 한다.'),
            opt("'is' must be 'are'.", 'is는 are여야 한다.'),
          ],
          answerIndex: 0,
          explanationKo: 'who가 이미 met의 목적어 역할을 하므로 him을 또 쓰지 않는다.',
        },
        {
          level: 'basic',
          kind: 'count_wrong',
          stem: 'How many sentences are wrong?\n(a) The bag which I bought is red.\n(b) The man who I saw it is my uncle.\n(c) This is the movie that I like.',
          choices: [opt('0', '0개'), opt('1', '1개'), opt('2', '2개'), opt('3', '3개')],
          answerIndex: 1,
          explanationKo: '(b)만 틀렸다. saw it의 it을 삭제해야 한다.',
        },
        {
          level: 'intermediate',
          kind: 'pick_different',
          stem: 'Choose the sentence that is different from the others.',
          choices: [
            opt('The girl (who) I met is kind.', '목적격 관계대명사 (뒤에 주어 + 동사)'),
            opt('The book (which) I read is fun.', '목적격 관계대명사'),
            opt('The movie (that) she made is famous.', '목적격 관계대명사'),
            opt('The man who lives next door is a doctor.', '주격 관계대명사 (who 뒤에 동사)'),
          ],
          answerIndex: 3,
          explanationKo: '④의 who는 뒤에 동사(lives)가 바로 오는 주격이고, ①②③은 뒤에 주어 + 동사가 오는 목적격이다.',
        },
        {
          level: 'intermediate',
          kind: 'pick_correct',
          stem: 'In which sentence can the relative pronoun be omitted?',
          choices: [
            opt('The boy who plays the guitar is Jake.', '주격 (생략 불가)'),
            opt('The boy who I met is Jake.', '목적격 (생략 가능)'),
            opt('The boy who is tall is Jake.', '주격 (생략 불가)'),
            opt('The boy who lives here is Jake.', '주격 (생략 불가)'),
          ],
          answerIndex: 1,
          explanationKo: '목적격 관계대명사만 생략할 수 있다. who 뒤에 "주어 + 동사(I met)"가 오는 ②가 목적격이다.',
        },
        {
          level: 'intermediate',
          kind: 'count_wrong',
          stem: 'How many sentences are wrong?\n(a) This is the pen which I bought it.\n(b) The girl whom I met is Amy.\n(c) The man which I saw is my teacher.\n(d) The cake that she baked was great.',
          choices: [opt('1', '1개'), opt('2', '2개'), opt('3', '3개'), opt('4', '4개')],
          answerIndex: 1,
          explanationKo: '(a) it 중복, (c) 선행사가 사람이므로 which가 아니라 who(m)/that이어야 한다.',
        },
        {
          level: 'advanced',
          kind: 'reason',
          stem: "Why is this sentence wrong?\n'The friend I talked to him is Sam.'",
          choices: [
            opt("'to' already takes the relative pronoun as its object, so 'him' is unnecessary.", "to의 목적어가 관계대명사로 빠져 있으므로 him은 필요 없다."),
            opt("'talked' must be 'talk'.", 'talked는 talk이어야 한다.'),
            opt("'Sam' must be \"Sam's\".", 'Sam은 Sam\'s여야 한다.'),
            opt("'is' must be 'are'.", 'is는 are여야 한다.'),
          ],
          answerIndex: 0,
          explanationKo: 'the friend (who) I talked to. 전치사는 절 끝에 남고, 그 목적어는 다시 쓰지 않는다.',
        },
        {
          level: 'advanced',
          kind: 'pick_correct',
          stem: 'Which sentence is correct?',
          choices: [
            opt('The girl I talked to is my sister.', '내가 이야기했던 소녀는 내 여동생이다.'),
            opt('The girl I talked is my sister.', "전치사 to 누락 (오류)"),
            opt('The girl I talked to her is my sister.', 'her 중복 (오류)'),
            opt('The girl who I talked to she is my sister.', 'she 중복 (오류)'),
          ],
          answerIndex: 0,
          explanationKo: 'talk to 의 to를 남기고, 목적어는 관계대명사(생략)로 대신한다.',
        },
        {
          level: 'advanced',
          kind: 'count_wrong',
          stem: 'How many sentences are wrong?\n(a) The pizza I ate was great.\n(b) The song what I love is this.\n(c) The man I met him is kind.\n(d) The dress which she wore was pretty.\n(e) The boy who I play is Ben.',
          choices: [opt('1', '1개'), opt('2', '2개'), opt('3', '3개'), opt('4', '4개')],
          answerIndex: 2,
          explanationKo: '(b) what → which/that, (c) him 중복, (e) play with에서 with 누락이 틀렸다.',
        },
      ],
    },
  },

  // ───────────────────────── 6과 · used to (부정형) ─────────────────────────
  {
    lessonNumber: 6,
    sortOrder: 1,
    lesson: {
      version: 1,
      status: 'draft',
      topic: 'used to (부정문 · 의문문)',
      explanation: {
        titleKo: 'used to — 부정문 · 의문문',
        summaryEn:
          "'Used to + base verb' talks about a past habit or state that is not true now. The negative is 'didn't use to + base verb', and the question is 'Did + subject + use to + base verb?'.",
        summaryKo:
          "'used to + 동사원형'은 '(과거에) ~하곤 했다, ~였다'(지금은 아님)의 뜻이다. 부정문은 didn't use to + 동사원형, 의문문은 Did + 주어 + use to + 동사원형 ~?이다.",
        rules: [
          { en: 'Used to + base verb: a past habit or state (not true now).', ko: '과거의 규칙적인 습관이나 상태를 나타낸다. 지금은 그렇지 않다.' },
          {
            en: "Negative: didn't use to + base verb. (× didn't used to)",
            ko: 'did가 이미 과거를 나타내므로 used의 -d가 빠져 use가 된다. never used to도 쓸 수 있다.',
          },
          { en: 'Question: Did + subject + use to + base verb?', ko: '의문문도 마찬가지로 Did + 주어 + use to + 동사원형이다.' },
          {
            en: "Do not confuse it with 'be used to + -ing' (= be accustomed to).",
            ko: "be used to + v-ing는 '~하는 데 익숙하다'로 완전히 다른 표현이다. (I'm used to getting up early.)",
          },
        ],
        examples: [
          { en: 'I used to play soccer after school.', ko: '나는 방과 후에 축구를 하곤 했다. (지금은 안 한다)' },
          { en: "She didn't use to like spicy food.", ko: '그녀는 매운 음식을 좋아하지 않았다. (지금은 좋아한다)' },
          { en: 'Did you use to live in Busan?', ko: '너는 부산에 살았니?' },
          { en: 'He is used to getting up early.', ko: '그는 일찍 일어나는 데 익숙하다.' },
        ],
      },
      cramText:
        "Used to + base verb talks about a past habit or state that is not true now.\nThe negative is didn't use to + base verb.\nThe question is Did + subject + use to + base verb?\nShe didn't use to like spicy food.",
      blanks: [
        { text: "'Used to + ___ verb' talks about a past habit.", answer: 'base', hint: 'b___' },
        { text: "The negative is 'didn't ___ to + base verb'.", answer: 'use', hint: 'u__' },
        { text: '___ you use to live in Busan?', answer: 'Did', hint: 'D__' },
        { text: "I'm used to ___ up early. (get)", answer: 'getting', hint: 'g______' },
      ],
      drillFill: [
        { level: 'basic', sentence: "I ___ to play soccer after school, but I don't now.", answer: 'used', choices: ['used', 'use'], ko: '나는 방과 후에 축구를 하곤 했지만 지금은 하지 않는다.' },
        { level: 'basic', sentence: "She didn't ___ to like carrots.", answer: 'use', choices: ['used', 'use'], ko: '그녀는 당근을 좋아하지 않았다.' },
        { level: 'intermediate', sentence: '___ he use to live in Jeju?', answer: 'Did', choices: ['Did', 'Does'], ko: '그는 제주에 살았니?' },
        { level: 'intermediate', sentence: 'There ___ to be a small park here.', answer: 'used', choices: ['used', 'use'], ko: '여기에는 작은 공원이 있었다.' },
        { level: 'advanced', sentence: 'My brother never used to ___ his room.', answer: 'clean', choices: ['clean', 'cleaned', 'cleaning'], ko: '내 남동생은 자기 방을 청소하지 않았다.' },
        { level: 'advanced', sentence: "I'm used to ___ up early.", answer: 'getting', choices: ['get', 'getting', 'got'], ko: '나는 일찍 일어나는 데 익숙하다.', noteKo: 'be used to (익숙하다)' },
      ],
      drillFix: [
        {
          level: 'basic',
          sentence: "She didn't used to like tomatoes.",
          wrong: 'used',
          correct: ['use'],
          reasonChoices: ['did가 이미 과거를 나타내므로 use to로 쓴다', 'used는 명사이다', 'like는 liked이어야 한다'],
          reasonIndex: 0,
          ko: '그녀는 토마토를 좋아하지 않았다.',
        },
        {
          level: 'basic',
          sentence: 'He used to played the piano.',
          wrong: 'played',
          correct: ['play'],
          reasonChoices: ['used to 뒤에는 동사원형이 온다', 'used to 뒤에는 v-ing가 온다', 'piano 앞에는 to가 필요하다'],
          reasonIndex: 0,
          ko: '그는 피아노를 치곤 했다.',
        },
        {
          level: 'intermediate',
          sentence: 'Did you used to live in Busan?',
          wrong: 'used',
          correct: ['use'],
          reasonChoices: ['Did가 있으면 use to로 쓴다 (과거 표시는 Did가 한다)', 'live는 lived이어야 한다', 'Busan 앞에는 at이 필요하다'],
          reasonIndex: 0,
          ko: '너는 부산에 살았니?',
        },
        {
          level: 'intermediate',
          sentence: "I didn't use to eating fish.",
          wrong: 'eating',
          correct: ['eat'],
          reasonChoices: ['use to 뒤에는 동사원형이 온다', 'didn\'t 뒤에는 v-ing가 온다', 'fish는 복수여야 한다'],
          reasonIndex: 0,
          ko: '나는 생선을 먹지 않았다.',
        },
        {
          level: 'advanced',
          sentence: 'My dad used to being a teacher.',
          wrong: 'being',
          correct: ['be'],
          reasonChoices: ['used to(~였다) 뒤에는 동사원형 be가 온다 (be used to + v-ing와 구별)', 'used to 뒤에는 v-ing가 온다', 'teacher는 복수여야 한다'],
          reasonIndex: 0,
          ko: '우리 아빠는 선생님이었다.',
        },
        {
          level: 'advanced',
          sentence: 'I am used to get up early.',
          wrong: 'get',
          correct: ['getting'],
          reasonChoices: ["be used to는 '익숙하다'로 to가 전치사이므로 v-ing가 온다", 'used to 뒤에는 원형이 온다', 'am은 was여야 한다'],
          reasonIndex: 0,
          ko: '나는 일찍 일어나는 데 익숙하다.',
        },
      ],
      questions: [
        {
          level: 'basic',
          kind: 'pick_correct',
          stem: 'Which sentence is correct?',
          choices: [
            opt("She didn't used to eat meat.", "didn't used (오류)"),
            opt("She didn't use to eat meat.", '그녀는 고기를 먹지 않았다.'),
            opt('She not used to eat meat.', 'not used (오류)'),
            opt("She didn't use to ate meat.", 'ate (오류)'),
          ],
          answerIndex: 1,
          explanationKo: "부정문은 didn't use to + 동사원형이다.",
        },
        {
          level: 'basic',
          kind: 'reason',
          stem: "Why is this sentence wrong?\n'He didn't used to smoke.'",
          choices: [
            opt("After 'didn't', we use 'use', not 'used'.", "didn't 뒤에서는 used가 아니라 use를 쓴다."),
            opt("'smoke' must be 'smoked'.", 'smoke는 smoked여야 한다.'),
            opt("'to' must be deleted.", 'to를 삭제해야 한다.'),
            opt("'He' must be 'They'.", 'He는 They여야 한다.'),
          ],
          answerIndex: 0,
          explanationKo: 'did가 과거를 나타내므로 used의 -d가 빠진다. (didn\'t use to)',
        },
        {
          level: 'basic',
          kind: 'count_wrong',
          stem: 'How many sentences are wrong?\n(a) I used to have a dog.\n(b) She didn\'t use to like milk.\n(c) He used to plays tennis.',
          choices: [opt('0', '0개'), opt('1', '1개'), opt('2', '2개'), opt('3', '3개')],
          answerIndex: 1,
          explanationKo: '(c)만 틀렸다. used to 뒤에는 동사원형이 온다. (plays → play)',
        },
        {
          level: 'intermediate',
          kind: 'pick_different',
          stem: 'Choose the sentence that is different from the others.',
          choices: [
            opt('I used to live in Seoul.', '과거의 상태 (지금은 아님)'),
            opt('She used to have long hair.', '과거의 상태'),
            opt('There used to be a bookstore here.', '과거의 상태'),
            opt('I am used to living alone.', "'혼자 사는 데 익숙하다' (be used to + v-ing)"),
          ],
          answerIndex: 3,
          explanationKo: '④는 be used to + v-ing(~에 익숙하다)이고, 나머지는 used to + 동사원형(과거의 습관/상태)이다.',
        },
        {
          level: 'intermediate',
          kind: 'pick_correct',
          stem: 'Which is the correct question?',
          choices: [
            opt('Did you used to play baseball?', 'used (오류)'),
            opt('Did you use to play baseball?', '너는 야구를 했니?'),
            opt('Do you used to play baseball?', 'Do ... used (오류)'),
            opt('Did you use to played baseball?', 'played (오류)'),
          ],
          answerIndex: 1,
          explanationKo: '의문문은 Did + 주어 + use to + 동사원형이다.',
        },
        {
          level: 'intermediate',
          kind: 'count_wrong',
          stem: 'How many sentences are wrong?\n(a) He didn\'t used to be shy.\n(b) Did she use to walk to school?\n(c) We used to going there.\n(d) I never used to drink coffee.',
          choices: [opt('1', '1개'), opt('2', '2개'), opt('3', '3개'), opt('4', '4개')],
          answerIndex: 1,
          explanationKo: '(a) didn\'t used → didn\'t use, (c) used to going → used to go가 틀렸다.',
        },
        {
          level: 'advanced',
          kind: 'reason',
          stem: "Why is this sentence wrong?\n'I'm used to get up early.'",
          choices: [
            opt("In 'be used to', 'to' is a preposition, so a verb-ing form is needed.", "be used to에서 to는 전치사이므로 v-ing가 필요하다."),
            opt("'get' must be 'got'.", 'get은 got이어야 한다.'),
            opt("'up' must be deleted.", 'up을 삭제해야 한다.'),
            opt("'I'm' must be 'I did'.", "I'm은 I did여야 한다."),
          ],
          answerIndex: 0,
          explanationKo: '"익숙하다"는 be used to + v-ing이다. used to + 동사원형(~하곤 했다)과 구별한다.',
        },
        {
          level: 'advanced',
          kind: 'pick_correct',
          stem: "Which sentence means 'I am accustomed to getting up early'?",
          choices: [
            opt('I used to get up early.', '일찍 일어나곤 했다 (지금은 아님)'),
            opt('I am used to getting up early.', '나는 일찍 일어나는 데 익숙하다.'),
            opt('I am used to get up early.', 'get (오류)'),
            opt("I didn't use to get up early.", '일찍 일어나지 않았다 (의미 다름)'),
          ],
          answerIndex: 1,
          explanationKo: '"~에 익숙하다"는 be used to + v-ing이다.',
        },
        {
          level: 'advanced',
          kind: 'count_wrong',
          stem: "How many sentences are wrong?\n(a) She didn't used to like dogs.\n(b) I'm used to eating spicy food.\n(c) He used to being late.\n(d) Did they use to live here?\n(e) I am used to stay up late.",
          choices: [opt('1', '1개'), opt('2', '2개'), opt('3', '3개'), opt('4', '4개')],
          answerIndex: 2,
          explanationKo: '(a) didn\'t used, (c) used to being, (e) used to stay가 틀렸다. (e)는 익숙하다는 뜻이면 staying이어야 한다.',
        },
      ],
    },
  },
];

// 주제당 22문제(초급 6 · 중급 8 · 고급 8)가 되도록 추가 문항을 합친다.
for (const d of GRAMMAR_LESSON_DRAFTS) {
  d.lesson.questions.push(...(EXTRA_QUESTIONS[`${d.lessonNumber}-${d.sortOrder}`] ?? []));
}

// 정답 위치가 한쪽(A)으로 쏠리지 않도록 결정적으로 고르게 배치한다. (개수 세기 문제는 보기가 1~4 순서라 제외)
const TARGET_POSITIONS = [2, 0, 3, 1, 1, 3, 0, 2, 3, 1, 2, 0];
for (const d of GRAMMAR_LESSON_DRAFTS) {
  let i = d.sortOrder + d.lessonNumber; // 주제마다 시작점을 다르게
  for (const q of d.lesson.questions) {
    if (q.kind === 'count_wrong') continue;
    const target = TARGET_POSITIONS[i++ % TARGET_POSITIONS.length];
    if (target >= q.choices.length || target === q.answerIndex) continue;
    [q.choices[target], q.choices[q.answerIndex]] = [q.choices[q.answerIndex], q.choices[target]];
    q.answerIndex = target;
  }
}
