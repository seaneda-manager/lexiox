// grammar-lesson-drafts.ts 의 문제를 주제당 22문제(초급 6 · 중급 8 · 고급 8)로 채우는 추가 문항.
import type { GrammarLessonQuestion } from '../../models/middle-naesin/grammar-lesson';

const o = (en: string, ko?: string) => ({ en, ko });
const n = (label: string) => o(label, `${label}개`);
const counts = () => [n('1'), n('2'), n('3'), n('4')];

// key: `${lessonNumber}-${sortOrder}`
export const EXTRA_QUESTIONS: Record<string, GrammarLessonQuestion[]> = {
  // ───────── 5과 · so ~ that ─────────
  '5-0': [
    {
      level: 'basic', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [
        o('The movie was so boring that I fell asleep.', '그 영화는 너무 지루해서 나는 잠들었다.'),
        o('The movie was so boring what I fell asleep.', 'that 대신 what (오류)'),
        o('The movie was so very boring that I fell asleep.', 'so very (오류)'),
        o('The movie so was boring that I fell asleep.', '어순 (오류)'),
      ],
      answerIndex: 0, explanationKo: 'so + 형용사 + that + 주어 + 동사 순서이다.',
    },
    {
      level: 'basic', kind: 'pick_correct', stem: "Choose the correct word for the blank.\n'He was so ___ that he couldn't speak.'",
      choices: [o('nervous', '긴장한 (형용사)'), o('nervously', '긴장해서 (부사)'), o('nerve', '신경 (명사)'), o('nervousness', '긴장 (명사)')],
      answerIndex: 0, explanationKo: 'was(be동사) 뒤에서 주어를 설명하므로 형용사 nervous가 필요하다.',
    },
    {
      level: 'basic', kind: 'reason', stem: "Why is this sentence wrong?\n'It was so hot what we went swimming.'",
      choices: [
        o("We need 'that', not 'what'.", 'what이 아니라 that이 필요하다.'),
        o("'hot' must be 'hotly'.", 'hot은 hotly여야 한다.'),
        o("'went' must be 'go'.", 'went는 go여야 한다.'),
        o("'so' must be 'very'.", 'so는 very여야 한다.'),
      ],
      answerIndex: 0, explanationKo: '결과를 나타내는 절은 that이 이끈다.',
    },
    {
      level: 'intermediate', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [
        o('She ran so fast that she won the race.', '그녀는 너무 빨리 달려서 경주에서 이겼다.'),
        o('She ran so fastly that she won the race.', 'fastly (오류)'),
        o('She ran so fast to she won the race.', 'to (오류)'),
        o('She ran such fast that she won the race.', 'such (오류)'),
      ],
      answerIndex: 0, explanationKo: 'fast는 형용사와 부사가 같은 모양이라 fastly는 없다.',
    },
    {
      level: 'intermediate', kind: 'count_wrong',
      stem: "How many sentences are wrong?\n(a) The soup was so salty that I couldn't eat it.\n(b) She spoke so loud that everyone heard her.\n(c) He is so very smart that he skipped a grade.\n(d) It was so a cold day that we stayed inside.",
      choices: counts(), answerIndex: 2,
      explanationKo: '(b) loud → loudly, (c) so very, (d) so a cold day → such a cold day.',
    },
    {
      level: 'intermediate', kind: 'pick_different', stem: 'Choose the sentence that is different from the others.',
      choices: [
        o('He was so tall that he hit his head.', 'so ~ that'),
        o("The bag was so heavy that I couldn't lift it.", 'so ~ that'),
        o("It was so dark that we couldn't see.", 'so ~ that'),
        o('He was too tired to walk.', 'too ~ to (that절 없음)'),
      ],
      answerIndex: 3, explanationKo: '④만 too ~ to 구문이고 나머지는 so ~ that 구문이다.',
    },
    {
      level: 'intermediate', kind: 'reason', stem: "Why is this sentence wrong?\n'She is so a nice teacher that we all love her.'",
      choices: [
        o("Before 'a + adjective + noun', we use 'such', not 'so'.", "'a + 형용사 + 명사' 앞에는 so가 아니라 such를 쓴다."),
        o("'nice' must be 'nicely'.", 'nice는 nicely여야 한다.'),
        o("'love' must be 'loves'.", 'love는 loves여야 한다.'),
        o("'that' must be 'what'.", 'that은 what이어야 한다.'),
      ],
      answerIndex: 0, explanationKo: 'such a nice teacher that ~',
    },
    {
      level: 'intermediate', kind: 'pick_correct', stem: "Which sentence has the same meaning as\n'He was so shy that he couldn't talk to her.'?",
      choices: [
        o('He was too shy to talk to her.', '그는 너무 수줍어서 그녀에게 말을 걸 수 없었다.'),
        o('He was shy enough to talk to her.', '말을 걸 만큼 수줍었다 (의미 다름)'),
        o('He was so shy that he could talk to her.', '말을 걸 수 있었다 (의미 다름)'),
        o('He was too shy that he talked to her.', 'too ~ that (오류)'),
      ],
      answerIndex: 0, explanationKo: "so ~ that ... can't = too ~ to.",
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [
        o("The box was too heavy that I couldn't lift it.", 'too ~ that (오류)'),
        o('The box was so heavy for me to lift.', 'so ~ for me to (오류)'),
        o('The box was too heavy for me to lift.', '그 상자는 너무 무거워서 내가 들 수 없었다.'),
        o('The box was too heavy for me to lift it.', 'it 중복 (오류)'),
      ],
      answerIndex: 2, explanationKo: 'too ~ to 구문에서는 to부정사의 목적어를 다시 쓰지 않는다.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: "Which sentence uses 'so that' to show a PURPOSE?",
      choices: [
        o('He was so tired that he fell asleep.', '결과'),
        o('I studied hard so that I could pass the exam.', '목적: 시험에 통과하기 위해'),
        o('She was so happy that she cried.', '결과'),
        o("The bag was so heavy that I couldn't carry it.", '결과'),
      ],
      answerIndex: 1, explanationKo: "so와 that 사이에 형용사/부사가 없고 'so that + 주어 + could'가 오면 목적이다.",
    },
    {
      level: 'advanced', kind: 'count_wrong',
      stem: "How many sentences are wrong?\n(a) The test was so difficult that nobody passed.\n(b) The test was too difficult that nobody passed.\n(c) He ran so fast that no one could catch him.\n(d) It was such a hot day that we went swimming.",
      choices: counts(), answerIndex: 0, explanationKo: '(b)만 틀렸다. too ~ that은 없다.',
    },
    {
      level: 'advanced', kind: 'reason', stem: "Why is this sentence wrong?\n'The tea was too hot for me to drink it.'",
      choices: [
        o("In 'too ~ to', the object of the to-infinitive is not repeated.", 'too ~ to 구문에서는 to부정사의 목적어를 다시 쓰지 않는다.'),
        o("'too' must be 'so'.", 'too는 so여야 한다.'),
        o("'drink' must be 'drank'.", 'drink는 drank여야 한다.'),
        o("'for me' must be deleted.", 'for me를 삭제해야 한다.'),
      ],
      answerIndex: 0, explanationKo: '주어 The tea가 drink의 목적어이므로 it이 필요 없다.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: "Which sentence is closest in meaning to\n'The story was so sad that we all cried.'?",
      choices: [
        o('The story was too sad for us to cry.', '너무 슬퍼서 울 수 없었다 (의미 다름)'),
        o('It was such a sad story that we all cried.', '그것은 너무 슬픈 이야기여서 우리 모두 울었다.'),
        o("The story was so sad that we didn't cry.", '울지 않았다 (의미 다름)'),
        o('The story was sad enough to make us not cry.', '울지 않게 할 만큼 슬펐다 (의미 다름)'),
      ],
      answerIndex: 1, explanationKo: 'so + 형용사 + that ≒ such + a + 형용사 + 명사 + that.',
    },
  ],

  // ───────── 5과 · 지각동사 ─────────
  '5-1': [
    {
      level: 'basic', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [o('I heard him sing.', '나는 그가 노래하는 것을 들었다.'), o('I heard him to sing.', 'to sing (오류)'), o('I heard he sing.', 'he (오류)'), o('I heard him sang.', 'sang (오류)')],
      answerIndex: 0, explanationKo: '지각동사 + 목적어 + 동사원형.',
    },
    {
      level: 'basic', kind: 'pick_correct', stem: "Choose the correct word for the blank.\n'We saw the bird ___ away.'",
      choices: [o('fly', '날다 (원형)'), o('to fly', 'to부정사'), o('flew', '과거형'), o('flies', '3인칭 단수형')],
      answerIndex: 0, explanationKo: '지각동사 saw 뒤에는 동사원형이 온다.',
    },
    {
      level: 'basic', kind: 'reason', stem: "Why is this sentence wrong?\n'I felt the house to shake.'",
      choices: [
        o("We don't use 'to' after a perception verb.", '지각동사 뒤에는 to를 쓰지 않는다.'),
        o("'felt' must be 'feel'.", 'felt는 feel이어야 한다.'),
        o("'house' must be 'houses'.", 'house는 houses여야 한다.'),
        o("'shake' must be 'shook'.", 'shake는 shook이어야 한다.'),
      ],
      answerIndex: 0, explanationKo: 'to shake → shake / shaking.',
    },
    {
      level: 'intermediate', kind: 'count_wrong',
      stem: 'How many sentences are wrong?\n(a) I saw the boy running.\n(b) She heard someone to knock.\n(c) We watched the sun to go down.\n(d) He felt something touched his back.',
      choices: counts(), answerIndex: 2,
      explanationKo: '(b) to knock, (c) to go, (d) touched(→ touch/touching)가 틀렸다.',
    },
    {
      level: 'intermediate', kind: 'pick_different', stem: 'Choose the sentence that is different from the others.',
      choices: [o('I saw her dance.', '옳은 문장'), o('I heard him play the guitar.', '옳은 문장'), o('We watched them cross the street.', '옳은 문장'), o('I felt someone to touch my shoulder.', 'to touch (오류)')],
      answerIndex: 3, explanationKo: '④는 지각동사 뒤에 to부정사를 써서 틀렸다.',
    },
    {
      level: 'intermediate', kind: 'pick_correct', stem: "Which sentence means 'I heard my name being called'?",
      choices: [o('I heard my name call.', 'call (오류)'), o('I heard my name called.', '나는 내 이름이 불리는 것을 들었다.'), o('I heard my name to call.', 'to call (오류)'), o('I heard my name calls.', 'calls (오류)')],
      answerIndex: 1, explanationKo: '이름은 불리는 대상(수동)이므로 p.p.를 쓴다.',
    },
    {
      level: 'intermediate', kind: 'reason', stem: "Why is this sentence wrong?\n'She heard the baby cries.'",
      choices: [
        o('After a perception verb, we use a base verb or -ing, not a third-person -s form.', '지각동사 뒤에는 원형이나 v-ing를 쓰고 3인칭 -s형은 쓰지 않는다.'),
        o("'heard' must be 'hear'.", 'heard는 hear여야 한다.'),
        o("'baby' must be 'babies'.", 'baby는 babies여야 한다.'),
        o("'the' must be deleted.", 'the를 삭제해야 한다.'),
      ],
      answerIndex: 0, explanationKo: 'cries → cry / crying.',
    },
    {
      level: 'intermediate', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [o('He saw a dog to run across the road.', 'to run (오류)'), o('He saw a dog running across the road.', '그는 개가 길을 가로질러 달려가는 것을 보았다.'), o('He saw a dog ran across the road.', 'ran (오류)'), o('He saw a dog runs across the road.', 'runs (오류)')],
      answerIndex: 1, explanationKo: '지각동사 + 목적어 + 원형/v-ing.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: 'Which sentence means that he saw only PART of the action (it was in progress)?',
      choices: [o('I saw him cross the bridge.', '다리를 건너는 것 전체를 보았다.'), o('I saw him crossing the bridge.', '건너고 있는 중인 모습을 보았다.'), o('I saw him to cross the bridge.', 'to cross (오류)'), o('I saw him crossed the bridge.', 'crossed (오류)')],
      answerIndex: 1, explanationKo: 'v-ing는 진행 중인 동작의 일부를, 원형은 동작 전체를 나타낸다.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [o('I listened to the students to sing.', 'to sing (오류)'), o('I listened to the students sing.', '나는 학생들이 노래하는 것을 귀 기울여 들었다.'), o('I listened to the students sang.', 'sang (오류)'), o('I listened to the students sings.', 'sings (오류)')],
      answerIndex: 1, explanationKo: 'listen to도 지각동사처럼 목적어 + 원형/v-ing를 쓴다.',
    },
    {
      level: 'advanced', kind: 'count_wrong',
      stem: 'How many sentences are wrong?\n(a) I saw him steal the bike.\n(b) I heard her name announcing.\n(c) We watched the kids to play.\n(d) I felt the ground shaking.\n(e) She smelled something burning.',
      choices: counts(), answerIndex: 1, explanationKo: '(b) announcing → announced, (c) to play → play/playing이 틀렸다.',
    },
    {
      level: 'advanced', kind: 'reason', stem: "Why is this sentence wrong?\n'I looked at him to dance.'",
      choices: [
        o("'look at' works like a perception verb, so we don't use 'to'.", 'look at도 지각동사처럼 to 없이 원형/v-ing를 쓴다.'),
        o("'looked' must be 'look'.", 'looked는 look이어야 한다.'),
        o("'him' must be 'he'.", 'him은 he여야 한다.'),
        o("'at' must be 'to'.", 'at은 to여야 한다.'),
      ],
      answerIndex: 0, explanationKo: 'I looked at him dance/dancing.',
    },
    {
      level: 'advanced', kind: 'pick_different', stem: 'Choose the sentence that is different from the others.',
      choices: [o('I heard him sing.', '지각동사 + 원형'), o('I saw them play.', '지각동사 + 원형'), o('We watched her dance.', '지각동사 + 원형'), o('I wanted him to sing.', 'want + 목적어 + to부정사')],
      answerIndex: 3, explanationKo: '④는 지각동사가 아닌 want이므로 to부정사를 쓴다. 나머지는 지각동사 + 원형이다.',
    },
  ],

  // ───────── 6과 · 목적격 관계대명사 ─────────
  '6-0': [
    {
      level: 'basic', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [o('This is the bag which I bought.', '이것은 내가 산 가방이다.'), o('This is the bag which I bought it.', 'it 중복 (오류)'), o('This is the bag who I bought.', 'who (오류)'), o('This is the bag what I bought.', 'what (오류)')],
      answerIndex: 0, explanationKo: '사물 선행사 + which, 뒤에는 목적어가 빠진 "주어 + 동사".',
    },
    {
      level: 'basic', kind: 'pick_correct', stem: "Choose the correct word for the blank.\n'The girl ___ I met is Amy.'",
      choices: [o('who', '사람 선행사'), o('which', '사물 선행사'), o('what', '선행사 없이 쓰는 말'), o('whose', '소유격')],
      answerIndex: 0, explanationKo: '선행사가 사람(the girl)이므로 who(m)를 쓴다.',
    },
    {
      level: 'basic', kind: 'reason', stem: "Why is this sentence wrong?\n'The man which I met is kind.'",
      choices: [
        o("The antecedent is a person, so 'who(m)' or 'that' is needed.", '선행사가 사람이므로 who(m)/that이 필요하다.'),
        o("'met' must be 'meet'.", 'met은 meet이어야 한다.'),
        o("'man' must be 'men'.", 'man은 men이어야 한다.'),
        o("'is' must be 'are'.", 'is는 are여야 한다.'),
      ],
      answerIndex: 0, explanationKo: '사람 → who/whom/that, 사물 → which/that.',
    },
    {
      level: 'intermediate', kind: 'count_wrong',
      stem: 'How many sentences are wrong?\n(a) The book that I read was fun.\n(b) The boy whom I saw is Tom.\n(c) The cake which she made it was great.\n(d) The dog which I have is small.',
      choices: counts(), answerIndex: 0, explanationKo: '(c)만 틀렸다. made it의 it을 삭제해야 한다.',
    },
    {
      level: 'intermediate', kind: 'pick_different', stem: 'Choose the sentence that is different from the others.',
      choices: [o('The movie which I saw was fun.', '옳은 문장'), o('The teacher whom I respect is kind.', '옳은 문장'), o('The song that I like is old.', '옳은 문장'), o('The book who I read is old.', 'who (오류: 선행사가 사물)')],
      answerIndex: 3, explanationKo: '④는 선행사가 사물(the book)인데 who를 써서 틀렸다.',
    },
    {
      level: 'intermediate', kind: 'pick_correct', stem: "Which sentence is the same as\n'The book which I bought is fun.'?",
      choices: [o('The book I bought is fun.', '관계대명사 생략'), o('The book bought is fun.', '주어 누락 (오류)'), o('The book I bought it is fun.', 'it 중복 (오류)'), o('The book which bought is fun.', '주어 누락 (오류)')],
      answerIndex: 0, explanationKo: '목적격 관계대명사는 생략할 수 있다. 명사 바로 뒤에 "주어 + 동사"가 온다.',
    },
    {
      level: 'intermediate', kind: 'reason', stem: "Why is this sentence wrong?\n'The girl who I met her is kind.'",
      choices: [
        o("The object is missing after 'who', so 'her' must be deleted.", 'who 뒤에서는 목적어가 빠져야 하므로 her를 삭제해야 한다.'),
        o("'who' must be 'which'.", 'who는 which여야 한다.'),
        o("'kind' must be 'kindly'.", 'kind는 kindly여야 한다.'),
        o("'is' must be 'was'.", 'is는 was여야 한다.'),
      ],
      answerIndex: 0, explanationKo: 'who가 met의 목적어 역할을 한다.',
    },
    {
      level: 'intermediate', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [o('The man whom I saw him is my uncle.', 'him 중복 (오류)'), o('The man whom I saw is my uncle.', '내가 본 남자는 나의 삼촌이다.'), o('The man who saw I is my uncle.', '어순 (오류)'), o('The man whom saw I is my uncle.', '어순 (오류)')],
      answerIndex: 1, explanationKo: '관계대명사 뒤에는 "주어 + 동사" 순서이고 목적어는 빠진다.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [o('The girl I played with is Ann.', '내가 함께 놀았던 소녀는 Ann이다.'), o('The girl I played is Ann with.', '어순 (오류)'), o('The girl I played with her is Ann.', 'her 중복 (오류)'), o('The girl with I played is Ann.', '관계대명사 없이 with를 앞에 씀 (오류)')],
      answerIndex: 0, explanationKo: 'played with의 with를 절 끝에 남기고, 목적어는 관계대명사(생략)로 대신한다.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: 'In which sentence can the relative pronoun NOT be omitted?',
      choices: [o('The pizza (which) I ate was good.', '목적격 (생략 가능)'), o('The boy (whom) I met is Tom.', '목적격 (생략 가능)'), o('The man who lives next door is kind.', '주격 (생략 불가)'), o('The song (that) I love is old.', '목적격 (생략 가능)')],
      answerIndex: 2, explanationKo: '주격 관계대명사(who 뒤에 바로 동사)는 생략할 수 없다.',
    },
    {
      level: 'advanced', kind: 'count_wrong',
      stem: 'How many sentences are wrong?\n(a) The movie I watched was sad.\n(b) The girl who I talked is Amy.\n(c) The car that he drives it is old.\n(d) The teacher whom we respect is kind.',
      choices: counts(), answerIndex: 1, explanationKo: '(b) talked to에서 to 누락, (c) it 중복이 틀렸다.',
    },
    {
      level: 'advanced', kind: 'reason', stem: "Why is this sentence wrong?\n'The song what I like is old.'",
      choices: [
        o("'what' cannot follow an antecedent; use 'which' or 'that'.", '선행사(the song) 뒤에서는 what을 쓸 수 없고 which/that을 써야 한다.'),
        o("'like' must be 'likes'.", 'like는 likes여야 한다.'),
        o("'old' must be 'older'.", 'old는 older여야 한다.'),
        o("'is' must be 'are'.", 'is는 are여야 한다.'),
      ],
      answerIndex: 0, explanationKo: 'what은 선행사를 포함한 관계대명사(~하는 것)이다.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: 'Which sentence is grammatically correct?',
      choices: [o('This is the house which I live in.', '이곳은 내가 사는 집이다.'), o('This is the house which I live in it.', 'it 중복 (오류)'), o('This is the house who I live.', 'who / in 누락 (오류)'), o('This is the house in which I live in.', 'in 중복 (오류)')],
      answerIndex: 0, explanationKo: 'live in의 in을 절 끝에 남기고 목적어는 관계대명사로 대신한다.',
    },
  ],

  // ───────── 6과 · used to ─────────
  '6-1': [
    {
      level: 'basic', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [o('I used to play the piano.', '나는 피아노를 치곤 했다.'), o('I use to play the piano.', 'use (오류)'), o('I used to played the piano.', 'played (오류)'), o('I used play the piano.', 'to 누락 (오류)')],
      answerIndex: 0, explanationKo: 'used to + 동사원형.',
    },
    {
      level: 'basic', kind: 'pick_correct', stem: "Choose the correct word for the blank.\n'She didn't ___ to eat vegetables.'",
      choices: [o('use', 'didn\'t 뒤 원형'), o('used', '과거형'), o('using', 'v-ing'), o('uses', '3인칭 단수')],
      answerIndex: 0, explanationKo: "didn't 뒤에는 동사원형 use를 쓴다.",
    },
    {
      level: 'basic', kind: 'reason', stem: "Why is this sentence wrong?\n'He used to plays soccer.'",
      choices: [
        o("A base verb comes after 'used to'.", 'used to 뒤에는 동사원형이 온다.'),
        o("'used' must be 'use'.", 'used는 use여야 한다.'),
        o("'soccer' must be 'soccers'.", 'soccer는 soccers여야 한다.'),
        o("'He' must be 'His'.", 'He는 His여야 한다.'),
      ],
      answerIndex: 0, explanationKo: 'plays → play.',
    },
    {
      level: 'intermediate', kind: 'count_wrong',
      stem: "How many sentences are wrong?\n(a) I didn't use to like fish.\n(b) Did he used to live here?\n(c) She used to wear glasses.\n(d) We used to go there.",
      choices: counts(), answerIndex: 0, explanationKo: '(b)만 틀렸다. Did 뒤에서는 use to를 쓴다.',
    },
    {
      level: 'intermediate', kind: 'pick_different', stem: 'Choose the sentence that is different from the others.',
      choices: [o('Did you use to play chess?', '옳은 문장'), o('I never used to like tea.', '옳은 문장'), o("She didn't use to be tall.", '옳은 문장'), o("He didn't used to be late.", "didn't used (오류)")],
      answerIndex: 3, explanationKo: "④는 didn't 뒤에 used를 써서 틀렸다. (didn't use to)",
    },
    {
      level: 'intermediate', kind: 'pick_correct', stem: 'Which is the correct negative sentence?',
      choices: [o("I didn't used to swim.", 'used (오류)'), o("I didn't use to swim.", '나는 수영을 하지 않았다.'), o('I not use to swim.', 'not (오류)'), o("I don't used to swim.", "don't used (오류)")],
      answerIndex: 1, explanationKo: "부정문은 didn't use to + 동사원형이다.",
    },
    {
      level: 'intermediate', kind: 'reason', stem: "Why is this sentence wrong?\n'Did you used to live in Busan?'",
      choices: [
        o("After 'Did', we use 'use to', not 'used to'.", 'Did 뒤에서는 used to가 아니라 use to를 쓴다.'),
        o("'live' must be 'lived'.", 'live는 lived여야 한다.'),
        o("'in' must be 'at'.", 'in은 at이어야 한다.'),
        o("'Did' must be 'Do'.", 'Did는 Do여야 한다.'),
      ],
      answerIndex: 0, explanationKo: 'Did가 과거를 나타내므로 used의 -d가 빠진다.',
    },
    {
      level: 'intermediate', kind: 'pick_correct', stem: "Which sentence means 'There was a park here, but there isn't one now'?",
      choices: [o('There used to be a park here.', '여기에 공원이 있었다.'), o('There is used to a park here.', '(오류)'), o('There uses to be a park here.', '(오류)'), o('There is use to be a park here.', '(오류)')],
      answerIndex: 0, explanationKo: 'There used to be ~ : 과거에 ~이 있었다(지금은 없다).',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [o("I'm used to walk to school.", 'walk (오류)'), o("I'm used to walking to school.", '나는 학교에 걸어가는 데 익숙하다.'), o("I'm use to walking to school.", 'use (오류)'), o("I'm used to walked to school.", 'walked (오류)')],
      answerIndex: 1, explanationKo: 'be used to의 to는 전치사이므로 v-ing가 온다.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: "Which sentence has the same meaning as\n'I used to live in Jeju.'?",
      choices: [o("I lived in Jeju in the past, but I don't now.", '과거에 제주에 살았지만 지금은 아니다.'), o('I am accustomed to living in Jeju.', '제주에 사는 데 익숙하다 (의미 다름)'), o('I live in Jeju now.', '지금 제주에 산다 (의미 다름)'), o('I want to live in Jeju.', '제주에 살고 싶다 (의미 다름)')],
      answerIndex: 0, explanationKo: 'used to는 과거의 상태나 습관이며 지금은 그렇지 않다는 뜻이 담겨 있다.',
    },
    {
      level: 'advanced', kind: 'count_wrong',
      stem: "How many sentences are wrong?\n(a) I didn't use to like coffee.\n(b) She used to be shy.\n(c) He is used to work late.\n(d) Did you use to have a pet?\n(e) We didn't used to have a car.",
      choices: counts(), answerIndex: 1, explanationKo: '(c) work → working, (e) didn\'t used → didn\'t use가 틀렸다.',
    },
    {
      level: 'advanced', kind: 'reason', stem: "Why is this sentence wrong?\n'He is used to work late.'",
      choices: [
        o("In 'be used to', 'to' is a preposition, so we need -ing.", 'be used to의 to는 전치사이므로 v-ing가 와야 한다.'),
        o("'is' must be 'does'.", 'is는 does여야 한다.'),
        o("'late' must be 'lately'.", 'late는 lately여야 한다.'),
        o("'work' must be 'worked'.", 'work는 worked여야 한다.'),
      ],
      answerIndex: 0, explanationKo: 'He is used to working late.',
    },
    {
      level: 'advanced', kind: 'pick_different', stem: 'Choose the sentence that is different from the others.',
      choices: [o('I used to live in Busan.', 'used to + 동사원형'), o('She used to have a cat.', 'used to + 동사원형'), o('They used to play soccer.', 'used to + 동사원형'), o('I got used to the cold weather.', 'get used to + 명사 (~에 익숙해지다)')],
      answerIndex: 3, explanationKo: '④는 get used to(~에 익숙해지다)이고 나머지는 used to + 동사원형(~하곤 했다)이다.',
    },
  ],
};
