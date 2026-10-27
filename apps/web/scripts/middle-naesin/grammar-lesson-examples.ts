// 문법 레슨의 "예문 모음"(설명 속 모든 포인트별 예문) + 추가 규칙 + 추가 문제.
// grammar-lesson-drafts.ts 가 key(`${lessonNumber}-${sortOrder}`)로 합친다.
import type {
  GrammarLessonBilingual,
  GrammarLessonExampleGroup,
  GrammarLessonQuestion,
} from '../../models/middle-naesin/grammar-lesson';

const ex = (en: string, ko: string, tag?: string, note?: string) => ({ en, ko, ...(tag ? { tag } : {}), ...(note ? { note } : {}) });
const bad = (en: string, ko: string, note?: string) => ({ en, ko, wrong: true as const, ...(note ? { note } : {}) });
const o = (en: string, ko?: string) => ({ en, ko });

export const EXTRA_RULES: Record<string, GrammarLessonBilingual[]> = {
  '5-0': [
    { en: 'S + verb + so + adverb + that + S + V', ko: '일반동사 문장: so 뒤에 부사가 온다. (He ran so fast that ...)' },
    { en: 'S + be + so + adjective + that + S + V', ko: 'be동사 문장: so 뒤에 형용사가 온다. (He was so tired that ...)' },
    { en: 'S + verb + so + many/much/few/little + noun + that + S + V', ko: "수량 표현이 있으면 'so + many/few + 복수명사', 'so + much/little + 셀 수 없는 명사' 순서이다." },
    { en: 'S + verb/be + such + (a/an) + adjective + noun + that + S + V', ko: '형용사 뒤에 명사가 함께 나오면 so가 아니라 such를 쓴다. (such a good movie)' },
  ],
  '5-1': [
    { en: 'see, watch, look at, hear, listen to, feel, smell, notice are all perception verbs.', ko: '지각동사는 see, watch, look at, hear, listen to, feel, smell, notice 등이며, 모두 목적어 + 원형/v-ing/p.p.를 쓴다. (동사 하나당 예문 3가지 형태를 예문 모음에서 확인)' },
  ],
  '6-0': [
    { en: 'who(m) → people, which → things/animals, that → both (also when the antecedent is a person AND a thing)', ko: '선행사가 사람이면 who(m), 사물·동물이면 which, that은 둘 다 가능하다. 사람과 사물이 함께 선행사이면 that만 쓴다.' },
    { en: 'Subject relative pronoun: who/which/that + V (cannot be omitted). Object relative pronoun: + S + V (can be omitted).', ko: '주격은 뒤에 바로 동사가 오고 생략할 수 없다. 목적격은 뒤에 주어 + 동사가 오고 생략할 수 있다.' },
    { en: "'that' is preferred after the only, the first, the same, all, and -thing.", ko: 'the only, the first, the same, all, everything 같은 말이 선행사이면 that을 주로 쓴다.' },
  ],
  '6-1': [
    { en: "Negative forms: didn't use to + V, never used to + V, (formal) used not to + V.", ko: "부정형은 didn't use to + 동사원형이 기본이고, never used to + 동사원형, (격식체) used not to + 동사원형도 쓴다." },
    { en: "'used to' vs 'would': would shows repeated actions only, never a state.", ko: "used to는 과거의 습관과 상태를 모두 나타내지만, would는 반복된 행동만 나타내며 상태(be, have, like 등)에는 쓰지 못한다." },
    { en: "used to + V (past habit), be used to + noun/V-ing (be accustomed to), be used to + V (be used for)", ko: "used to + 동사원형 = ~하곤 했다 / be used to + 명사·v-ing = ~에 익숙하다 / be used to + 동사원형 = ~하는 데 쓰이다(수동)." },
  ],
};

export const EXAMPLE_GROUPS: Record<string, GrammarLessonExampleGroup[]> = {
  // ───────────────── 지각동사: 동사 8개 × (원형 · v-ing · p.p.) ─────────────────
  '5-1': [
    {
      title: 'see',
      note: '동사원형 = 동작 전체 / v-ing = 진행 중 / p.p. = 목적어가 당하는 관계',
      examples: [
        ex('I saw him cross the street.', '나는 그가 길을 건너는 것을 (처음부터 끝까지) 보았다.', '원형'),
        ex('I saw him crossing the street.', '나는 그가 길을 건너고 있는 것을 보았다.', 'v-ing'),
        ex('I saw my name written on the wall.', '나는 내 이름이 벽에 쓰여 있는 것을 보았다.', 'p.p.'),
      ],
    },
    {
      title: 'watch',
      examples: [
        ex('We watched the sun rise over the sea.', '우리는 해가 바다 위로 떠오르는 것을 지켜보았다.', '원형'),
        ex('We watched the sun rising over the sea.', '우리는 해가 바다 위로 떠오르고 있는 것을 지켜보았다.', 'v-ing'),
        ex('The kids watched the cake decorated by the chef.', '아이들은 케이크가 요리사에 의해 장식되는 것을 지켜보았다.', 'p.p.', '케이크는 장식되는 대상(수동)'),
      ],
    },
    {
      title: 'look at',
      examples: [
        ex('I looked at the birds fly away.', '나는 새들이 날아가는 것을 바라보았다.', '원형'),
        ex('I looked at the birds flying away.', '나는 새들이 날아가고 있는 것을 바라보았다.', 'v-ing'),
        ex('I looked at my hands covered with paint.', '나는 페인트로 뒤덮인 내 손을 바라보았다.', 'p.p.', '손은 뒤덮이는 대상(수동)'),
      ],
    },
    {
      title: 'hear',
      examples: [
        ex('I heard someone knock on the door.', '나는 누군가가 문을 두드리는 소리를 (한 번) 들었다.', '원형'),
        ex('I heard someone knocking on the door.', '나는 누군가가 문을 계속 두드리는 소리를 들었다.', 'v-ing'),
        ex('I heard my name called.', '나는 내 이름이 불리는 것을 들었다.', 'p.p.', '이름은 불리는 대상(수동)'),
      ],
    },
    {
      title: 'listen to',
      note: 'listen to + 목적어 + p.p.는 드물게 쓰인다. 시험에는 hear/see/feel의 p.p.가 더 자주 나온다.',
      examples: [
        ex('I listened to her sing a song.', '나는 그녀가 노래를 부르는 것을 귀 기울여 들었다.', '원형'),
        ex('I listened to her singing a song.', '나는 그녀가 노래를 부르고 있는 것을 귀 기울여 들었다.', 'v-ing'),
        ex('We listened to the speech translated into Korean.', '우리는 한국어로 통역되는 연설을 귀 기울여 들었다.', 'p.p.', '연설은 통역되는 대상(수동)'),
      ],
    },
    {
      title: 'feel',
      examples: [
        ex('I felt the ground shake.', '나는 땅이 흔들리는 것을 느꼈다.', '원형'),
        ex('I felt the ground shaking.', '나는 땅이 흔들리고 있는 것을 느꼈다.', 'v-ing'),
        ex('She felt her hand held by her mother.', '그녀는 자기 손이 엄마에게 잡혀 있는 것을 느꼈다.', 'p.p.', '손은 잡히는 대상(수동)'),
      ],
    },
    {
      title: 'smell',
      note: 'smell + 원형/p.p.는 드물고, smell + 목적어 + v-ing(냄새가 나고 있는 중)가 가장 흔하다.',
      examples: [
        ex('I smelled the cookies bake in the oven.', '나는 쿠키가 오븐에서 구워지는 냄새를 맡았다.', '원형'),
        ex('I smelled something burning.', '나는 무언가 타고 있는 냄새를 맡았다.', 'v-ing'),
        ex('I smelled the fish fried in the kitchen.', '나는 부엌에서 튀겨지는 생선 냄새를 맡았다.', 'p.p.', '생선은 튀겨지는 대상(수동)'),
      ],
    },
    {
      title: 'notice',
      examples: [
        ex('I noticed him leave the room.', '나는 그가 방을 나가는 것을 알아챘다.', '원형'),
        ex('I noticed him leaving the room.', '나는 그가 방을 나가고 있는 것을 알아챘다.', 'v-ing'),
        ex('I noticed the door left open.', '나는 문이 열린 채로 있는 것을 알아챘다.', 'p.p.', '문은 열린 채로 놓인 대상(수동)'),
      ],
    },
    {
      title: '원형 vs v-ing 의미 차이 비교',
      examples: [
        ex('I saw the man cross the road.', '나는 그 남자가 길을 건너는 것을 (건너기 시작해서 끝낼 때까지) 보았다.', '원형'),
        ex('I saw the man crossing the road.', '나는 그 남자가 길을 건너는 중인 것을 보았다.', 'v-ing'),
        ex('I heard her sing the whole song.', '나는 그녀가 노래 한 곡을 다 부르는 것을 들었다.', '원형'),
        ex('I heard her singing in the shower.', '나는 그녀가 샤워하면서 노래하고 있는 소리를 들었다.', 'v-ing'),
      ],
    },
    {
      title: '틀린 예 (지각동사 + to부정사는 ✗)',
      examples: [
        bad('I saw him to cross the street.', '지각동사 뒤에 to부정사는 쓸 수 없다. → I saw him cross / crossing the street.'),
        bad('She heard him to sing.', '→ She heard him sing / singing.'),
        bad('We felt the house to shake.', '→ We felt the house shake / shaking.'),
        bad('I noticed her to leave.', '→ I noticed her leave / leaving.'),
      ],
    },
  ],

  // ───────────────── so ~ that: 구조별 ─────────────────
  '5-0': [
    {
      title: 'S + 일반동사 + so + 부사 + that + S + V',
      examples: [
        ex('He ran so fast that nobody could catch him.', '그는 너무 빨리 달려서 아무도 그를 잡을 수 없었다.'),
        ex('She spoke so quietly that I could not hear her.', '그녀는 너무 조용히 말해서 나는 그녀의 말을 들을 수 없었다.'),
        ex('They worked so hard that they finished the project early.', '그들은 너무 열심히 일해서 프로젝트를 일찍 끝냈다.'),
        ex('She sang so beautifully that everyone clapped.', '그녀는 너무 아름답게 노래해서 모두가 박수를 쳤다.'),
        ex('He drove so carefully that nothing happened.', '그는 너무 조심스럽게 운전해서 아무 일도 일어나지 않았다.'),
      ],
    },
    {
      title: 'S + be동사 + so + 형용사 + that + S + V',
      examples: [
        ex('I was so tired that I fell asleep on the bus.', '나는 너무 피곤해서 버스에서 잠들었다.'),
        ex('The bag was so heavy that I could not carry it.', '그 가방은 너무 무거워서 나는 그것을 들 수 없었다.'),
        ex('The movie was so sad that we all cried.', '그 영화는 너무 슬퍼서 우리 모두 울었다.'),
        ex('The room is so cold that I need a coat.', '그 방은 너무 추워서 나는 코트가 필요하다.'),
        ex('She was so shy that she could not speak.', '그녀는 너무 수줍어서 말을 할 수 없었다.'),
      ],
    },
    {
      title: 'S + 일반동사 + so + 수량 표현(many/much/few/little) + 명사 + that + S + V',
      note: 'so many / so few + 복수명사, so much / so little + 셀 수 없는 명사',
      examples: [
        ex('He has so many friends that he is never alone.', '그는 친구가 너무 많아서 결코 외롭지 않다.', 'many + 복수명사'),
        ex('She ate so much food that she felt sick.', '그녀는 음식을 너무 많이 먹어서 속이 안 좋았다.', 'much + 셀 수 없는 명사'),
        ex('We had so little time that we could not finish.', '우리는 시간이 너무 적어서 끝낼 수 없었다.', 'little + 셀 수 없는 명사'),
        ex('He made so few mistakes that he got a perfect score.', '그는 실수를 너무 적게 해서 만점을 받았다.', 'few + 복수명사'),
        ex('I have so many books that I cannot count them.', '나는 책이 너무 많아서 셀 수가 없다.', 'many + 복수명사'),
      ],
    },
    {
      title: 'such + (a/an) + 형용사 + 명사 + that + S + V',
      examples: [
        ex('It was such a good movie that I saw it twice.', '그것은 너무 좋은 영화여서 나는 그것을 두 번 봤다.'),
        ex('She is such a kind girl that everyone loves her.', '그녀는 너무 친절한 소녀여서 모두가 그녀를 사랑한다.'),
        ex('They are such nice people that we invited them again.', '그들은 너무 좋은 사람들이라서 우리는 그들을 다시 초대했다.', '복수명사 → a 없음'),
        ex('He gave such a boring speech that everyone fell asleep.', '그는 너무 지루한 연설을 해서 모두가 잠들었다.'),
        ex('It was such a hot day that we stayed inside.', '너무 더운 날이어서 우리는 안에 머물렀다.'),
      ],
    },
    {
      title: 'so ~ that 과 such ~ that 구분 (같은 뜻, 다른 형태)',
      note: '형용사/부사만 있으면 so, 형용사 + 명사가 함께 있으면 such',
      examples: [
        ex('The movie was so good that I saw it twice.', '그 영화는 너무 좋아서 나는 두 번 봤다.', 'so + 형용사'),
        ex('It was such a good movie that I saw it twice.', '그것은 너무 좋은 영화여서 나는 두 번 봤다.', 'such + a + 형용사 + 명사'),
        ex('She is so kind that everyone loves her.', '그녀는 너무 친절해서 모두가 그녀를 사랑한다.', 'so + 형용사'),
        ex('She is such a kind girl that everyone loves her.', '그녀는 너무 친절한 소녀여서 모두가 그녀를 사랑한다.', 'such + a + 형용사 + 명사'),
        ex('They were so nice that we invited them again.', '그들은 너무 좋아서 우리는 다시 초대했다.', 'so + 형용사'),
        ex('They were such nice people that we invited them again.', '그들은 너무 좋은 사람들이라서 우리는 다시 초대했다.', 'such + 형용사 + 복수명사'),
      ],
    },
    {
      title: 'so ~ that (결과) vs so that (목적)',
      examples: [
        ex('He was so tired that he fell asleep.', '그는 너무 피곤해서 잠들었다.', '결과: so 뒤에 형용사'),
        ex('He studied hard so that he could pass the test.', '그는 시험에 통과하기 위해 열심히 공부했다.', '목적: so that + can/could'),
        ex('I got up so early that I caught the first bus.', '나는 너무 일찍 일어나서 첫 버스를 탔다.', '결과'),
        ex('I got up early so that I could catch the first bus.', '나는 첫 버스를 타려고 일찍 일어났다.', '목적'),
        ex('She spoke so loudly that everyone turned around.', '그녀는 너무 크게 말해서 모두가 돌아보았다.', '결과'),
        ex('She spoke loudly so that everyone could hear her.', '그녀는 모두가 들을 수 있도록 크게 말했다.', '목적'),
      ],
    },
    {
      title: 'so ~ that … can\'t = too ~ to / so ~ that … can = ~ enough to',
      examples: [
        ex("The soup was so hot that I couldn't eat it.", '그 수프는 너무 뜨거워서 나는 먹을 수 없었다.'),
        ex('The soup was too hot for me to eat.', '그 수프는 내가 먹기에 너무 뜨거웠다. (it을 다시 쓰지 않는다)', 'too ~ to'),
        ex('The test was so easy that anyone could pass it.', '그 시험은 너무 쉬워서 누구나 통과할 수 있었다.'),
        ex('The test was easy enough for anyone to pass.', '그 시험은 누구나 통과할 만큼 쉬웠다.', '~ enough to'),
        ex("He was so tired that he couldn't walk.", '그는 너무 피곤해서 걸을 수 없었다.'),
        ex('He was too tired to walk.', '그는 너무 피곤해서 걸을 수 없었다.', 'too ~ to'),
      ],
    },
    {
      title: '틀린 예 (so very ✗ 등)',
      examples: [
        bad('I was so very tired that I went to bed early.', 'so와 very는 함께 쓰지 않는다. → so tired / very tired.'),
        bad('She was so a kind girl that everyone liked her.', '→ such a kind girl.'),
        bad('He walked so slow that he missed the bus.', 'walked를 꾸미므로 부사 → so slowly.'),
        bad('He was too tired that he could not walk.', 'too ~ that은 없다. → so tired that / too tired to.'),
        bad('She has so much friends that she is happy.', 'friends는 셀 수 있는 명사 → so many friends.'),
      ],
    },
  ],

  // ───────────────── 목적격 관계대명사 ─────────────────
  '6-0': [
    {
      title: '선행사가 사람 → who(m) / that',
      examples: [
        ex('The girl who I met yesterday is my cousin.', '내가 어제 만난 소녀는 내 사촌이다.'),
        ex('The teacher whom we respect is very kind.', '우리가 존경하는 선생님은 매우 친절하시다.', 'whom (격식)'),
        ex('The man that you saw is my uncle.', '네가 본 남자는 나의 삼촌이다.'),
        ex('The boy (who) I play soccer with is Tom.', '내가 함께 축구를 하는 소년은 Tom이다.', '생략 가능'),
      ],
    },
    {
      title: '선행사가 사물·동물 → which / that',
      examples: [
        ex('The book which I bought yesterday is interesting.', '내가 어제 산 책은 재미있다.'),
        ex('The movie that we watched was sad.', '우리가 본 영화는 슬펐다.'),
        ex('The dog which my aunt has is very smart.', '우리 이모가 키우는 개는 매우 똑똑하다.', '동물도 which'),
        ex('The pizza (which) she made was delicious.', '그녀가 만든 피자는 맛있었다.', '생략 가능'),
      ],
    },
    {
      title: '선행사가 사람 + 사물 (and로 연결) → that만 가능',
      examples: [
        ex('I saw the girl and her dog that I met yesterday.', '나는 어제 만난 소녀와 그녀의 개를 보았다.'),
        ex('She talked about the man and the car that she saw at the park.', '그녀는 공원에서 본 남자와 자동차에 대해 이야기했다.'),
        ex('Look at the boy and the bike that Sam is fixing.', 'Sam이 고치고 있는 소년과 자전거를 봐.'),
      ],
    },
    {
      title: 'that을 주로 쓰는 경우 (the only, the first, all, -thing)',
      examples: [
        ex('This is the only book that I have.', '이것이 내가 가진 유일한 책이다.'),
        ex('It is the first movie that I saw alone.', '그것은 내가 혼자 본 첫 영화이다.'),
        ex('That is all that I know.', '그것이 내가 아는 전부이다.'),
        ex('Everything that she said was true.', '그녀가 말한 모든 것은 사실이었다.'),
      ],
    },
    {
      title: '목적어가 빠진 구조 (___ = 빠진 목적어)',
      note: "두 문장을 합치면 겹치는 목적어가 관계대명사가 되고 절 안에서는 빠진다.",
      examples: [
        ex('I bought a book. + I like the book. → The book (which) I bought ___ is fun.', '나는 책을 샀다. + 나는 그 책이 좋다. → 내가 산 책은 재미있다. (bought의 목적어 the book이 빠짐)'),
        ex('I met a girl. + She is my cousin. → The girl (who) I met ___ is my cousin.', '나는 소녀를 만났다. → 내가 만난 소녀는 내 사촌이다. (met의 목적어 her가 빠짐)'),
        ex('Tom likes the song. + I wrote it. → The song (that) I wrote ___ is famous.', '내가 쓴 노래는 유명하다. (wrote의 목적어 it이 빠짐)'),
        ex('We saw the movie. + You told me about it. → The movie (which) you told me about ___ was fun.', '네가 내게 말해 준 영화는 재미있었다. (about의 목적어 it이 빠짐)'),
      ],
    },
    {
      title: '전치사가 절 끝에 남는 경우',
      examples: [
        ex('The friend (who) I talked to ___ is Sam.', '내가 이야기했던 친구는 Sam이다.'),
        ex('This is the house (which) I live in ___.', '이곳은 내가 사는 집이다.'),
        ex('The girl (that) I played with ___ is Ann.', '내가 함께 놀았던 소녀는 Ann이다.'),
      ],
    },
    {
      title: '생략: 있을 때 vs 없을 때',
      examples: [
        ex('The book which I bought is fun.', '내가 산 책은 재미있다.', '관계대명사 있음'),
        ex('The book I bought is fun.', '내가 산 책은 재미있다.', '생략 (명사 바로 뒤에 S + V)'),
        ex('The man whom I met is kind.', '내가 만난 남자는 친절하다.', '있음'),
        ex('The man I met is kind.', '내가 만난 남자는 친절하다.', '생략'),
      ],
    },
    {
      title: '주격 vs 목적격 관계대명사 (뒤 구조가 다르다)',
      note: '주격: who/which/that + 동사 (생략 ✗) / 목적격: who(m)/which/that + 주어 + 동사 (생략 ○)',
      examples: [
        ex('The girl who lives next door is my friend.', '옆집에 사는 소녀는 내 친구이다.', '주격: who + 동사, 생략 ✗'),
        ex('The girl who I met yesterday is my friend.', '내가 어제 만난 소녀는 내 친구이다.', '목적격: who + 주어 + 동사, 생략 ○'),
        ex('The dog which barks at night is mine.', '밤에 짖는 개는 내 개이다.', '주격'),
        ex('The dog which I bought last week is mine.', '내가 지난주에 산 개는 내 개이다.', '목적격'),
        ex('The song that plays now is my favorite.', '지금 나오는 노래는 내가 가장 좋아하는 노래이다.', '주격'),
        ex('The song that I heard now is my favorite.', '내가 지금 들은 노래는 내가 가장 좋아하는 노래이다.', '목적격'),
      ],
    },
    {
      title: '틀린 예 (목적어 중복 · 관계대명사 오류)',
      examples: [
        bad('The book which I read it was interesting.', '관계대명사가 이미 목적어이므로 it을 삭제한다.'),
        bad('The girl who I met her is kind.', 'her를 삭제한다.'),
        bad('The friend I talked to him is Sam.', '전치사 to의 목적어가 빠졌으므로 him을 삭제한다.'),
        bad('The song what I like is old.', 'what은 선행사 뒤에 쓸 수 없다. → which / that.'),
        bad('The man which I met is kind.', '선행사가 사람이므로 who(m)/that.'),
      ],
    },
  ],

  // ───────────────── used to ─────────────────
  '6-1': [
    {
      title: 'used to + 동사원형 (과거의 습관 · 상태, 지금은 아님)',
      examples: [
        ex('I used to play soccer after school.', '나는 방과 후에 축구를 하곤 했다.', '습관'),
        ex('We used to go fishing every weekend.', '우리는 주말마다 낚시하러 가곤 했다.', '습관'),
        ex('She used to be shy.', '그녀는 수줍음이 많았다.', '상태'),
        ex('There used to be a small park here.', '여기에는 작은 공원이 있었다.', '상태'),
        ex('My father used to have a red car.', '우리 아버지는 빨간 차를 가지고 있었다.', '상태'),
      ],
    },
    {
      title: "부정: didn't use to + 동사원형",
      examples: [
        ex("She didn't use to like spicy food.", '그녀는 매운 음식을 좋아하지 않았다.'),
        ex("I didn't use to drink coffee.", '나는 커피를 마시지 않았다.'),
        ex("They didn't use to live here.", '그들은 여기에 살지 않았다.'),
        ex("He didn't use to be so tall.", '그는 예전에는 그렇게 키가 크지 않았다.'),
      ],
    },
    {
      title: 'never used to + 동사원형 / used not to + 동사원형 (격식)',
      note: "시험에서는 didn't use to를 기본으로 알고, never used to와 used not to도 알아 두자.",
      examples: [
        ex('I never used to eat vegetables.', '나는 채소를 전혀 먹지 않았다.', 'never used to'),
        ex('My brother never used to clean his room.', '내 남동생은 자기 방을 전혀 청소하지 않았다.', 'never used to'),
        ex('He used not to like fish.', '그는 생선을 좋아하지 않았다.', 'used not to (격식)'),
        ex('They used not to talk to each other.', '그들은 서로 말을 하지 않았다.', 'used not to (격식)'),
      ],
    },
    {
      title: '의문: Did + 주어 + use to + 동사원형 ~?',
      examples: [
        ex('Did you use to play with dolls?', '너는 인형을 가지고 놀곤 했니?'),
        ex('Did she use to live in Jeju?', '그녀는 제주에 살았니?'),
        ex('What did you use to do after school?', '너는 방과 후에 무엇을 하곤 했니?', '의문사 + did'),
        ex("Didn't you use to live here?", '너 예전에 여기 살지 않았니?', '부정 의문문'),
      ],
    },
    {
      title: 'used to vs would (~하곤 했다)',
      note: 'would는 반복된 행동만 가능. 상태(be, have, like, know…)에는 used to만 가능',
      examples: [
        ex('When I was young, I used to visit my grandma every summer.', '어렸을 때 나는 여름마다 할머니 댁을 방문하곤 했다.', '습관: used to'),
        ex('When I was young, I would visit my grandma every summer.', '어렸을 때 나는 여름마다 할머니 댁을 방문하곤 했다.', '습관: would 가능'),
        ex('She used to have long hair.', '그녀는 긴 머리였다.', '상태: used to만 가능'),
        bad('She would have long hair.', '상태(have)에는 would를 쓸 수 없다. → used to have.'),
        ex('There used to be a bookstore here.', '여기에는 서점이 있었다.', '상태: used to만 가능'),
        bad('There would be a bookstore here.', '상태(be)에는 would를 쓸 수 없다.'),
      ],
    },
    {
      title: 'be used to + 명사 / v-ing (~에 익숙하다), get used to (익숙해지다)',
      note: 'be used to의 to는 전치사이므로 뒤에 명사나 v-ing가 온다.',
      examples: [
        ex("I'm used to the cold weather.", '나는 추운 날씨에 익숙하다.', 'be used to + 명사'),
        ex('He is used to getting up early.', '그는 일찍 일어나는 데 익숙하다.', 'be used to + v-ing'),
        ex("She isn't used to spicy food.", '그녀는 매운 음식에 익숙하지 않다.', '부정'),
        ex('Are you used to living alone?', '너는 혼자 사는 데 익숙하니?', '의문'),
        ex("I'm getting used to my new school.", '나는 새 학교에 익숙해지고 있다.', 'get used to + 명사'),
      ],
    },
    {
      title: 'used to + V vs be used to + N/V-ing vs be used to + V',
      examples: [
        ex('I used to live in Busan.', '나는 부산에 살았다. (지금은 아님)', 'used to + 동사원형'),
        ex('I am used to living in Busan.', '나는 부산에 사는 데 익숙하다.', 'be used to + v-ing'),
        ex('I am used to the noise in Busan.', '나는 부산의 소음에 익숙하다.', 'be used to + 명사'),
        ex('This knife is used to cut bread.', '이 칼은 빵을 자르는 데 쓰인다.', 'be used to + 동사원형 (수동: 쓰이다)'),
        ex('A pen is used to write.', '펜은 글을 쓰는 데 쓰인다.', 'be used to + 동사원형'),
      ],
    },
    {
      title: '틀린 예',
      examples: [
        bad("She didn't used to like tomatoes.", "did가 있으면 use to → didn't use to."),
        bad('Did you used to live in Busan?', 'Did 뒤에서는 use to.'),
        bad('He used to played the piano.', 'used to 뒤에는 동사원형.'),
        bad('My dad used to being a teacher.', '~였다는 used to + be. (being ✗)'),
        bad("I'm used to get up early.", '익숙하다는 be used to + v-ing → getting.'),
      ],
    },
  ],
};

export const MORE_QUESTIONS: Record<string, GrammarLessonQuestion[]> = {
  '5-0': [
    {
      level: 'intermediate', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [
        o('She has so much friends that she is never alone.', 'friends는 셀 수 있는 명사 (오류)'),
        o('She has so many friends that she is never alone.', '그녀는 친구가 너무 많아서 결코 외롭지 않다.'),
        o('She has such many friends that she is never alone.', 'such many (오류)'),
        o('She has so friends that she is never alone.', '수량 표현 없음 (오류)'),
      ],
      answerIndex: 1, explanationKo: 'so many + 복수명사 / so much + 셀 수 없는 명사.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: "Which sentence has the same meaning as\n'It was such a hot day that we stayed inside.'?",
      choices: [
        o('The day was so hot that we stayed inside.', '너무 더운 날이어서 우리는 안에 머물렀다.'),
        o('It was so a hot day that we stayed inside.', 'so a (오류)'),
        o('The day was too hot that we stayed inside.', 'too ~ that (오류)'),
        o('It was so hot a day to we stayed inside.', '(오류)'),
      ],
      answerIndex: 0, explanationKo: 'such + a + 형용사 + 명사 = be + so + 형용사.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [
        o("There was so little water that we couldn't wash our hands.", '물이 너무 적어서 우리는 손을 씻을 수 없었다.'),
        o("There was so few water that we couldn't wash our hands.", 'few + 셀 수 없는 명사 (오류)'),
        o("There was such little water that we couldn't wash our hands.", 'such little (오류)'),
        o("There was so a little water that we couldn't wash our hands.", 'so a little (오류)'),
      ],
      answerIndex: 0, explanationKo: 'water는 셀 수 없는 명사이므로 so little water. (few는 셀 수 있는 명사)',
    },
  ],
  '5-1': [
    {
      level: 'intermediate', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [
        o('I smelled something to burn.', 'to burn (오류)'),
        o('I smelled something burning.', '나는 무언가 타고 있는 냄새를 맡았다.'),
        o('I smelled something burns.', 'burns (오류)'),
        o('I smelled something burned it.', 'burned it (오류)'),
      ],
      answerIndex: 1, explanationKo: 'smell도 지각동사이므로 목적어 + v-ing를 쓴다. to부정사는 ✗.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: "Which sentence means 'I heard her whole song from start to finish'?",
      choices: [
        o('I heard her sing the song.', '노래 전체를 들었다.'),
        o('I heard her singing the song.', '부르는 중인 소리를 들었다.'),
        o('I heard her to sing the song.', 'to sing (오류)'),
        o('I heard her sung the song.', 'sung (오류)'),
      ],
      answerIndex: 0, explanationKo: '동작 전체 → 동사원형, 진행 중 → v-ing.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: 'Which sentence is correct?',
      choices: [
        o('She noticed the door left open.', '그녀는 문이 열린 채로 있는 것을 알아챘다.'),
        o('She noticed the door leaving open.', 'leaving (오류)'),
        o('She noticed the door to leave open.', 'to leave (오류)'),
        o('She noticed the door leave open.', 'leave (오류: 문은 열려 있는 상태를 당함)'),
      ],
      answerIndex: 0, explanationKo: '문이 열린 채로 놓이는 수동 관계이므로 p.p.(left)를 쓴다.',
    },
  ],
  '6-0': [
    {
      level: 'intermediate', kind: 'pick_correct', stem: "Choose the correct relative pronoun.\n'I saw the girl and her dog ___ I met yesterday.'",
      choices: [o('that', '사람 + 사물 모두 가능'), o('who', '사람만'), o('which', '사물만'), o('whom', '사람만 (격식)')],
      answerIndex: 0, explanationKo: '선행사가 사람(the girl)과 동물(her dog)이 함께 있으면 that만 쓸 수 있다.',
    },
    {
      level: 'advanced', kind: 'reason', stem: "Why can the relative pronoun be omitted in\n'The book I bought is fun.'?",
      choices: [
        o('It is an object relative pronoun; S + V comes after it.', '목적격이므로 뒤에 주어 + 동사가 온다.'),
        o('It is a subject relative pronoun.', '주격 관계대명사이다.'),
        o("Because 'book' is a person.", "book이 사람이어서."),
        o('Relative pronouns can always be omitted.', '관계대명사는 항상 생략할 수 있다.'),
      ],
      answerIndex: 0, explanationKo: '목적격만 생략 가능하다. 주격(who/which/that + 동사)은 생략할 수 없다.',
    },
    {
      level: 'advanced', kind: 'count_wrong',
      stem: 'How many sentences are wrong?\n(a) The man lives next door is kind.\n(b) The book (that) I read was fun.\n(c) The girl (whom) I met is Amy.\n(d) The dog barks loudly is mine.',
      choices: [o('1', '1개'), o('2', '2개'), o('3', '3개'), o('4', '4개')],
      answerIndex: 1, explanationKo: '(a), (d)는 주격 관계대명사(who/which)를 생략해서 틀렸다. 주격은 생략할 수 없다.',
    },
  ],
  '6-1': [
    {
      level: 'intermediate', kind: 'pick_correct', stem: 'Which is the correct question?',
      choices: [
        o('Did you use to play with dolls?', '너는 인형을 가지고 놀곤 했니?'),
        o('Do you used to play with dolls?', 'Do ... used (오류)'),
        o('Did you used to play with dolls?', 'Did ... used (오류)'),
        o('Did you use to playing with dolls?', 'playing (오류)'),
      ],
      answerIndex: 0, explanationKo: 'Did + 주어 + use to + 동사원형 ~?',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: "Which sentence CANNOT be rewritten with 'would' instead of 'used to'?",
      choices: [
        o('I used to visit my grandma every summer.', '반복된 행동 → would 가능'),
        o('He used to play baseball on Sundays.', '반복된 행동 → would 가능'),
        o('She used to have long hair.', '상태(have) → would 불가'),
        o('We used to go fishing every weekend.', '반복된 행동 → would 가능'),
      ],
      answerIndex: 2, explanationKo: 'would는 반복된 행동에만 쓰고, have/be/like 같은 상태를 나타내는 동사에는 쓸 수 없다.',
    },
    {
      level: 'advanced', kind: 'pick_correct', stem: 'Which sentence is grammatically correct?',
      choices: [
        o('He used not to like fish.', '그는 생선을 좋아하지 않았다. (격식)'),
        o("He didn't used not to like fish.", '(오류)'),
        o('He used to not liked fish.', '(오류)'),
        o("He didn't used to like fish.", "didn't used (오류)"),
      ],
      answerIndex: 0, explanationKo: "used not to + 동사원형은 가능하다. didn't 뒤에서는 use to.",
    },
  ],
};
