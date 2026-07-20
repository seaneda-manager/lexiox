import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: Request) {
  try {
    const { cwTopic, dailyLifeTopic, academicTopic } = await req.json() as {
      cwTopic: string;
      dailyLifeTopic: string;
      academicTopic: string;
    };

    if (!cwTopic?.trim() || !dailyLifeTopic?.trim() || !academicTopic?.trim()) {
      return NextResponse.json({ ok: false, error: 'All 3 topics required' }, { status: 400 });
    }

    const prompt = `You are an expert Updated TOEFL iBT 2026 content creator. Generate a complete MST (Multistage Adaptive) Reading test JSON.

STRUCTURE:
- Stage 1 (common diagnostic): 3 item types in order:
  1. complete_words (1 item, 10 blanks)
  2. daily_life (1 item, 2 questions)
  3. academic_passage (1 item, 5 questions)
- stage2Pool: adaptive branch based on Stage 1 score
  - hard module: 1 complete_words (10 blanks) + 1 academic_passage (5 questions)
  - easy module: 1 complete_words (10 blanks) + 1 daily_life (3 questions)

TOPICS:
- Complete the Words topic: "${cwTopic}"
- Daily Life topic: "${dailyLifeTopic}"
- Academic Passage topic: "${academicTopic}"

ITEM SPECS:

A. complete_words:
- paragraphHtml: plain text (no HTML tags needed), ~80-100 words
- First sentence is complete. From second sentence onward, words have their SUFFIX removed.
- Each blank is marked with __ in paragraphHtml. The text BEFORE __ is the prefix hint shown to user.
- blanks array: 10 items, each with id, order (1-based), correctToken (the suffix to type)
- Example: "Students must regi__ their vehicles" where correctToken="ster"

B. daily_life (campus notice / email / menu):
- contextType: one of "notice" | "email" | "social_post" | "web_article"
- contentHtml: realistic styled HTML card. Use inline styles.
  For email: include From/To/Subject header rows, then body text.
  For notice: include a header/title box, bullet points, signature.
  Use colors: header background #1A2B4C, body #FFFFFF, border #E0E0E0
- 2-3 questions (detail or purpose type), each with 4 choices

C. academic_passage:
- passageHtml: "<p>paragraph 1...</p><p>paragraph 2...</p><p>paragraph 3...</p>" (3 paragraphs, ~200-250 words total)
- No <h3> title in passageHtml — title goes in separate "title" field
- 5 questions: mix of detail, vocab, inference, purpose, insertion types
- For insertion type: add meta: { "insertion": { "anchors": ["after sentence 1", "after sentence 2", "after sentence 3", "after sentence 4"], "correctIndex": 1 } }
- All other types: exactly 1 isCorrect: true choice

QUESTION format:
{ "id": "...", "number": N, "type": "detail|vocab|inference|purpose|insertion", "stem": "...", "choices": [{"id":"...","text":"...","isCorrect":bool},...4 choices] }

Return ONLY valid JSON, no markdown fences:

{
  "meta": { "id": "PLACEHOLDER", "label": "Updated Reading – [short label]", "examEra": "ibt_2026" },
  "modules": [
    {
      "id": "stage1",
      "stage": 1,
      "items": [
        { "id": "s1-cw1", "taskKind": "complete_words", "stage": 1, "difficulty": "core",
          "paragraphHtml": "First complete sentence. Second sen__ has a blank. Third sen__ continues.",
          "blanks": [
            {"id":"b1","order":1,"correctToken":"tence"},
            {"id":"b2","order":2,"correctToken":"tence"}
          ]
        },
        { "id": "s1-dl1", "taskKind": "daily_life", "stage": 1, "difficulty": "core",
          "contextType": "notice",
          "contentHtml": "<div style='border:1px solid #E0E0E0;border-radius:8px;overflow:hidden;font-family:Arial'><div style='background:#1A2B4C;color:#fff;padding:16px 20px;font-weight:700;font-size:16px'>Campus Notice</div><div style='padding:20px'>...</div></div>",
          "questions": [
            { "id": "s1-dl-q1", "number": 1, "type": "detail", "stem": "...", "choices": [{"id":"a","text":"...","isCorrect":false},{"id":"b","text":"...","isCorrect":true},{"id":"c","text":"...","isCorrect":false},{"id":"d","text":"...","isCorrect":false}] },
            { "id": "s1-dl-q2", "number": 2, "type": "purpose", "stem": "...", "choices": [...4 choices...] }
          ]
        },
        { "id": "s1-ac1", "taskKind": "academic_passage", "stage": 1, "difficulty": "core",
          "title": "Passage Title",
          "passageHtml": "<p>Paragraph 1...</p><p>Paragraph 2...</p><p>Paragraph 3...</p>",
          "questions": [ ...5 questions... ]
        }
      ]
    },
    {
      "id": "stage2-default",
      "stage": 2,
      "items": []
    }
  ],
  "stage2Pool": {
    "cutScore": 0.7,
    "hard": {
      "id": "stage2-hard",
      "stage": 2,
      "items": [
        { "id": "s2h-cw1", "taskKind": "complete_words", "stage": 2, "difficulty": "hard",
          "paragraphHtml": "...",
          "blanks": [...10 blanks, harder vocabulary...]
        },
        { "id": "s2h-ac1", "taskKind": "academic_passage", "stage": 2, "difficulty": "hard",
          "title": "...",
          "passageHtml": "<p>...</p><p>...</p><p>...</p>",
          "questions": [...5 harder academic questions...]
        }
      ]
    },
    "easy": {
      "id": "stage2-easy",
      "stage": 2,
      "items": [
        { "id": "s2e-cw1", "taskKind": "complete_words", "stage": 2, "difficulty": "easy",
          "paragraphHtml": "...",
          "blanks": [...10 blanks, simpler vocabulary...]
        },
        { "id": "s2e-dl1", "taskKind": "daily_life", "stage": 2, "difficulty": "easy",
          "contextType": "email",
          "contentHtml": "...",
          "questions": [...3 straightforward questions...]
        }
      ]
    }
  }
}`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
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
