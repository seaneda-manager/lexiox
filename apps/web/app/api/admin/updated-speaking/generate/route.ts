import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic();

export async function POST(req: Request) {
  try {
    const { listenRepeatTopic, interviewTopic } = await req.json() as {
      listenRepeatTopic: string;
      interviewTopic: string;
    };

    if (!listenRepeatTopic?.trim() || !interviewTopic?.trim()) {
      return NextResponse.json({ ok: false, error: 'Both topics required' }, { status: 400 });
    }

    const prompt = `You are an expert Updated TOEFL Speaking content creator. Generate a complete Speaking test JSON with exactly 2 tasks.

Task 1 — Listen and Repeat (듣고 따라말하기):
Situation topic: "${listenRepeatTopic}"
- Pick a realistic campus/everyday situation based on this topic (e.g. "laundry room", "computer lab", "ski resort welcome center", "campus bookstore employee training")
- Write EXACTLY 7 sentences with increasing difficulty (3 levels):
  • Sentences 1-2 (Easy): 9-11 syllables, simple and direct
  • Sentences 3-5 (Medium): 14-16 syllables, moderate complexity
  • Sentences 6-7 (Hard): 19-23 syllables, longer with more detail
- Sentences must be natural spoken English that someone in that situation would actually say
- No preparation time — student hears sentence then immediately repeats it
- speakingSeconds: 8 for sentences 1-2, 10 for sentences 3-5, 14 for sentences 6-7

Task 2 — Interview:
Interview topic: "${interviewTopic}"
- Write EXACTLY 4 questions on this topic, increasing in depth:
  • Q8 (Personal experience): specific recent experience related to the topic
  • Q9 (Personal preference/feeling): opinion or preference about the topic
  • Q10 (General/comparative): broader comparison or impact related to the topic
  • Q11 (Social/logical opinion): societal or policy-level opinion about the topic
- Questions are open-ended, conversational (as an avatar interviewer would ask)
- No preparation time — student answers immediately after question ends
- speakingSeconds: 45 per question

Return ONLY valid JSON, no markdown, no explanation:

{
  "id": "auto",
  "label": "Updated Speaking – [short descriptive label combining both topics]",
  "tasks": [
    {
      "id": "task-listen-repeat",
      "type": "listen_repeat",
      "situation": "[situation name]",
      "situationDescription": "[1-2 sentences describing the scenario]",
      "sentences": [
        { "id": "s1", "text": "...", "speakingSeconds": 8 },
        { "id": "s2", "text": "...", "speakingSeconds": 8 },
        { "id": "s3", "text": "...", "speakingSeconds": 10 },
        { "id": "s4", "text": "...", "speakingSeconds": 10 },
        { "id": "s5", "text": "...", "speakingSeconds": 10 },
        { "id": "s6", "text": "...", "speakingSeconds": 12 },
        { "id": "s7", "text": "...", "speakingSeconds": 12 }
      ]
    },
    {
      "id": "task-interview",
      "type": "interview",
      "questions": [
        { "id": "q8",  "text": "...", "topic": "${interviewTopic}", "speakingSeconds": 45 },
        { "id": "q9",  "text": "...", "topic": "${interviewTopic}", "speakingSeconds": 45 },
        { "id": "q10", "text": "...", "topic": "${interviewTopic}", "speakingSeconds": 45 },
        { "id": "q11", "text": "...", "topic": "${interviewTopic}", "speakingSeconds": 45 }
      ]
    }
  ]
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    const payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    payload.id = randomUUID();

    return NextResponse.json({ ok: true, id: payload.id, payload });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
