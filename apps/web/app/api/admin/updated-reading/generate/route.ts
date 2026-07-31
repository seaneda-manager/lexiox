import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: Request) {
  try {
    const {
      // Module 1 (공통 Routing Module) — CW 1 + Daily 2~3 + Academic 1
      cwTopicM1,
      dailyLifeTopic1,
      dailyLifeTopic2,
      dailyLifeTopic3,
      academicTopicM1,
      // Module 2 Lower — CW 1 + Daily 2
      cwTopicM2Lower,
      dailyLifeTopic2L1,
      dailyLifeTopic2L2,
      // Module 2 Upper — CW 1 + Academic 1
      academicTopicM2Upper,
    } = await req.json() as {
      cwTopicM1: string;
      dailyLifeTopic1: string;
      dailyLifeTopic2: string;
      dailyLifeTopic3?: string;
      academicTopicM1: string;
      cwTopicM2Lower: string;
      dailyLifeTopic2L1: string;
      dailyLifeTopic2L2: string;
      academicTopicM2Upper: string;
    };

    const required = {
      cwTopicM1, dailyLifeTopic1, dailyLifeTopic2, academicTopicM1,
      cwTopicM2Lower, dailyLifeTopic2L1, dailyLifeTopic2L2, academicTopicM2Upper
    };
    const missing = Object.entries(required).filter(([, v]) => !v?.trim()).map(([k]) => k);
    if (missing.length > 0) {
      return NextResponse.json({ ok: false, error: `Missing topics: ${missing.join(', ')}` }, { status: 400 });
    }

    // Get existing topics from previous tests to avoid duplicates
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );
    const { data: existingTests } = await supabase
      .from('reading_tests_2026')
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
    const allTopics = [cwTopicM1, dailyLifeTopic1, dailyLifeTopic2, dailyLifeTopic3,
                       academicTopicM1, cwTopicM2Lower, dailyLifeTopic2L1, dailyLifeTopic2L2,
                       academicTopicM2Upper].filter(Boolean);
    existingTopics.push(...allTopics);

    const prompt = `You are an expert Updated TOEFL iBT 2026 content creator. Generate a complete Adaptive Reading test JSON, matching the ETS Updated Reading 2026 structure exactly.

IMPORTANT: AVOID DUPLICATE TOPICS
The following topics have already been used in previous tests. Do NOT use any of these topics or similar ones:
${existingTopics.length > 0 ? existingTopics.map(t => `- ${t}`).join('\n') : '(none yet)'}

STRUCTURE (do not deviate from these counts):

- Module 1 (Routing — common baseline, ALL students take this): 20-33 questions total, 4-5 passages (flexible difficulty)
  1. complete_words: 1-2 passages, 10-20 blanks (flexible per difficulty)
  2. daily_life: 2-3 SEPARATE passages (different scenarios), 2-3 questions EACH = 5-8 questions total
  3. academic_passage: 1-2 passages, 5-10 questions total

- stage2Pool (adaptive branch based on Module 1 score, cutScore 0.7):
  - Upper (hard): 15 questions total — complete_words (1 passage, 10 blanks, harder vocab) + academic_passage (1 passage, 5 questions, high difficulty/dense vocabulary/complex inference). NO daily_life in this branch.
  - Lower (easy): 15 questions total — complete_words (1 passage, 10 blanks, simpler vocab) + daily_life (2 passages, 2-3 questions each = 5 questions total). NO academic_passage in this branch.
  - IMPORTANT: Lower and Upper use DIFFERENT topics and different content — Lower emphasizes daily_life, Upper emphasizes academic.

QUESTION TYPE DISTRIBUTION (controls the "type" field on each question — use these exact values: vocab | detail | negative_detail | paraphrasing | inference | purpose | insertion):

- Module 1 academic_passage (5 questions): a natural mix — 2x detail, 1x vocab, 1x purpose or inference, 1x insertion.
- Module 1 daily_life (4 questions each, x2 passages): mix of purpose (writer's goal), detail (a specific fact — price/deadline/policy), inference (what the reader should do next), and one more detail or purpose — vary between the 2 passages so they don't feel identical.
- stage2Pool.hard academic_passage (5 questions) — HIGH difficulty, discriminates top scorers: 2x inference, 1x purpose, 1x paraphrasing (sentence-simplification style: "which sentence best expresses the essential information of the highlighted sentence"), 1x insertion. Do NOT use plain "detail" questions here — every question should require synthesis, not surface lookup.
- stage2Pool.easy academic_passage (5 questions) — LOW difficulty, direct surface-level questions: 3x detail, 1x negative_detail ("which of the following is NOT true / is NOT mentioned" — bold NOT/EXCEPT in the stem), 1x vocab. Do NOT use inference or insertion here.

INSERTION QUESTIONS (type: "insertion") — CRITICAL interactive format:
- In passageHtml, embed exactly 4 inline markers at candidate insertion points using this exact syntax: [[INS:0]] [[INS:1]] [[INS:2]] [[INS:3]] (0-indexed, in reading order). These render as clickable squares on the frontend — do not use any other marker format.
- meta.insertion.targetSentence: the exact sentence to be inserted (a string), separate from passageHtml.
- meta.insertion.correctIndex: which marker index (0-3) is the correct placement.
- choices must be exactly 4 options in marker order: [{"text":"First square"},{"text":"Second square"},{"text":"Third square"},{"text":"Fourth square"}], with isCorrect:true on the one matching correctIndex.
- stem should read like: "Look at the four squares [■] that indicate where the following sentence could be added to the passage: '<the target sentence>'. Where would the sentence best fit?"

TOPICS:
- Module 1 Complete the Words topic: "${cwTopicM1}"
- Module 1 Daily Life #1 topic: "${dailyLifeTopic1}"
- Module 1 Daily Life #2 topic: "${dailyLifeTopic2}"
${dailyLifeTopic3 ? `- Module 1 Daily Life #3 topic (optional): "${dailyLifeTopic3}"` : ""}
- Module 1 Academic Passage topic: "${academicTopicM1}"
- Module 2 Lower - Complete the Words topic: "${cwTopicM2Lower}"
- Module 2 Lower - Daily Life #1 topic: "${dailyLifeTopic2L1}"
- Module 2 Lower - Daily Life #2 topic: "${dailyLifeTopic2L2}"
- Module 2 Upper - Academic Passage topic: "${academicTopicM2Upper}"

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
- If the question set includes an insertion question, embed the 4 [[INS:0]]..[[INS:3]] markers directly inside passageHtml at natural sentence-boundary points (see INSERTION QUESTIONS spec above)
- EXACTLY 5 questions, types per the QUESTION TYPE DISTRIBUTION rules above
- All non-insertion types: exactly 1 isCorrect: true choice

QUESTION format:
{ "id": "...", "number": N, "type": "detail|negative_detail|vocab|inference|purpose|paraphrasing|insertion", "stem": "...", "choices": [{"id":"...","text":"...","isCorrect":bool},...4 choices], "meta": { "insertion": { "targetSentence": "...", "correctIndex": 0 } } }
(omit "meta" entirely for non-insertion questions)

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
          "passageHtml": "<p>Paragraph 1 text with an example sentence. [[INS:0]] Another sentence follows. [[INS:1]] A third sentence. [[INS:2]] The final sentence of the paragraph. [[INS:3]]</p><p>Paragraph 2...</p>",
          "questions": [
            { "id": "m1-ac1-q1", "number": 1, "type": "detail", "stem": "...", "choices": [ ...4 choices, 1 isCorrect:true... ] },
            { "id": "m1-ac1-q5", "number": 5, "type": "insertion", "stem": "Look at the four squares [■] that indicate where the following sentence could be added to the passage: 'The target sentence text here.' Where would the sentence best fit?",
              "choices": [ {"id":"c1","text":"First square","isCorrect":false}, {"id":"c2","text":"Second square","isCorrect":true}, {"id":"c3","text":"Third square","isCorrect":false}, {"id":"c4","text":"Fourth square","isCorrect":false} ],
              "meta": { "insertion": { "targetSentence": "The target sentence text here.", "correctIndex": 1 } }
            }
          ]
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

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON found in Claude response');
    }

    let payload;
    try {
      payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    } catch (parseErr: any) {
      // JSON 파싱 실패 시 상세 정보 반환
      const jsonStr = raw.slice(jsonStart, jsonEnd + 1);
      const lines = jsonStr.split('\n');
      const errorLine = parseErr.message.match(/line (\d+)/)?.[1];
      const errorCol = parseErr.message.match(/column (\d+)/)?.[1];

      let context = '';
      if (errorLine) {
        const lineNum = parseInt(errorLine);
        const startLine = Math.max(0, lineNum - 3);
        const endLine = Math.min(lines.length, lineNum + 2);
        context = lines.slice(startLine, endLine).map((l, i) =>
          `${startLine + i + 1}: ${l}`
        ).join('\n');
      }

      throw new Error(
        `JSON parsing failed at line ${errorLine || '?'} column ${errorCol || '?'}:\n${context}\n\nFull error: ${parseErr.message}`
      );
    }

    const id = randomUUID();
    payload.meta.id = id;
    payload.meta.usedTopics = {
      complete_words: [cwTopicM1, cwTopicM2Lower],
      daily_life: [dailyLifeTopic1, dailyLifeTopic2, dailyLifeTopic2L1, dailyLifeTopic2L2].concat(dailyLifeTopic3 ? [dailyLifeTopic3] : []),
      academic: [academicTopicM1, academicTopicM2Upper],
    };

    return NextResponse.json({ ok: true, id, payload });
  } catch (err: any) {
    console.error('GENERATE ERROR', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}
