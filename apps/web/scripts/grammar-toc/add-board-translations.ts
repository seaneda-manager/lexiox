// 사용: npx tsx scripts/grammar-toc/add-board-translations.ts [--final] [--dry]
// 초안(draft) 레슨의 강의 판서(board) 영어 예문 줄 뒤에 " — 한글 해석"을 붙인다. 규칙: 판서의 영어 예문에는 반드시 해석이 있어야 한다.
// 멱등: 이미 한글이 있는 줄은 건드리지 않는다. 확정(final) 레슨은 건드리지 않는다(되돌린 뒤 따로 처리).
import fs from 'fs';
import path from 'path';

const dry = process.argv.includes('--dry');
const wantStatus = process.argv.includes('--final') ? 'final' : 'draft'; // --final: 확정 레슨의 판서만 고친다(상태·문제는 그대로)
const env = Object.fromEntries(
  fs.readFileSync(path.resolve(__dirname, '../../.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
);
const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };

const KO: Record<string, string> = {
  // personal-pronouns
  '× Me like pizza.': '나는 피자를 좋아한다.', '○ I like pizza.': '나는 피자를 좋아한다.', '× Mom helps I.': '엄마는 나를 도와주신다.', '○ Mom helps me.': '엄마는 나를 도와주신다.',
  // be-verb
  'I am a student.': '나는 학생이다.', 'She is not at home.': '그녀는 집에 없다.', 'Are you hungry?': '너는 배고프니?', '× I is a student.': '나는 학생이다.', '○ I am a student.': '나는 학생이다.', '× She are kind.': '그녀는 친절하다.', '× Are he tall?': '그는 키가 크니?',
  // sentence-patterns-123
  'Birds fly in the sky.': '새들은 하늘을 난다.', 'I like pizza.': '나는 피자를 좋아한다.', '× She is.': '그녀는 ~이다. (뜻이 덜 끝남)', '○ She is kind.': '그녀는 친절하다.', '× He became.': '그는 ~이 되었다. (뜻이 덜 끝남)', '○ He became tall.': '그는 키가 커졌다.', 'She grows older. / She grows flowers.': '그녀는 나이가 든다. / 그녀는 꽃을 키운다.',
  // general-verbs
  'I play soccer.': '나는 축구를 한다.', 'We eat lunch.': '우리는 점심을 먹는다.', 'She plays soccer.': '그녀는 축구를 한다.', 'He goes to school.': '그는 학교에 간다.', "I don't like milk.": '나는 우유를 좋아하지 않는다.', "He doesn't like milk.": '그는 우유를 좋아하지 않는다.', 'Do you play soccer?': '너는 축구를 하니?', 'Does she play soccer?': '그녀는 축구를 하니?', '× She play soccer.': '그녀는 축구를 한다.', "× He doesn't likes milk.": '그는 우유를 좋아하지 않는다.', '× Does she plays soccer?': '그녀는 축구를 하니?',
  // ditransitive-verbs
  'Mr. Kim teaches us English.': '김 선생님은 우리에게 영어를 가르치신다.', '× She sent to him an email.': '그녀는 그에게 이메일을 보냈다.', '○ She sent him an email.': '그녀는 그에게 이메일을 보냈다.', '× My aunt bought for me a doll.': '이모는 나에게 인형을 사 주셨다.', '× Dad gave a watch me.': '아빠는 나에게 시계를 주셨다.', "I didn't give him my candy.": '나는 그에게 내 사탕을 주지 않았다.',
  // future-expressions
  'I will visit my aunt.': '나는 이모를 방문할 것이다.', 'She will call you.': '그녀가 네게 전화할 것이다.', 'I am going to study.': '나는 공부할 예정이다.', 'He is going to cook.': '그는 요리할 예정이다.', 'We are going to travel.': '우리는 여행할 예정이다.', 'I will not be late.': '나는 늦지 않을 것이다.', 'He is not going to join.': '그는 가입하지 않을 것이다.', 'Will you help me?': '나를 도와줄래?', 'Are you going to play soccer?': '너는 축구할 거니?', '× She will goes home.': '그녀는 집에 갈 것이다.', '○ She will go home.': '그녀는 집에 갈 것이다.', '× They will to visit Jeju.': '그들은 제주도를 방문할 것이다.', '× He are going to visit us.': '그는 우리를 방문할 예정이다.',
  // countable / uncountable / articles
  '× I have two cat.': '나는 고양이가 두 마리 있다.', '× Three boxs are here.': '상자 세 개가 여기 있다.', '× Two childs are here.': '아이 두 명이 여기 있다.',
  'How much money?': '돈이 얼마나 있니?', 'How many books?': '책이 몇 권 있니?', 'The milk is cold.': '우유가 차갑다.', 'There is some water.': '물이 좀 있다.', '× I have much friends.': '나는 친구가 많다.',
  'I saw a dog.': '나는 개를 봤다.', 'The dog was big.': '그 개는 컸다.', '× She is a engineer.': '그녀는 기술자다.', '× I have an book.': '나는 책이 한 권 있다.', '× I play the soccer.': '나는 축구를 한다.',
  // there-is-are
  'There is a pen.': '펜이 하나 있다.', 'There are two cats.': '고양이가 두 마리 있다.', 'There are many people.': '사람이 많다.', "There isn't any milk.": '우유가 하나도 없다.', "There aren't any students.": '학생이 한 명도 없다.', 'Is there a bank?': '은행이 있니?', 'Are there any eggs?': '달걀이 있니?', 'Yes, there is.': '응, 있어.', '× There is two books.': '책이 두 권 있다.', '× There are a cat.': '고양이가 한 마리 있다.', '× Are there a pen?': '펜이 하나 있니?',
  // reflexive / demonstrative
  'I hurt myself.': '나는 다쳤다.', 'She looked at herself.': '그녀는 자기 자신을 봤다.', 'I made it myself.': '나는 그것을 직접 만들었다.', '× I hurt me.': '나는 다쳤다.', '× He hurt hisself.': '그는 다쳤다.', '× They enjoyed theirselves.': '그들은 즐겁게 지냈다.',
  'This is my pen.': '이것은 내 펜이다.', 'These are my shoes.': '이것들은 내 신발이다.', 'That is my house.': '저것은 내 집이다.', 'Those are my friends.': '저 사람들은 내 친구들이다.', 'It is rainy.': '비가 온다.', 'What time is it?': '몇 시니?', 'It is Monday.': '월요일이다.', '× This are my shoes.': '이것들은 내 신발이다.', '× Those is my friends.': '저 사람들은 내 친구들이다.', '× They is cold today.': '오늘은 춥다.',
  // ── 확정(final) 레슨용 (--final) ──
  'I can run fast.': '나는 빨리 달릴 수 있다.', 'She can run fast.': '그녀는 빨리 달릴 수 있다.', 'You may go home now.': '너는 이제 집에 가도 된다.', '= You can go home now.': '너는 이제 집에 가도 된다.', '× He can plays soccer.': '그는 축구를 할 수 있다.', '× She can swam fast.': '그녀는 빨리 수영할 수 있다.', '× You may going out.': '너는 나가도 된다.', 'I cannot lift this box.': '나는 이 상자를 들 수 없다.', 'I am able to skate.': '나는 스케이트를 탈 수 있다.', 'He is able to skate.': '그는 스케이트를 탈 수 있다.', 'Can I open the window?': '창문을 열어도 될까요?', 'May I use your phone?': '전화기를 써도 될까요?',
  'This smart phone is not as expensive as that computer.': '이 스마트폰은 저 컴퓨터만큼 비싸지 않다.', 'Mount Everest is higher than any other mountain in the world.': '에베레스트산은 세계의 다른 어떤 산보다 높다.', 'No other student in my class is as smart as Kevin.': '우리 반의 어떤 학생도 케빈만큼 똑똑하지 않다.', 'No other river in Africa is longer than the Nile.': '아프리카의 어떤 강도 나일강보다 길지 않다.',
  'She kept her room clean.': '그녀는 자기 방을 깨끗하게 유지했다.', 'I found the math exam easy.': '나는 수학 시험이 쉽다고 생각했다.', 'They named the baby Leo.': '그들은 아기를 레오라고 이름 지었다.', 'We elected him our leader.': '우리는 그를 우리의 지도자로 뽑았다.', 'My dad wants me to clean.': '아빠는 내가 청소하기를 원하신다.', 'The teacher told us to listen.': '선생님은 우리에게 들으라고 말씀하셨다.',
  '× I saw him to cross the street.': '나는 그가 길을 건너는 것을 봤다.', '○ I saw him cross / crossing the street.': '나는 그가 길을 건너는 것을 봤다.', '× We felt the house to shake.': '우리는 집이 흔들리는 것을 느꼈다.', 'I listened to her sing a song.': '나는 그녀가 노래하는 것을 들었다.',
  'I used to play soccer after school.': '나는 방과 후에 축구를 하곤 했다.', "She didn't use to like spicy food.": '그녀는 매운 음식을 좋아하지 않았다.', 'Did you use to play with dolls?': '너는 인형을 가지고 놀곤 했니?', '× Did you used to live in Busan?': '너는 부산에 살았니?', 'She used to have long hair.': '그녀는 (예전에) 머리가 길었다.', '× She would have long hair.': '그녀는 (예전에) 머리가 길었다.', "I'm used to the cold weather.": '나는 추운 날씨에 익숙하다.', 'He is used to getting up early.': '그는 일찍 일어나는 데 익숙하다.', "× I'm used to get up early.": '나는 일찍 일어나는 데 익숙하다.', 'This knife is used to cut bread.': '이 칼은 빵을 자르는 데 쓰인다.',
  'The bus had left early.': '버스는 일찍 떠나 버렸다.', 'I had not seen the movie.': '나는 그 영화를 보지 못했었다.', '× I not had seen him.': '나는 그를 본 적이 없었다.', '○ I had not seen him.': '나는 그를 본 적이 없었다.', 'Had you read the book?': '너는 그 책을 읽었었니?', 'Had they lived there before?': '그들은 전에 거기 살았었니?', 'Tom had been sleeping for hours.': '톰은 몇 시간째 자고 있었다.', '× The boy had went home.': '그 소년은 집에 가 버렸었다.', '○ The boy had gone home.': '그 소년은 집에 가 버렸었다.', '× She been studying for an hour.': '그녀는 한 시간째 공부하고 있었다.', '○ She had been studying for an hour.': '그녀는 한 시간째 공부하고 있었다.',
  'The girl who I met yesterday is my cousin.': '내가 어제 만난 소녀는 내 사촌이다.', 'The book which I bought yesterday is interesting.': '내가 어제 산 책은 재미있다.', 'I bought a book. + I like the book.': '나는 책을 샀다. + 나는 그 책이 좋다.', '→ The book (which) I bought ___ is fun.': '내가 산 책은 재미있다.', '× The book which I read it was fun.': '내가 읽은 책은 재미있었다.', '○ The book which I read was fun.': '내가 읽은 책은 재미있었다.', 'The friend (who) I talked to ___ is Sam.': '내가 이야기한 친구는 샘이다.', 'The girl who lives next door is my friend.': '옆집에 사는 소녀는 내 친구다.', 'The girl who I met yesterday is my friend.': '내가 어제 만난 소녀는 내 친구다.', 'This is the only book that I have.': '이것은 내가 가진 유일한 책이다.', 'Everything that she said was true.': '그녀가 말한 모든 것이 사실이었다.',
  'He ran so fast that nobody could catch him.': '그는 너무 빨리 달려서 아무도 그를 잡을 수 없었다.', 'He has so many friends that he is never alone.': '그는 친구가 너무 많아서 결코 혼자가 아니다.', 'We had so little time that we could not finish.': '우리는 시간이 너무 없어서 끝내지 못했다.', 'The movie was so good that I saw it twice.': '그 영화는 너무 좋아서 나는 두 번 봤다.', 'It was such a good movie that I saw it twice.': '그 영화는 너무 좋아서 나는 두 번 봤다.', '× so very tired that ...': '너무나 피곤해서 ...', '○ so tired that ...': '너무 피곤해서 ...', 'He was so tired that he fell asleep.': '그는 너무 피곤해서 잠들었다.', 'He studied hard so that he could pass the test.': '그는 시험에 합격할 수 있도록 열심히 공부했다.', "The soup was so hot that I couldn't eat it.": '수프가 너무 뜨거워서 먹을 수 없었다.',
};
const hangul = /[가-힣]/;

(async () => {
  const cs: any[] = await (await fetch(`${base}/grammar_concepts?select=id,key`, { headers: H })).json();
  const key = Object.fromEntries(cs.map((c) => [c.id, c.key]));
  const ls: any[] = await (await fetch(`${base}/grammar_lessons?select=concept_id,level,status,lesson`, { headers: H })).json();
  for (const r of ls) {
    if (r.status !== wantStatus) continue;
    let changed = 0;
    const missing: string[] = [];
    for (const [i, s] of (r.lesson.lecture ?? []).entries()) {
      if (s.type !== 'board') continue;
      s.lines = (s.lines ?? []).map((l: string) => {
        // 음성이 읽는 예문(Mr. Kim ...)과 판서 예문이 달랐던 장면 — 음성 쪽에 맞춘다
        if (key[r.concept_id] === 'ditransitive-verbs' && i === 2 && l === 'She sent him an email.') l = 'Mr. Kim teaches us English.';
        const plain = l.replace(/\[\/?b\]/g, '').replace(/[‘’]/g, "'");
        if (hangul.test(plain)) return l;
        const ko = KO[plain];
        if (ko) { changed++; return `${l} — ${ko}`; }
        if (/[A-Za-z]{2,}[^가-힣]*[.?!]\s*$/.test(plain)) missing.push(`장면${i}: ${plain}`);
        return l;
      });
    }
    console.log(`${key[r.concept_id]} L${r.level}: ${changed}줄 해석 추가${missing.length ? ` / 해석 못 붙인 줄 ${missing.length}: ${missing.join(' | ')}` : ''}`);
    if (!dry && changed > 0) {
      const res = await fetch(`${base}/grammar_lessons?concept_id=eq.${r.concept_id}&level=eq.${r.level}`, { method: 'PATCH', headers: H, body: JSON.stringify({ lesson: r.lesson, updated_at: new Date().toISOString() }) });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    }
  }
})();
