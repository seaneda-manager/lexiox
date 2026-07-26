import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ElevenLabsClient } from 'elevenlabs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import {
  parseDialogueTranscript,
  assignVoicesToSpeakers,
  isDialogue,
} from '@/lib/elevenlabs/dialogue-utils';

export const runtime = 'nodejs';
export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY || 'placeholder',
});
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

function getRandomVoiceId(): string {
  try {
    const voicePool = JSON.parse(process.env.VOICE_POOL || '{}') as Record<string, string[]>;
    const random = Math.random() * 100;

    let selectedCountry: string;
    if (random < 60) {
      selectedCountry = 'us';
    } else if (random < 80) {
      selectedCountry = 'au';
    } else {
      selectedCountry = 'uk';
    }

    const voices = voicePool[selectedCountry] || [];
    if (voices.length === 0) {
      console.warn(`No voices found for country: ${selectedCountry}`);
      return '21m00Tcm4TlvDq8ikWAM'; // Default ElevenLabs voice
    }

    return voices[Math.floor(Math.random() * voices.length)];
  } catch (err) {
    console.error('Error parsing VOICE_POOL:', err);
    return '21m00Tcm4TlvDq8ikWAM'; // Default ElevenLabs voice
  }
}

function getVoicePool(): string[] {
  const defaultPool = [
    'GZ4PpFJV8ikEGUtBrjK7', // Laura (US 여)
    'uIZsnBL0YK1S5j69bAih', // Samantha (US 여)
    'ynUcJpglne1SRSNHFg1k', // Bill (US 남)
    'Gubgw9l4dtIoQA9YZHgx', // Brian (US 남)
    'Ix8C14HEHgIQkJswik2o', // Peter (UK 남)
    '6fZce9LFNG3iEITDfqZZ', // Charlotte (UK 여)
    'roYauZ4bOLAKvVZTPLre', // Lena (Canada 여)
    'SHJeg1jtED7EW6Zr6rHc', // Alex (Canada 남)
  ];
  try {
    if (process.env.SPEAKING_VOICE_POOL) {
      return JSON.parse(process.env.SPEAKING_VOICE_POOL);
    }
  } catch (err) {
    console.warn('Failed to parse SPEAKING_VOICE_POOL');
  }
  return defaultPool;
}

async function generateSingleVoiceAudio(text: string, voiceId: string): Promise<Buffer> {
  const audio = await elevenlabs.generate({
    voice: voiceId,
    text: text,
    model_id: 'eleven_turbo_v2_5',
  });

  let audioBuffer: Buffer;
  if (Buffer.isBuffer(audio)) {
    audioBuffer = audio;
  } else if (audio instanceof ArrayBuffer) {
    audioBuffer = Buffer.from(audio);
  } else {
    const chunks: Buffer[] = [];
    for await (const chunk of audio) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    audioBuffer = Buffer.concat(chunks);
  }
  return audioBuffer;
}

async function generateDialogueAudio(transcript: string): Promise<Buffer> {
  const segments = parseDialogueTranscript(transcript);
  if (segments.length === 0) {
    console.warn('[Dialogue] No dialogue segments found, falling back to single voice');
    const voiceId = getRandomVoiceId();
    return generateSingleVoiceAudio(transcript, voiceId);
  }

  const voicePool = getVoicePool();
  const voiceMap = assignVoicesToSpeakers(segments, voicePool);

  console.log(`[Dialogue] Generating dialogue with ${segments.length} segments`);
  console.log(`[Dialogue] Voice map:`, voiceMap);

  const audioBuffers: Buffer[] = [];

  for (const segment of segments) {
    const voiceId = voiceMap[segment.speaker];
    console.log(`[Dialogue] Segment "${segment.speaker}": ${segment.text.substring(0, 50)}...`);

    const audioBuffer = await generateSingleVoiceAudio(segment.text, voiceId);
    audioBuffers.push(audioBuffer);

    // Rate limit 대비 대기
    await new Promise((r) => setTimeout(r, 300));
  }

  // 모든 segment audio 병합
  return Buffer.concat(audioBuffers);
}

const CHOOSE_RESPONSE_INSTRUCTIONS = (count: string, difficultyNote: string) => `## TASK 1: Listen and Choose a Response
Create ${count} individual single-utterance QUESTIONS, grouped under ONE track (id "t1").
IMPORTANT: Each question is a SEPARATE spoken utterance and needs its OWN "transcript" field
(unlike other tasks, where all questions share one track-level transcript).
- Each question: 1 spoken sentence (~3-7 seconds when spoken) + 4 response choices
- Answer timer per question: 15-30 seconds (set "testingSeconds" accordingly, e.g. 20)
- ${difficultyNote}
- Topics: Mix campus/daily life scenarios

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
  "transcript": "[Single complete spoken sentence for THIS question only]",
  "testingSeconds": 20,
  "stem": "What does the speaker imply?",
  "choices": [
    {"id": "c1", "text": "[Direct response]", "correct": true},
    {"id": "c2", "text": "[Word trap]", "correct": false},
    {"id": "c3", "text": "[Overstatement]", "correct": false},
    {"id": "c4", "text": "[Not mentioned]", "correct": false}
  ]
}`;

const RESPONSE_FORMAT_CRITICAL = `CRITICAL:
- Escape all special characters (quotes, newlines)
- Return ONLY JSON, no markdown or explanations
- Each choice must have "correct" boolean (not "isCorrect")
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

function buildModule1Prompt(topics: ModuleTopics): string {
  const { conversationTopic, announcementTopic, lectureTopic1 } = topics;
  return `You are an expert Updated TOEFL iBT Listening (2026 Module 1 - Common Baseline for All Students) content creator.

Generate a complete Module 1 test with this exact structure (INTERMEDIATE difficulty — all students take this module):
- Task 1: Choose a Response (5-7 individual items)
- Task 2: Conversation (1 passage, 3-4 questions)
- Task 3: Announcement (1 passage, 3 questions)
- Task 4: Academic Talk (1 passage, 4 questions)
TOTAL: 15-18 items

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
- Two speakers: Student + Staff/Professor
- Duration: 80-110 seconds (1:20-1:50), ~150-190 words
- Exactly 3-4 questions, each with its own "testingSeconds" (35-45)
- Difficulty: Intermediate

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

**Question Types**: What/Who/When (factual recall) or Purpose

---

## TASK 4: Academic Talk
- Topic: "${lectureTopic1}"
- Duration: 90-120 seconds (1:30-2:00), ~220-270 words
- Exactly 4 questions, each with its own "testingSeconds" (35-45)
- Difficulty: Intermediate (moderate academic terminology)

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

function buildHardPrompt(topics: ModuleTopics): string {
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

function buildEasyPrompt(topics: ModuleTopics): string {
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

async function generateModule(part: 'module1' | 'hard' | 'easy', topics: ModuleTopics) {
  const prompt =
    part === 'module1' ? buildModule1Prompt(topics) :
    part === 'hard' ? buildHardPrompt(topics) :
    buildEasyPrompt(topics);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

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

    // Generate Module 1, Module 2 Hard, and Module 2 Easy in parallel
    const [module1Items, hardItems, easyItems] = await Promise.all([
      generateModule('module1', {
        conversationTopic: module1.conversationTopic,
        announcementTopic: module1.announcementTopic,
        lectureTopic1: module1.lectureTopic1,
      }),
      generateModule('hard', {
        announcementTopic: module2.announcementTopic,
        announcementTopic2: module2.announcementTopic2,
        lectureTopic1: module2.lectureTopic1,
        lectureTopic2: module2.lectureTopic2,
      }),
      generateModule('easy', {
        conversationTopic: module2.conversationTopic,
        conversationTopic2: module2.conversationTopic2,
        conversationTopic3: module2.conversationTopic3,
        announcementTopic: module2.announcementTopic,
        announcementTopic2: module2.announcementTopic2,
      }),
    ]);

    const testId = randomUUID();

    // Helper function to process tracks with audio
    const processTracksWithAudio = async (items: any[], prefix: string) => {
      const tracks = items.map((item, i) => ({
        id: `${prefix}-${i}`,
        ...item,
        audioUrl: '',
        illustrationUrl: '',
      }));

      for (const track of tracks) {
        // choose_response: 트랙 레벨 transcript가 없음 (질문마다 개별 음성 필요 → edit 페이지에서 수동 생성)
        if (!track.transcript || !track.transcript.trim()) {
          console.log(`[Audio] Skipping track-level audio for ${track.id} (no track-level transcript, e.g. choose_response)`);
          continue;
        }

        try {
          let audioBuffer: Buffer;

          // conversation인 경우 화자별 다른 음성 사용
          if (track.taskKind === 'conversation' && isDialogue(track.transcript)) {
            console.log(`[Audio] Generating dialogue audio for ${track.id}`);
            audioBuffer = await generateDialogueAudio(track.transcript);
          } else {
            console.log(`[Audio] Generating single-voice audio for ${track.id}`);
            const voiceId = getRandomVoiceId();
            audioBuffer = await generateSingleVoiceAudio(track.transcript, voiceId);
          }

          const fileName = `listening/${testId}/${track.id}.mp3`;
          const { error } = await supabase.storage.from('content').upload(fileName, audioBuffer, {
            contentType: 'audio/mpeg',
            upsert: true,
          });

          if (error) throw error;

          const { data } = supabase.storage.from('content').getPublicUrl(fileName);
          track.audioUrl = data.publicUrl;
        } catch (err) {
          console.error(`[Audio] Generation failed for ${track.id}:`, err);
          throw new Error(`Audio generation failed for ${track.id}: ${(err as any)?.message}`);
        }
      }

      return tracks;
    };

    // 3개 모듈의 오디오 생성을 병렬로 처리 (각 모듈 내부는 순차적)
    console.log('[Audio] Generating audio for Module 1 / Hard / Easy in parallel...');
    const [module1Tracks, hardTracks, easyTracks] = await Promise.all([
      processTracksWithAudio(module1Items, 'm1'),
      processTracksWithAudio(hardItems, 'm2h'),
      processTracksWithAudio(easyItems, 'm2e'),
    ]);

    const payload = {
      meta: {
        id: testId,
        label: 'AI Generated Listening Test',
        examEra: 'ibt_2026',
        source: 'ai-generated',
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

    return NextResponse.json({ ok: true, id: testId, payload });
  } catch (err: any) {
    console.error('LISTENING GENERATE ERROR', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
