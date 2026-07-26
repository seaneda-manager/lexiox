import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: Request) {
  try {
    const { buildSentenceTopic, emailTopic, academicTopic } = await req.json() as {
      buildSentenceTopic: string;
      emailTopic: string;
      academicTopic: string;
    };

    if (!buildSentenceTopic?.trim() || !emailTopic?.trim() || !academicTopic?.trim()) {
      return NextResponse.json({ ok: false, error: 'All 3 topics required' }, { status: 400 });
    }

    const prompt = `You are an expert Updated TOEFL Writing content creator. Generate a complete Updated TOEFL Writing test JSON with exactly 3 tasks.

Task 1 — Build a Sentence (10 questions, 6 min 50 sec global timer):
Topic/context: "${buildSentenceTopic}"
- Create 10 sentence completion questions all sharing the same general context/situation
- Each question has:
  • contextLeadIn: first part of the sentence (ends naturally where the answer goes)
  • contextLeadOut: last part of the sentence (starts naturally after the answer)
  • tokens: the pieces the test taker arranges, IN CORRECT ORDER
  • correctOrder: array of token ids in the correct order (same order as tokens)
  • punctuation: sentence-final punctuation ("?" or "." or "") — NOT a token

CRITICAL — how to split into tokens (ETS "words or phrases" rule):
Split every answer into 5-8 tokens. Each token is {"id","text","type"} where type is "WORD" or "PHRASE".

Use type "WORD" (a single word, never grouped) for anything that carries word-order or
grammar information on its own:
  - question words: what, which, who, where, when, why, how
  - auxiliaries and modals: will, did, does, have, has, should, can, must, is, are
  - pronouns and bare subjects/objects: you, it, we, they, me
  - main verbs: buy, take, leave, finish, cancel
  - adverbs: mainly, probably, already, always
  - the infinitive marker "to" when followed by a verb ("to" + "cancel", never "to cancel")

Use type "PHRASE" (2-4 words grouped) ONLY when the group is one meaning unit that does
not carry the grammar being tested:
  - noun phrases: "the conference", "a cooking class", "our trip"
  - prepositional phrases: "to the airport", "at the new market"
  - fixed connectives: "instead of", "because of", "next year"

Never group a subject with its verb, and never group an auxiliary with a main verb.

There must be NO extra or unnecessary tokens. Every token is used exactly once in the
correct answer — the item is scored all-or-nothing, 1 point, with no partial credit.

- Sentences should be natural English related to the topic
- Difficulty: first 3 easy (q1-q3), middle 4 medium (q4-q7), last 3 harder (q8-q10)

Example of a correctly split question:
  contextLeadIn: "A: I'm going shopping later."   contextLeadOut: ""
  answer sentence: "What brand will you buy?"
  tokens: [{"id":"t1","text":"What","type":"WORD"},{"id":"t2","text":"brand","type":"WORD"},
           {"id":"t3","text":"will","type":"WORD"},{"id":"t4","text":"you","type":"WORD"},
           {"id":"t5","text":"buy","type":"WORD"}]
  correctOrder: ["t1","t2","t3","t4","t5"]   punctuation: "?"

Task 2 — Write an Email (7 minutes):
Topic: "${emailTopic}"
- recipient: full name and title (e.g., "Professor Sarah Henderson")
- recipientEmail: realistic academic email (e.g., "s.henderson@university.edu")
- subjectLine: realistic email subject line
- situation: 2-3 sentences describing the scenario (student perspective)
- hints: exactly 3 bullet points describing what the email must include
- wordLimit: { min: 100, max: 120 }

Task 3 — Academic Discussion (1 question, Q12, 10 minutes):
Topic: "${academicTopic}"
- professorName: full name with title (e.g., "Dr. Anna Smith")
- professorPrompt: 1-2 sentence discussion question (thought-provoking, open-ended)
- studentPosts: exactly 2 students with contrasting viewpoints
  • Each: id, author (first name only), content (2-3 sentences, natural student writing)
- wordLimit: { min: 120, max: 300 }
- recommendedTimeSeconds: 600 (10 minutes)

Return ONLY valid JSON, no markdown, no explanation:

{
  "meta": {
    "id": "auto",
    "label": "Updated Writing – [short descriptive label]",
    "examEra": "ibt_2026"
  },
  "items": [
    {
      "id": "task-build-1",
      "taskKind": "build_a_sentence",
      "instruction": "Read the context and arrange the words and phrases to complete the sentence.",
      "timeLimitSeconds": 410,
      "questions": [
        {
          "id": "q1",
          "contextLeadIn": "...",
          "contextLeadOut": "...",
          "tokens": [
            { "id": "t1", "text": "...", "type": "WORD" },
            { "id": "t2", "text": "...", "type": "PHRASE" }
          ],
          "correctOrder": ["t1", "t2"],
          "punctuation": "?"
        },
        { "id": "q2",  "contextLeadIn": "...", "contextLeadOut": "...", "tokens": [...], "correctOrder": [...], "punctuation": "." },
        { "id": "q3",  "contextLeadIn": "...", "contextLeadOut": "...", "tokens": [...], "correctOrder": [...], "punctuation": "." },
        { "id": "q4",  "contextLeadIn": "...", "contextLeadOut": "...", "tokens": [...], "correctOrder": [...], "punctuation": "." },
        { "id": "q5",  "contextLeadIn": "...", "contextLeadOut": "...", "tokens": [...], "correctOrder": [...], "punctuation": "." },
        { "id": "q6",  "contextLeadIn": "...", "contextLeadOut": "...", "tokens": [...], "correctOrder": [...], "punctuation": "." },
        { "id": "q7",  "contextLeadIn": "...", "contextLeadOut": "...", "tokens": [...], "correctOrder": [...], "punctuation": "." },
        { "id": "q8",  "contextLeadIn": "...", "contextLeadOut": "...", "tokens": [...], "correctOrder": [...], "punctuation": "." },
        { "id": "q9",  "contextLeadIn": "...", "contextLeadOut": "...", "tokens": [...], "correctOrder": [...], "punctuation": "." },
        { "id": "q10", "contextLeadIn": "...", "contextLeadOut": "...", "tokens": [...], "correctOrder": [...], "punctuation": "." }
      ]
    },
    {
      "id": "task-email-1",
      "taskKind": "email",
      "recipient": "Professor Sarah Henderson",
      "recipientEmail": "s.henderson@university.edu",
      "subjectLine": "...",
      "situation": "...",
      "prompt": "Write a formal email to the professor.",
      "hints": ["...", "...", "..."],
      "wordLimit": { "min": 100, "max": 120 },
      "recommendedTimeSeconds": 420
    },
    {
      "id": "task-acad-1",
      "taskKind": "academic_discussion",
      "professorName": "Dr. Anna Smith",
      "context": "Your professor has posted a discussion question in the online class forum.",
      "professorPrompt": "...",
      "studentPosts": [
        { "id": "post-1", "author": "Tanya", "content": "..." },
        { "id": "post-2", "author": "Marco", "content": "..." }
      ],
      "wordLimit": { "min": 120, "max": 300 },
      "recommendedTimeSeconds": 600
    }
  ]
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 7500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    const payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    const id = randomUUID();
    payload.meta.id = id;

    return NextResponse.json({ ok: true, id, payload });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
