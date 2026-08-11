export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { validateAndShuffleIfNeeded, extractChoiceLetter } from '@/lib/utils/validateAnswerDistribution';
import { logAnthropicUsage } from '@/lib/ai/logAnthropicUsage';

// 오디오는 이 라우트에서 생성하지 않는다 (스크립트/문제만 생성).
// 실제 TTS 생성은 admin이 edit 페이지에서 트랙별로 트리거하는
// /api/admin/updated-listening/generate-audio 엔드포인트 한 곳에서만 처리한다.

export const runtime = 'nodejs';
export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

const CHOOSE_RESPONSE_INSTRUCTIONS = (count: string, difficultyNote: string) => `## TASK 1: Listen and Choose a Response
Create ${count} individual single-utterance QUESTIONS, grouped under ONE track (id "t1").
IMPORTANT: This is NOT a comprehension question with a written stem. The student hears ONE
spoken line (a statement, question, or remark from someone), and the 4 choices are possible
RESPONSES/REACTIONS to that line — the student picks whichever response best fits what they
heard. There is NO written question text shown on screen; the audio itself IS the question.
Each question is a SEPARATE spoken utterance and needs its OWN "transcript" field
(unlike other tasks, where all questions share one track-level transcript).
- Each question: 1 spoken line (~3-7 seconds when spoken) + 4 possible responses to it
- Answer timer per question: 15-30 seconds (set "testingSeconds" accordingly, e.g. 20)
- ${difficultyNote}
- **DIVERSITY CRITICAL**: Each of the ${count} questions MUST have a completely different scenario/situation. NO repetition.
- Scenarios: Mix diverse campus life, academic, social, and practical situations. Examples:
  * Student asking about class schedule, registration, tutoring
  * Making plans (study group, lunch, coffee, social event)
  * Workplace/part-time job situations
  * Library, dorm, campus services interactions
  * Weather/travel/commute issues
  * Group project, lab work, presentation prep
  * Asking for directions, recommendations, advice
  * Disagreeing politely, making excuses, changing plans
  * Borrowing items, returning things, solving problems
  * Any other common campus/daily life situation — EXCEPT administrative deadlines/schedule changes (overused)

For each choice: include trapType (null|word_trap|overstatement|not_mentioned)
Example trapTypes:
- word_trap: Contains keywords but wrong context
- overstatement: Uses "Always", "Never", "Must", etc.
- not_mentioned: Plausible but not from utterance

**Each question's format** (goes inside t1.questions[]):
{
  "id": "q[number]",
  "number": [1-N],
  "type": "pragmatic_choice",
  "transcript": "[Single complete spoken line for THIS question only, e.g. \\"Do you know if the library is open this weekend?\\"]",
  "testingSeconds": 20,
  "stem": "",
  "choices": [
    {"id": "c1", "text": "[A natural response to the spoken line]", "correct": true},
    {"id": "c2", "text": "[Word trap response]", "correct": false},
    {"id": "c3", "text": "[Overstatement response]", "correct": false},
    {"id": "c4", "text": "[Not mentioned / irrelevant response]", "correct": false}
  ]
}
Leave "stem" as an empty string "" — do not write a meta-question like "What does the speaker imply?".
The 4 "choices" must themselves read like natural spoken responses (not descriptions of responses).`;

const RESPONSE_FORMAT_CRITICAL = `CRITICAL:
- Escape all special characters (quotes, newlines)
- Return ONLY JSON, no markdown or explanations
- **Each choice MUST have "correct" boolean — set EXACTLY ONE choice per question to "correct": true, ALL others to "correct": false (not "isCorrect")**
- For t1 (choose_response) ONLY: each question in "questions[]" MUST have its own "transcript" field (a single spoken sentence) AND its own "testingSeconds" (15-30). Leave the t1 track-level "transcript" as an empty string and "audioSeconds" as 0 — audio is generated per-question, not per-track.
- For all other tracks: keep ONE track-level "transcript" and "audioSeconds" (questions do NOT need their own transcript). Each question in these tracks still needs its own "testingSeconds" (35-45) — the answer timer resets to this value each time the student moves to a new question.`;

type ModuleTopics = {
  conversationTopic?: string;
  conversationTopic2?: string;
  conversationTopic3?: string;
  announcementTopic?: string;
  announcementTopic2?: string;
  lectureTopic1?: string;
  lectureTopic2?: string;
};

function buildModule1Prompt(topics: ModuleTopics, existingTopics: string[] = []): string {
  const { conversationTopic, announcementTopic, lectureTopic1 } = topics;
  return `You are an expert Updated TOEFL iBT Listening (2026 Module 1 - Common Baseline for All Students) content creator.

Generate a complete Module 1 test with this exact structure (INTERMEDIATE difficulty — all students take this module):
- Task 1: Choose a Response (5-7 individual items)
- Task 2: Conversation (1 passage, 3-4 questions)
- Task 3: Announcement (1 passage, 3 questions)
- Task 4: Academic Talk (1 passage, 4 questions)
TOTAL: 15-18 items

CRITICAL - DIVERSITY REQUIREMENTS:
- ALL items must have varied scenarios. NO repeated situations across all 15-18 questions.
- Task 1 (5-7 items): Each item MUST be a completely different campus/social scenario.
- Tasks 2-4: Each must be about a DIFFERENT topic/scenario from each other and from Task 1.
- FORBIDDEN OVERUSE: Avoid multiple items about deadlines/schedule changes. Mix with other scenarios.

IMPORTANT: AVOID DUPLICATE TOPICS
The following topics have already been used in previous tests. Do NOT use any of these topics or similar ones:
${existingTopics.length > 0 ? existingTopics.map(t => `- ${t}`).join('\n') : '(none yet)'}

TOPICS PROVIDED:
- Conversation topic: "${conversationTopic}"
- Announcement topic: "${announcementTopic}"
- Academic Lecture topic: "${lectureTopic1}"

**DIFFICULTY: INTERMEDIATE** (balance comprehension with moderate academic vocabulary — not too easy, not too hard)

---

${CHOOSE_RESPONSE_INSTRUCTIONS('5-7', 'Difficulty: Intermediate (moderate pragmatic understanding)')}

---

## TASK 2: Listen to a Conversation
- Topic: "${conversationTopic}"
- Two speakers: Student + Staff/Professor/Peer
- Duration: 80-110 seconds (1:20-1:50), ~150-190 words
- Exactly 3-4 questions, each with its own "testingSeconds" (35-45)
- Difficulty: Intermediate
- **AVOID**: Deadline/schedule change scenarios (overused in Task 1)
- **PREFER**: Natural campus conversations about academics, social activities, practical issues

**Transcript Format** (CRITICAL):
Speaker A: "Line 1"
Speaker B: "Line 1"
Speaker A: "Line 2"
[etc.]

**Questions**: mix of main_idea + detail + inference

---

## TASK 3: Announcement
- Topic: "${announcementTopic}"
- Duration: 45-70 seconds
- Exactly 3 questions, each with its own "testingSeconds" (35-45)
- Single speaker, clear delivery, direct information
- **VARIETY**: Announcements about campus events, registration deadlines, facility info, workshops, schedule changes, emergency alerts, etc.
- **AVOID REPETITION**: Different topic from Tasks 1 & 2

**Question Types**: What/Who/When (factual recall) or Purpose

---

## TASK 4: Academic Talk
- Topic: "${lectureTopic1}"
- Duration: 90-120 seconds (1:30-2:00), ~220-270 words
- Exactly 4 questions, each with its own "testingSeconds" (35-45)
- Difficulty: Intermediate (moderate academic terminology)
- **AVOID REPETITION**: Academic field/topic completely different from Tasks 1-3
- Examples: Biology, History, Psychology, Environmental Science, Economics, Art History, etc.

**Question Types** (mix these 4):
1. main_idea: "What is the main topic?"
2. detail: "According to the professor, what is...?"
3. function: "Why does the professor mention...?"
4. inference: "What can be inferred...?"

---

## RESPONSE FORMAT
Return ONLY a valid JSON object:
{
  "items": [
    {
      "id": "t1",
      "taskKind": "choose_response",
      "title": "...",
      "transcript": "",
      "audioSeconds": 0,
      "questions": [
        { 5-7 Task 1 items, EACH with its own "transcript" and "testingSeconds" (15-30) }
      ]
    },
    {
      "id": "t2",
      "taskKind": "conversation",
      "title": "...",
      "transcript": "Speaker A: ...",
      "audioSeconds": 95,
      "questions": [
        { 3-4 conversation questions, EACH with "testingSeconds" (35-45) }
      ]
    },
    {
      "id": "t3",
      "taskKind": "announcement",
      "title": "...",
      "transcript": "...",
      "audioSeconds": 55,
      "questions": [
        { 3 announcement questions, EACH with "testingSeconds" (35-45) }
      ]
    },
    {
      "id": "t4",
      "taskKind": "academic_talk",
      "title": "...",
      "transcript": "...",
      "audioSeconds": 105,
      "questions": [
        { 4 academic questions, EACH with "testingSeconds" (35-45) }
      ]
    }
  ]
}

${RESPONSE_FORMAT_CRITICAL}`;
}

function buildHardPrompt(topics: ModuleTopics, existingTopics: string[] = []): string {
  const { announcementTopic, announcementTopic2, lectureTopic1, lectureTopic2 } = topics;
  return `You are an expert Updated TOEFL iBT Listening (2026 Module 2 - HARD branch) content creator.

Generate a complete Hard Module test with this exact structure (Conversation is COMPLETELY EXCLUDED in the Hard branch):
- Task 1: Choose a Response (3-5 items)
- Task 2: Announcement #1 (1 passage, 2 questions)
- Task 3: Announcement #2 (1 passage, 2 questions)
- Task 4: Academic Talk #1 (1 passage, 4 questions)
- Task 5: Academic Talk #2 (1 passage, 4 questions)
TOTAL: 15-17 items
NOTE: NO Conversation task in this branch.

IMPORTANT: AVOID DUPLICATE TOPICS
The following topics have already been used in previous tests. Do NOT use any of these topics or similar ones:
${existingTopics.length > 0 ? existingTopics.map(t => `- ${t}`).join('\n') : '(none yet)'}

TOPICS PROVIDED:
- Announcement #1 topic: "${announcementTopic}"
- Announcement #2 topic: "${announcementTopic2}"
- Academic Lecture #1 topic: "${lectureTopic1}"
- Academic Lecture #2 topic: "${lectureTopic2}"

---

${CHOOSE_RESPONSE_INSTRUCTIONS('3-5', 'Difficulty: Hard (requires pragmatic understanding, idiomatic/implied meaning)')}

---

## TASK 2 & 3: Announcement (Hard, 2 passages)
- Task 2 topic: "${announcementTopic}"
- Task 3 topic: "${announcementTopic2}"
- Duration each: 45-70 seconds
- Exactly 2 questions per passage, each with its own "testingSeconds" (35-45)
- Difficulty: Hard — involves rule changes, exceptions, or conditional policies (more complex than a simple factual notice)

**Question Types**: detail, purpose, or condition-based inference

---

## TASK 4 & 5: Academic Talk (Hard, 2 passages)
- Task 4 topic: "${lectureTopic1}"
- Task 5 topic: "${lectureTopic2}"
- Duration each: 90-120 seconds (1:30-2:00), ~240-300 words
- Exactly 4 questions per talk, each with its own "testingSeconds" (35-45)
- Difficulty: Hard (academic terminology, complex ideas)

**Academic Elements**:
- Minimum 2 specialized terms per talk
- Complex grammatical structures
- Cause-effect relationships
- Classification concepts

**Question Types** (mix these 4):
1. main_idea: "What is the main topic?"
2. detail: "According to the professor, what is...?"
3. function: "Why does the professor mention...?"
4. inference: "What can be inferred...?" (Use paraphrasing, NOT exact keywords)

---

## RESPONSE FORMAT
Return ONLY a valid JSON object:
{
  "items": [
    {
      "id": "t1",
      "taskKind": "choose_response",
      "title": "...",
      "transcript": "",
      "audioSeconds": 0,
      "questions": [
        { 3-5 Task 1 items, EACH with its own "transcript" and "testingSeconds" (15-30) }
      ]
    },
    {
      "id": "t2",
      "taskKind": "announcement",
      "title": "...",
      "transcript": "...",
      "audioSeconds": 55,
      "questions": [
        { 2 announcement questions, EACH with "testingSeconds" (35-45) }
      ]
    },
    {
      "id": "t3",
      "taskKind": "announcement",
      "title": "...",
      "transcript": "...",
      "audioSeconds": 55,
      "questions": [
        { 2 announcement questions, EACH with "testingSeconds" (35-45) }
      ]
    },
    {
      "id": "t4",
      "taskKind": "academic_talk",
      "title": "...",
      "transcript": "...",
      "audioSeconds": 105,
      "questions": [
        { 4 academic questions, EACH with "testingSeconds" (35-45) }
      ]
    },
    {
      "id": "t5",
      "taskKind": "academic_talk",
      "title": "...",
      "transcript": "...",
      "audioSeconds": 105,
      "questions": [
        { 4 academic questions, EACH with "testingSeconds" (35-45) }
      ]
    }
  ]
}

${RESPONSE_FORMAT_CRITICAL}`;
}

function buildEasyPrompt(topics: ModuleTopics, existingTopics: string[] = []): string {
  const { conversationTopic, conversationTopic2, conversationTopic3, announcementTopic, announcementTopic2 } = topics;
  return `You are an expert Updated TOEFL iBT Listening (2026 Module 2 - EASY branch) content creator.

Generate a complete Easy Module test with this exact structure (Academic Talk is COMPLETELY EXCLUDED in the Easy branch):
- Task 1: Choose a Response (5-7 items)
- Task 2: Conversation #1 (1 passage, 2 questions)
- Task 3: Conversation #2 (1 passage, 2 questions)
- Task 4: Conversation #3 (1 passage, 2 questions)
- Task 5: Announcement #1 (1 passage, 2 questions)
- Task 6: Announcement #2 (1 passage, 2 questions)
TOTAL: 15-17 items
NOTE: NO Academic Talk / lecture task in this branch.

IMPORTANT: AVOID DUPLICATE TOPICS
The following topics have already been used in previous tests. Do NOT use any of these topics or similar ones:
${existingTopics.length > 0 ? existingTopics.map(t => `- ${t}`).join('\n') : '(none yet)'}

TOPICS PROVIDED:
- Conversation #1 topic: "${conversationTopic}"
- Conversation #2 topic: "${conversationTopic2}"
- Conversation #3 topic: "${conversationTopic3}"
- Announcement #1 topic: "${announcementTopic}"
- Announcement #2 topic: "${announcementTopic2}"

---

${CHOOSE_RESPONSE_INSTRUCTIONS('5-7', 'Difficulty: Straightforward, daily life, simple vocabulary, clear distinctions')}

---

## TASK 2, 3 & 4: Conversation (Easy, 3 DIFFERENT passages)
- Task 2 topic: "${conversationTopic}"
- Task 3 topic: "${conversationTopic2}"
- Task 4 topic: "${conversationTopic3}"
- Each a DIFFERENT scenario/characters
- Duration each: 60-75 seconds, ~120-160 words
- Simple grammar (present/past), clear structure
- Exactly 2 questions per passage, each with its own "testingSeconds" (35-45)

**Transcript Format** (for each passage):
Speaker A: "Line 1"
Speaker B: "Line 1"
[etc.]

---

## TASK 5 & 6: Announcement (Easy, 2 passages)
- Task 5 topic: "${announcementTopic}"
- Task 6 topic: "${announcementTopic2}"
- Duration each: 45-70 seconds
- Exactly 2 questions per passage, each with its own "testingSeconds" (35-45)
- Single speaker, clear delivery
- Simple vocabulary, no technical terms
- Direct information (no inference)

**Content Structure**: What, Where, When, Contact info
**Question Types**: What/Who/When (factual recall) or Purpose (clear single purpose)

---

## RESPONSE FORMAT
Return ONLY a valid JSON object:
{
  "items": [
    {
      "id": "t1",
      "taskKind": "choose_response",
      "title": "...",
      "transcript": "",
      "audioSeconds": 0,
      "questions": [
        { 5-7 Task 1 items, EACH with its own "transcript" and "testingSeconds" (15-30) }
      ]
    },
    {
      "id": "t2",
      "taskKind": "conversation",
      "title": "...",
      "transcript": "Speaker A: ...",
      "audioSeconds": 68,
      "questions": [
        { 2 conversation questions, EACH with "testingSeconds" (35-45) }
      ]
    },
    {
      "id": "t3",
      "taskKind": "conversation",
      "title": "...",
      "transcript": "Speaker A: ...",
      "audioSeconds": 68,
      "questions": [
        { 2 conversation questions, EACH with "testingSeconds" (35-45) }
      ]
    },
    {
      "id": "t4",
      "taskKind": "conversation",
      "title": "...",
      "transcript": "Speaker A: ...",
      "audioSeconds": 68,
      "questions": [
        { 2 conversation questions, EACH with "testingSeconds" (35-45) }
      ]
    },
    {
      "id": "t5",
      "taskKind": "announcement",
      "title": "...",
      "transcript": "...",
      "audioSeconds": 55,
      "questions": [
        { 2 announcement questions, EACH with "testingSeconds" (35-45) }
      ]
    },
    {
      "id": "t6",
      "taskKind": "announcement",
      "title": "...",
      "transcript": "...",
      "audioSeconds": 55,
      "questions": [
        { 2 announcement questions, EACH with "testingSeconds" (35-45) }
      ]
    }
  ]
}

${RESPONSE_FORMAT_CRITICAL}`;
}

async function generateModule(part: 'module1' | 'hard' | 'easy', topics: ModuleTopics, existingTopics: string[] = []) {
  const prompt =
    part === 'module1' ? buildModule1Prompt(topics, existingTopics) :
    part === 'hard' ? buildHardPrompt(topics, existingTopics) :
    buildEasyPrompt(topics, existingTopics);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });
  void logAnthropicUsage(`admin/updated-listening/generate:${part}`, 'claude-sonnet-4-6', message.usage);

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonStart = raw.indexOf('{');
  const jsonEnd = raw.lastIndexOf('}');

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON found in response');
  }

  const jsonStr = raw.slice(jsonStart, jsonEnd + 1);

  try {
    const parsed = JSON.parse(jsonStr) as { items: any[] };
    return parsed.items;
  } catch (err) {
    console.error('JSON parsing error:', err);
    console.error('JSON start:', jsonStr.slice(0, 200));
    console.error('JSON end:', jsonStr.slice(-200));
    throw new Error(`Invalid JSON from Claude: ${(err as Error)?.message}`);
  }
}

export async function POST(req: Request) {
  try {
    const { module1, module2 } = await req.json() as {
      module1: {
        conversationTopic: string;
        announcementTopic: string;
        lectureTopic1: string;
      };
      module2: {
        conversationTopic: string;
        conversationTopic2: string;
        conversationTopic3: string;
        announcementTopic: string;
        announcementTopic2: string;
        lectureTopic1: string;
        lectureTopic2: string;
      };
    };

    // Validate Module 1 (conversation + 1 lecture + announcement — 3 topics)
    if (!module1?.conversationTopic?.trim() || !module1?.announcementTopic?.trim() ||
        !module1?.lectureTopic1?.trim()) {
      return NextResponse.json({ ok: false, error: 'Module 1: Conversation/Announcement/Lecture topics required' }, { status: 400 });
    }

    // Validate Module 2 (conversation×3 + announcement×2 + lecture×2 — 7 topics)
    if (!module2?.conversationTopic?.trim() || !module2?.conversationTopic2?.trim() || !module2?.conversationTopic3?.trim() ||
        !module2?.announcementTopic?.trim() || !module2?.announcementTopic2?.trim() ||
        !module2?.lectureTopic1?.trim() || !module2?.lectureTopic2?.trim()) {
      return NextResponse.json({ ok: false, error: 'Module 2: All 7 topics required (Conversation×3, Announcement×2, Lecture×2)' }, { status: 400 });
    }

    console.log('[Generate] Starting Module 1 + Module 2 (Hard + Easy) generation...');

    // Get existing topics from previous tests to avoid duplicates
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    const { data: existingTests } = await supabase
      .from('listening_tests_2026')
      .select('payload')
      .limit(100);

    const existingTopics: string[] = [];
    if (existingTests) {
      for (const test of existingTests) {
        const payload = test.payload as any;
        // Extract all topics from existing tests
        if (payload?.meta?.usedTopics) {
          const used = payload.meta.usedTopics;
          Object.values(used).forEach((topics: any) => {
            if (Array.isArray(topics)) existingTopics.push(...topics);
            else if (typeof topics === 'string') existingTopics.push(topics);
          });
        }
      }
    }

    // Add current input topics to avoid list
    const allCurrentTopics = [
      module1.conversationTopic, module1.announcementTopic, module1.lectureTopic1,
      module2.conversationTopic, module2.conversationTopic2, module2.conversationTopic3,
      module2.announcementTopic, module2.announcementTopic2,
      module2.lectureTopic1, module2.lectureTopic2,
    ].filter(Boolean);
    existingTopics.push(...allCurrentTopics);

    // Generate Module 1, Module 2 Hard, and Module 2 Easy in parallel
    const [module1Items, hardItems, easyItems] = await Promise.all([
      generateModule('module1', {
        conversationTopic: module1.conversationTopic,
        announcementTopic: module1.announcementTopic,
        lectureTopic1: module1.lectureTopic1,
      }, existingTopics),
      generateModule('hard', {
        announcementTopic: module2.announcementTopic,
        announcementTopic2: module2.announcementTopic2,
        lectureTopic1: module2.lectureTopic1,
        lectureTopic2: module2.lectureTopic2,
      }, existingTopics),
      generateModule('easy', {
        conversationTopic: module2.conversationTopic,
        conversationTopic2: module2.conversationTopic2,
        conversationTopic3: module2.conversationTopic3,
        announcementTopic: module2.announcementTopic,
        announcementTopic2: module2.announcementTopic2,
      }, existingTopics),
    ]);

    console.log(`[Generate] Items received — module1: ${module1Items.length}, hard: ${hardItems.length}, easy: ${easyItems.length}`);

    if (!module1Items || module1Items.length === 0) {
      throw new Error('Module 1 generation returned no items (Claude response may have been malformed or truncated)');
    }
    if (!hardItems || hardItems.length === 0) {
      throw new Error('Module 2 Hard generation returned no items');
    }
    if (!easyItems || easyItems.length === 0) {
      throw new Error('Module 2 Easy generation returned no items');
    }

    const testId = randomUUID();

    // 오디오는 여기서 생성하지 않는다. 스크립트/문제만 만들고, admin이 edit 페이지에서
    // 내용을 검토한 뒤 트랙별로 "🎧 음성생성" 버튼을 눌러 개별 생성하도록 한다.
    // (모든 오디오 관련 로직은 generate-audio 엔드포인트 한 곳에만 있도록 유지)
    // Claude가 반환하는 item에도 자체 "id": "t1"/"t2"... 필드가 들어있으므로,
    // 반드시 스프레드 뒤에 id를 지정해 고유 prefix-id로 덮어써야 한다.
    // (스프레드가 뒤에 오면 Claude의 id가 이겨서 Module1/Hard/Easy가 서로 같은 id "t3"를
    // 공유하게 되고, 서로 다른 트랙의 스크립트/오디오가 뒤섞이는 심각한 버그가 생긴다)
    const buildTracks = (items: any[], prefix: string) =>
      items.map((item, i) => ({
        ...item,
        id: `${prefix}-${i}`,
        audioUrl: '',
        illustrationUrl: '',
      }));

    let module1Tracks = buildTracks(module1Items, 'm1');
    let hardTracks = buildTracks(hardItems, 'm2h');
    let easyTracks = buildTracks(easyItems, 'm2e');

    const payload = {
      meta: {
        id: testId,
        label: 'AI Generated Listening Test',
        examEra: 'ibt_2026',
        source: 'ai-generated',
        usedTopics: {
          conversation: [module1.conversationTopic, module2.conversationTopic, module2.conversationTopic2, module2.conversationTopic3],
          announcement: [module1.announcementTopic, module2.announcementTopic, module2.announcementTopic2],
          lecture: [module1.lectureTopic1, module2.lectureTopic1, module2.lectureTopic2],
        },
      },
      modules: [
        {
          stage: 1,
          items: module1Tracks,
        },
        {
          stage: 2,
          items: [],
        }
      ],
      stage2Pool: {
        cutScore: 0.7,
        hard: {
          items: hardTracks,
        },
        easy: {
          items: easyTracks,
        }
      }
    };

    // ✅ 정답 분포 검증 및 셔플 (module1, hard, easy 모두)
    const module1Answers = extractListeningAnswers(module1Items);
    const hardAnswers = extractListeningAnswers(hardItems);
    const easyAnswers = extractListeningAnswers(easyItems);

    const { answers: shuffledM1, wasShuffled: m1Shuffled } = validateAndShuffleIfNeeded(module1Answers);
    const { answers: shuffledHard, wasShuffled: hardShuffled } = validateAndShuffleIfNeeded(hardAnswers);
    const { answers: shuffledEasy, wasShuffled: easyShuffled } = validateAndShuffleIfNeeded(easyAnswers);

    // ✅ Always apply answers to set correct field on choices (not just when shuffled)
    applyShuffledListeningAnswers(module1Items, m1Shuffled ? shuffledM1 : module1Answers);
    module1Tracks = buildTracks(module1Items, 'm1');

    applyShuffledListeningAnswers(hardItems, hardShuffled ? shuffledHard : hardAnswers);
    hardTracks = buildTracks(hardItems, 'm2h');

    applyShuffledListeningAnswers(easyItems, easyShuffled ? shuffledEasy : easyAnswers);
    easyTracks = buildTracks(easyItems, 'm2e');

    return NextResponse.json({ ok: true, id: testId, payload: {
      ...payload,
      meta: {
        ...payload.meta,
        answerShuffledM1: m1Shuffled,
        answerShuffledHard: hardShuffled,
        answerShuffledEasy: easyShuffled,
      }
    } });
  } catch (err: any) {
    console.error('LISTENING GENERATE ERROR', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}

// ✅ 헬퍼 함수: Listening 정답 추출
function extractListeningAnswers(items: any[]): string[] {
  const answers: string[] = [];

  items.forEach((item: any) => {
    if (item.questions && Array.isArray(item.questions)) {
      item.questions.forEach((q: any) => {
        if (q.choices && Array.isArray(q.choices)) {
          const correct = q.choices.find((c: any) => c.correct);
          if (correct?.id) {
            const letter = extractChoiceLetter(correct.id);
            answers.push(letter);
          } else {
            // Claude가 정답을 생성하지 못했을 때: 무작위로 정답 선택 (A로 몰리는 현상 방지)
            console.warn('[extractListeningAnswers] No correct choice found. Randomly selecting one as correct.');
            const randomIdx = Math.floor(Math.random() * q.choices.length);
            const randomChoice = q.choices[randomIdx];
            if (randomChoice?.id) {
              q.choices.forEach((c: any) => c.correct = false);
              randomChoice.correct = true;
              const letter = extractChoiceLetter(randomChoice.id);
              answers.push(letter);
            } else {
              answers.push('A');
            }
          }
        }
      });
    }
  });

  return answers;
}

// ✅ 헬퍼 함수: 셔플된 정답 적용 (Listening)
function applyShuffledListeningAnswers(items: any[], shuffledAnswers: string[]): void {
  let answerIndex = 0;

  items.forEach((item: any) => {
    if (item.questions && Array.isArray(item.questions)) {
      item.questions.forEach((q: any) => {
        if (q.choices && Array.isArray(q.choices)) {
          if (answerIndex < shuffledAnswers.length) {
            const newCorrectAnswer = shuffledAnswers[answerIndex++];
            q.choices.forEach((c: any) => {
              const choiceLetter = extractChoiceLetter(c.id);
              c.correct = choiceLetter === newCorrectAnswer;
            });
          }
        }
      });
    }
  });
}
