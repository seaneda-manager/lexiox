import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: Request) {
  try {
    const {
      // Module 1 (공통 Routing Module) — 4개 지문: CW 1 + Daily 2 + Academic 1
      cwTopicM1,
      dailyLifeTopic1,
      dailyLifeTopic2,
      academicTopicM1,
      // Module 2 (Upper/Lower 공유 주제, 난이도만 다르게 생성) — 2개 지문: CW 1 + Academic 1
      cwTopicM2,
      academicTopicM2,
    } = await req.json() as {
      cwTopicM1: string;
      dailyLifeTopic1: string;
      dailyLifeTopic2: string;
      academicTopicM1: string;
      cwTopicM2: string;
      academicTopicM2: string;
    };

    const required = { cwTopicM1, dailyLifeTopic1, dailyLifeTopic2, academicTopicM1, cwTopicM2, academicTopicM2 };
    const missing = Object.entries(required).filter(([, v]) => !v?.trim()).map(([k]) => k);
    if (missing.length > 0) {
      return NextResponse.json({ ok: false, error: `Missing topics: ${missing.join(', ')}` }, { status: 400 });
    }

    const prompt = `You are an expert Updated TOEFL iBT 2026 content creator. Generate a complete MST (Multistage Adaptive) Reading test JSON, matching the OFFICIAL ETS Updated Reading structure exactly.

STRUCTURE (do not deviate from these counts):

- Module 1 (Routing — common baseline, ALL students take this): 23 questions total, 4 passages
  1. complete_words: 1 passage, 10 blanks
  2. daily_life: 2 SEPARATE passages (different scenarios), 4 questions EACH = 8 questions total
  3. academic_passage: 1 passage, 5 questions

- stage2Pool (adaptive branch based on Module 1 score, cutScore 0.7):
  - hard (Upper): 15 questions, 2 passages — complete_words (10 blanks, harder vocab) + academic_passage (5 questions, high difficulty/dense vocabulary/complex inference). NO daily_life in this branch.
  - easy (Lower): 15 questions, 2 passages — complete_words (10 blanks, simpler vocab) + academic_passage (5 questions, low difficulty/shorter/more direct factual questions). NO daily_life in this branch.
  - IMPORTANT: hard and easy use the SAME topics (given below) but written at different difficulty levels — this is intentional, not a mistake.

TOPICS:
- Module 1 Complete the Words topic: "${cwTopicM1}"
- Module 1 Daily Life #1 topic: "${dailyLifeTopic1}"
- Module 1 Daily Life #2 topic: "${dailyLifeTopic2}"
- Module 1 Academic Passage topic: "${academicTopicM1}"
- Module 2 Complete the Words topic (shared hard/easy): "${cwTopicM2}"
- Module 2 Academic Passage topic (shared hard/easy): "${academicTopicM2}"

ITEM SPECS:

A. complete_words:
- paragraphHtml: plain text (no HTML tags needed), ~70-100 words
- First sentence is complete. From second sentence onward, words have their SUFFIX removed.
- Each blank is marked with __ in paragraphHtml. The text BEFORE __ is the prefix hint shown to user.
- blanks array: EXACTLY 10 items, each with id, order (1-based), correctToken (the suffix to type)
- Example: "Students must regi__ their vehicles" where correctToken="ster"

B. daily_life (campus notice / email / menu / bill / SNS post / message chain):
- contextType: one of "notice" | "email" | "social_post" | "web_article" | "other"
- contentHtml: realistic styled HTML card. Use inline styles.
  For email: include From/To/Subject header rows, then body text.
  For notice: include a header/title box, bullet points, signature.
  Use colors: header background #1A2B4C, body #FFFFFF, border #E0E0E0
- EXACTLY 4 questions (detail or purpose type), each with 4 choices

C. academic_passage:
- passageHtml: "<p>paragraph 1...</p><p>paragraph 2...</p><p>paragraph 3...</p>" (3 paragraphs, ~200-250 words total)
- No <h3> title in passageHtml — title goes in separate "title" field
- EXACTLY 5 questions: mix of detail, vocab, inference, purpose, insertion types
- For insertion type: add meta: { "insertion": { "anchors": ["after sentence 1", "after sentence 2", "after sentence 3", "after sentence 4"], "correctIndex": 1 } }
- All other types: exactly 1 isCorrect: true choice

QUESTION format:
{ "id": "...", "number": N, "type": "detail|vocab|inference|purpose|insertion", "stem": "...", "choices": [{"id":"...","text":"...","isCorrect":bool},...4 choices] }

Return ONLY valid JSON, no markdown fences:

{
  "meta": { "id": "PLACEHOLDER", "label": "Updated Reading – [short label]", "examEra": "ibt_2026" },
  "modules": [
    {
      "id": "module1",
      "stage": 1,
      "items": [
        { "id": "m1-cw1", "taskKind": "complete_words", "stage": 1, "difficulty": "core",
          "paragraphHtml": "...",
          "blanks": [ ...10 blanks... ]
        },
        { "id": "m1-dl1", "taskKind": "daily_life", "stage": 1, "difficulty": "core",
          "contextType": "notice",
          "contentHtml": "...",
          "questions": [ ...4 questions... ]
        },
        { "id": "m1-dl2", "taskKind": "daily_life", "stage": 1, "difficulty": "core",
          "contextType": "email",
          "contentHtml": "...",
          "questions": [ ...4 questions... ]
        },
        { "id": "m1-ac1", "taskKind": "academic_passage", "stage": 1, "difficulty": "core",
          "title": "Passage Title",
          "passageHtml": "...",
          "questions": [ ...5 questions... ]
        }
      ]
    },
    {
      "id": "module2-default",
      "stage": 2,
      "items": []
    }
  ],
  "stage2Pool": {
    "cutScore": 0.7,
    "hard": {
      "id": "module2-hard",
      "stage": 2,
      "items": [
        { "id": "m2h-cw1", "taskKind": "complete_words", "stage": 2, "difficulty": "hard",
          "paragraphHtml": "...",
          "blanks": [ ...10 blanks, harder vocabulary... ]
        },
        { "id": "m2h-ac1", "taskKind": "academic_passage", "stage": 2, "difficulty": "hard",
          "title": "...",
          "passageHtml": "...",
          "questions": [ ...5 harder academic questions... ]
        }
      ]
    },
    "easy": {
      "id": "module2-easy",
      "stage": 2,
      "items": [
        { "id": "m2e-cw1", "taskKind": "complete_words", "stage": 2, "difficulty": "easy",
          "paragraphHtml": "...",
          "blanks": [ ...10 blanks, simpler vocabulary... ]
        },
        { "id": "m2e-ac1", "taskKind": "academic_passage", "stage": 2, "difficulty": "easy",
          "title": "...",
          "passageHtml": "...",
          "questions": [ ...5 easier academic questions, shorter, more direct factual... ]
        }
      ]
    }
  }
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as any).text as string;
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    const payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

    const id = randomUUID();
    payload.meta.id = id;

    return NextResponse.json({ ok: true, id, payload });
  } catch (err: any) {
    console.error('GENERATE ERROR', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
