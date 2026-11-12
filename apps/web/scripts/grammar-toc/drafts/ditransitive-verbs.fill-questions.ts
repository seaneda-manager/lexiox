// 사용: npx tsx scripts/grammar-toc/drafts/ditransitive-verbs.fill-questions.ts [--dry]
// ditransitive-verbs L1 초안에 비어 있던 빈칸 드릴·고치기·문제·팝업 퀴즈·서술형을 채운다(설명·강의는 그대로). 확정 레슨은 건드리지 않는다.
import fs from 'fs';
import path from 'path';
import { validateGrammarLesson } from '../../../models/middle-naesin/grammar-lesson';
import { lintLesson } from '../../../lib/grammar-engine/lint';
import { pc, cw } from './_h';

const dry = process.argv.includes('--dry');
const env = Object.fromEntries(
  fs.readFileSync(path.resolve(__dirname, '../../../.env.local'), 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]),
);
const base = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1`;
const H = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json' };

const fill = (level: string, sentence: string, answer: string, choices: string[], ko: string, noteKo: string, hint: string) => ({ level, sentence, answer, choices, ko, noteKo, hint });
const fix = (level: string, sentence: string, wrong: string, correct: string[], reasonChoices: string[], reasonIndex: number, ko: string) => ({ level, sentence, wrong, correct, reasonChoices, reasonIndex, ko });

const add = {
  drillFill: [
    fill('basic', 'Dad gave ___ a watch.', 'me', ['I', 'me', 'my'], '아빠는 나에게 시계를 주셨다.', '동사 뒤 사람 자리에는 목적격 me를 씁니다.', '나에게'),
    fill('basic', 'She sent ___ an email.', 'him', ['him', 'he', 'his'], '그녀는 그에게 이메일을 보냈다.', '동사 뒤 사람 자리에는 목적격 him을 씁니다.', '그에게'),
    fill('basic', 'Mom made ___ some cookies.', 'us', ['we', 'our', 'us'], '엄마는 우리에게 쿠키를 만들어 주셨다.', '동사 뒤 사람 자리에는 목적격 us를 씁니다.', '우리에게'),
    fill('intermediate', 'Please pass ___ the salt.', 'me', ['me', 'my', 'I'], '나에게 소금 좀 건네줘.', '사람 + 물건 순서이므로 pass 뒤에 me가 옵니다.', '나에게'),
    fill('intermediate', 'The boy showed ___ his room.', 'us', ['we', 'us', 'our'], '그 소년은 우리에게 자기 방을 보여 주었다.', '사람 자리에는 목적격 us를 씁니다.', '우리에게'),
    fill('intermediate', 'My brother teaches ___ math.', 'me', ['my', 'I', 'me'], '내 형은 나에게 수학을 가르쳐 준다.', '사람 자리에는 목적격 me를 씁니다.', '나에게'),
    fill('advanced', 'My aunt bought ___ a doll.', 'me', ['to me', 'me', 'for me'], '이모는 나에게 인형을 사 주셨다.', '사람 + 물건으로 바로 이으면 for를 넣지 않습니다.', 'for 없이'),
    fill('advanced', 'Did you send ___ the photos?', 'her', ['her', 'she', 'hers'], '너는 그녀에게 그 사진들을 보냈니?', '사람 자리에는 목적격 her를 씁니다.', '그녀에게'),
  ],
  drillFix: [
    fix('basic', 'She sent to him an email.', 'to', [''], ['사람 + 물건으로 바로 이을 때는 to를 넣지 않습니다.', '주어가 she라서 to가 필요합니다.', 'email은 복수여야 합니다.'], 0, 'She sent him an email. → to 없이 사람 + 물건'),
    fix('intermediate', 'My aunt bought for me a doll.', 'for', [''], ['buy 뒤에는 항상 for가 필요합니다.', '사람 + 물건으로 바로 이을 때는 for를 넣지 않습니다.', 'doll 앞에 the가 필요합니다.'], 1, 'My aunt bought me a doll. → for 없이 사람 + 물건'),
    fix('intermediate', 'Dad gave I a watch.', 'I', ['me'], ['gave는 give여야 합니다.', 'watch는 복수여야 합니다.', '동사 뒤 사람 자리에는 목적격 me를 씁니다.'], 2, 'Dad gave me a watch. → 사람 자리에는 me'),
  ],
  questions: [
    pc('Which sentence about a watch is correct?', '시계에 대한 올바른 문장을 고르세요.', 'basic', [['Dad gave a watch me.', '아빠는 나에게 시계를 주셨다.'], ['Dad gave me a watch.', '아빠는 나에게 시계를 주셨다.'], ['Dad gave to me a watch.', '아빠는 나에게 시계를 주셨다.'], ['Dad gave me to a watch.', '아빠는 나에게 시계를 주셨다.']], 1, '사람(me)이 먼저, 물건(a watch)이 나중이고 to는 넣지 않습니다.'),
    pc('Which sentence about an email is correct?', '이메일에 대한 올바른 문장을 고르세요.', 'basic', [['She sent to him an email.', '그녀는 그에게 이메일을 보냈다.'], ['She sent an email him.', '그녀는 그에게 이메일을 보냈다.'], ['She sent to an email him.', '그녀는 그에게 이메일을 보냈다.'], ['She sent him an email.', '그녀는 그에게 이메일을 보냈다.']], 3, '사람 + 물건 순서로 바로 쓰고 to는 넣지 않습니다.'),
    pc('Which sentence about cookies is correct?', '쿠키에 대한 올바른 문장을 고르세요.', 'basic', [['Mom made us some cookies.', '엄마는 우리에게 쿠키를 만들어 주셨다.'], ['Mom made for us some cookies.', '엄마는 우리에게 쿠키를 만들어 주셨다.'], ['Mom made some cookies us.', '엄마는 우리에게 쿠키를 만들어 주셨다.'], ['Mom made to us some cookies.', '엄마는 우리에게 쿠키를 만들어 주셨다.']], 0, '사람 + 물건으로 바로 이어 쓰며 for/to를 넣지 않습니다.'),
    pc('Which sentence about a doll is correct?', '인형에 대한 올바른 문장을 고르세요.', 'intermediate', [['My aunt bought for me a doll.', '이모는 나에게 인형을 사 주셨다.'], ['My aunt bought me a doll.', '이모는 나에게 인형을 사 주셨다.'], ['My aunt bought a doll me.', '이모는 나에게 인형을 사 주셨다.'], ['My aunt bought to me a doll.', '이모는 나에게 인형을 사 주셨다.']], 1, '사람 + 물건으로 바로 이으면 for를 넣지 않습니다.'),
    pc('Which sentence about the salt is correct?', '소금에 대한 올바른 문장을 고르세요.', 'intermediate', [['Please pass the salt me.', '나에게 소금 좀 건네줘.'], ['Please pass to me the salt.', '나에게 소금 좀 건네줘.'], ['Please pass me the salt.', '나에게 소금 좀 건네줘.'], ['Please pass me to the salt.', '나에게 소금 좀 건네줘.']], 2, '사람이 먼저, 물건이 나중입니다.'),
    pc('Choose the sentence that does NOT have the pattern "verb + person + thing".', '"동사 + 사람 + 물건" 형태가 아닌 문장을 고르세요.', 'intermediate', [['He gave me a book.', '그는 나에게 책을 주었다.'], ['She taught us English.', '그녀는 우리에게 영어를 가르쳤다.'], ['I ate a sandwich.', '나는 샌드위치를 먹었다.'], ['Mom made us cookies.', '엄마는 우리에게 쿠키를 만들어 주셨다.']], 2, '세 번째는 "먹다" 동사 뒤에 물건 하나만 옵니다.', 'pick_different'),
    pc('Choose the sentence that is wrong.', '틀린 문장을 고르세요.', 'intermediate', [['She showed me her room.', '그녀는 나에게 자기 방을 보여 주었다.'], ['Dad gave a watch me.', '아빠는 나에게 시계를 주셨다.'], ['He sent her a letter.', '그는 그녀에게 편지를 보냈다.'], ['I bought him a gift.', '나는 그에게 선물을 사 주었다.']], 1, '물건을 사람 앞에 쓰면 틀립니다. Dad gave me a watch가 맞습니다.', 'pick_different'),
    cw('How many sentences are wrong?\n① Dad gave me a watch.\n② She sent to him an email.\n③ Mom made us some cookies.', 'basic', 1, '②만 to가 들어가 틀렸으므로 틀린 문장은 1개입니다.'),
    cw('How many sentences are wrong?\n① He gave a book me.\n② I sent my friend a letter.\n③ She bought for me a bag.\n④ Mr. Kim teaches us English.', 'advanced', 2, '①은 순서, ③은 for 때문에 틀렸으므로 틀린 문장은 2개입니다.'),
    pc('Why is the sentence "She sent to him an email." wrong?', '이 문장이 틀린 이유로 올바른 설명을 고르세요.', 'intermediate', [['Because email should be plural.', 'email을 복수로 바꿔야 해서'], ['Because sent should be send.', 'sent를 send로 바꿔야 해서'], ['Because she should be he.', 'she를 he로 바꿔야 해서'], ['Because to is not used between the person and the thing.', '사람과 물건을 바로 이을 때는 to를 쓰지 않아서']], 3, '사람 + 물건 순서로 바로 이으면 to나 for를 넣지 않습니다.', 'reason'),
  ],
  popupQuiz: [
    { prompt: 'Dad gave ___ a watch.', answer: 'me', options: ['I', 'my'], hint_ko: '나에게' },
    { prompt: 'She sent ___ an email.', answer: 'him', options: ['he', 'his'], hint_ko: '그에게' },
    { prompt: 'My aunt bought me ___ doll.', answer: 'a', options: ['an', 'for'], hint_ko: '인형 하나' },
    { prompt: 'Mom made ___ some cookies.', answer: 'us', options: ['we', 'our'], hint_ko: '우리에게' },
  ],
  writtenTasks: [
    { kind: 'fix_write', level: 'basic', prompt: 'She sent to him an email.', promptKo: '틀린 곳을 찾아 문장 전체를 바르게 고쳐 쓰시오.', answers: ['She sent him an email.'], noteKo: '사람 + 물건으로 바로 이으면 to가 없습니다.' },
    { kind: 'order', level: 'basic', prompt: '', promptKo: '아빠는 나에게 시계를 주셨다.', words: ['gave', 'Dad', 'a', 'watch', 'me'], answers: ['Dad gave me a watch.'], noteKo: '사람이 먼저, 물건이 나중입니다.' },
  ],
};

(async () => {
  const c = await (await fetch(`${base}/grammar_concepts?key=eq.ditransitive-verbs&select=id`, { headers: H })).json();
  const rows = await (await fetch(`${base}/grammar_lessons?concept_id=eq.${c[0].id}&level=eq.1&select=status,lesson`, { headers: H })).json();
  if (rows[0].status === 'final') throw new Error('확정 레슨은 덮어쓰지 않습니다.');
  const lesson = { ...rows[0].lesson, ...add };
  const v: any = validateGrammarLesson(lesson);
  if (!v.ok) { console.error('검증 실패:', v.errors.slice(0, 10)); process.exit(1); }
  for (const i of lintLesson(v.lesson)) console.log(`  [${i.level}] ${i.where}: ${i.msg}`);
  if (dry) return console.log('검증 통과(dry)');
  const res = await fetch(`${base}/grammar_lessons?concept_id=eq.${c[0].id}&level=eq.1`, { method: 'PATCH', headers: H, body: JSON.stringify({ lesson: v.lesson, updated_at: new Date().toISOString() }) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  console.log('OK ditransitive-verbs L1 드릴·문제 저장');
})();
