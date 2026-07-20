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

Task 1 — Build a Sentence (10 questions, 6-minute global timer):
Topic/context: "${buildSentenceTopic}"
- Create 10 sentence completion questions all sharing the same general context/situation
- Each question has:
  • contextLeadIn: first part of the sentence (ends naturally where answer goes)
  • contextLeadOut: last part of the sentence (starts naturally after answer)
  • shuffledChunks: exactly 4 items (3 correct sequence chunks + 1 unnecessary chunk)
  • unnecessaryChunk: the one chunk that does NOT belong in the correct answer
  • correctSequence: array of 3 chunks in the correct order
- The chunks should be 2-5 word phrases (not single words)
- Sentences should be natural, academic English related to the topic
- Difficulty: first 3 easy (q1-q3), middle 4 medium (q4-q7), last 3 harder (q8-q10)

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
      "instruction": "Read the context and arrange the word chunks to complete the sentence.",
      "timeLimitSeconds": 360,
      "questions": [
        {
          "id": "q1",
          "contextLeadIn": "...",
          "contextLeadOut": "...",
          "shuffledChunks": ["chunk A", "chunk B", "chunk C", "unnecessary chunk"],
          "unnecessaryChunk": "unnecessary chunk",
          "correctSequence": ["chunk A", "chunk B", "chunk C"]
        },
        { "id": "q2", "contextLeadIn": "...", "contextLeadOut": "...", "shuffledChunks": [...], "unnecessaryChunk": "...", "correctSequence": [...] },
        { "id": "q3", "contextLeadIn": "...", "contextLeadOut": "...", "shuffledChunks": [...], "unnecessaryChunk": "...", "correctSequence": [...] },
        { "id": "q4", "contextLeadIn": "...", "contextLeadOut": "...", "shuffledChunks": [...], "unnecessaryChunk": "...", "correctSequence": [...] },
        { "id": "q5", "contextLeadIn": "...", "contextLeadOut": "...", "shuffledChunks": [...], "unnecessaryChunk": "...", "correctSequence": [...] },
        { "id": "q6", "contextLeadIn": "...", "contextLeadOut": "...", "shuffledChunks": [...], "unnecessaryChunk": "...", "correctSequence": [...] },
        { "id": "q7", "contextLeadIn": "...", "contextLeadOut": "...", "shuffledChunks": [...], "unnecessaryChunk": "...", "correctSequence": [...] },
        { "id": "q8", "contextLeadIn": "...", "contextLeadOut": "...", "shuffledChunks": [...], "unnecessaryChunk": "...", "correctSequence": [...] },
        { "id": "q9",  "contextLeadIn": "...", "contextLeadOut": "...", "shuffledChunks": [...], "unnecessaryChunk": "...", "correctSequence": [...] },
        { "id": "q10", "contextLeadIn": "...", "contextLeadOut": "...", "shuffledChunks": [...], "unnecessaryChunk": "...", "correctSequence": [...] }
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
