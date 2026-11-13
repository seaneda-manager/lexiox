export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { shuffleAllChoicesInPayload } from '@/lib/utils/validateAnswerDistribution';
import { verifyQuestionsAndAttachEvidence } from '@/lib/reading/questionQA';
import { extractReadingTestToBank } from '@/lib/utils/problemBankExtract';
import { logAnthropicUsage } from '@/lib/ai/logAnthropicUsage';
import { findBlankCountIssues } from '@/lib/utils/ensureCompleteWordsBlanks';
import { collectUsedTopics, fetchTestPayloads } from '@/lib/topicPool/usedTopics';
import { findAcademicParagraphIssues } from '@/lib/utils/validateAcademicParagraphs';

export const runtime = 'nodejs';
export const maxDuration = 300;

const READING_QUALITY_RULES = `QUALITY RULES (ETS item-writer standards):
- Daily life passages must be varied REAL-WORLD text types, not all campus notices: e.g. email thread, text-message chain, flyer/advertisement, menu or price list, schedule/timetable, product/service policy, social-media post, short web article. Do NOT make every daily-life passage a campus administrative notice about deadlines or schedule changes.
- Each question must have exactly ONE defensible answer that is directly supported by a sentence in the passage. Never ask something the passage does not answer.
- Wrong options must be plausible: reuse words from the passage in a wrong context, state a true-but-irrelevant detail, over-generalize, or reverse a relationship. Never use "all of the above"/"none of the above"; keep the four options similar in length and grammar.
- Vary question stems (do NOT start every stem with "According to the passage"): mix main idea, detail, negative factual ("is NOT mentioned"), inference, vocabulary-in-context, rhetorical purpose, and reference questions.
- Academic passage: EXACTLY 3 paragraphs (3 separate <p> elements in passageHtml), about 180-260 words in total. Paragraph 1 introduces the topic and its central claim, paragraph 2 develops it with evidence or an example, paragraph 3 adds a nuance, limitation or implication. Do not open every passage with a textbook definition "X is a ...".
- Vary the opening sentence of every passage; do not reuse a template.`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: Request) {
  try {
    // URL에서 module 파라미터 추출
    const url = new URL(req.url);
    const moduleParam = url.searchParams.get('module');
    const targetModule = moduleParam === '1' ? 1 : moduleParam === '2' ? 2 : null;

    if (!targetModule) {
      return NextResponse.json({
        ok: false,
        error: 'Missing module parameter. Use ?module=1 or ?module=2'
      }, { status: 400 });
    }

    const bodyData = await req.json();

    // Module 1: M1 topics 필수
    if (targetModule === 1) {
      const {
        cwTopicM1,
        dailyLifeTopic1,
        dailyLifeTopic2,
        dailyLifeTopic3,
        academicTopicM1,
      } = bodyData as {
        cwTopicM1: string;
        dailyLifeTopic1: string;
        dailyLifeTopic2: string;
        dailyLifeTopic3?: string;
        academicTopicM1: string;
      };

      const required = { cwTopicM1, dailyLifeTopic1, dailyLifeTopic2, academicTopicM1 };
      const missing = Object.entries(required).filter(([, v]) => !v?.trim()).map(([k]) => k);
      if (missing.length > 0) {
        return NextResponse.json({ ok: false, error: `Missing M1 topics: ${missing.join(', ')}` }, { status: 400 });
      }

      return await generateModule1({
        cwTopicM1,
        dailyLifeTopic1,
        dailyLifeTopic2,
        dailyLifeTopic3,
        academicTopicM1,
      });
    }

    // Module 2: M1 payload + M2 topics 필수
    if (targetModule === 2) {
      const {
        module1Payload,
        cwTopicM2Lower,
        dailyLifeTopic2L1,
        dailyLifeTopic2L2,
        academicTopicM2Upper,
      } = bodyData as {
        module1Payload: any;
        cwTopicM2Lower: string;
        dailyLifeTopic2L1: string;
        dailyLifeTopic2L2: string;
        academicTopicM2Upper: string;
      };

      const required = { cwTopicM2Lower, dailyLifeTopic2L1, dailyLifeTopic2L2, academicTopicM2Upper };
      const missing = Object.entries(required).filter(([, v]) => !v?.trim()).map(([k]) => k);
      if (missing.length > 0) {
        return NextResponse.json({ ok: false, error: `Missing M2 topics: ${missing.join(', ')}` }, { status: 400 });
      }

      if (!module1Payload) {
        return NextResponse.json({ ok: false, error: 'Missing module1Payload' }, { status: 400 });
      }

      return await generateModule2({
        module1Payload,
        cwTopicM2Lower,
        dailyLifeTopic2L1,
        dailyLifeTopic2L2,
        academicTopicM2Upper,
      });
    }

    return NextResponse.json({ ok: false, error: 'Invalid module parameter' }, { status: 400 });
  } catch (err: any) {
    console.error('GENERATE ERROR', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}

async function generateModule1({
  cwTopicM1,
  dailyLifeTopic1,
  dailyLifeTopic2,
  dailyLifeTopic3,
  academicTopicM1,
}: {
  cwTopicM1: string;
  dailyLifeTopic1: string;
  dailyLifeTopic2: string;
  dailyLifeTopic3?: string;
  academicTopicM1: string;
}) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 기존 테스트의 주제 장부(전체 이력: usedTopics + 실제 지문 제목)
    const existingTopics = collectUsedTopics(await fetchTestPayloads(supabase, 'reading_tests_2026'), 150);

    // (주의) 지금 배정된 주제를 기피 목록에 넣으면 프롬프트가 "이 주제를 쓰라"와 "쓰지 마라"를 동시에 말하게 된다.

    const prompt = `You are an expert Updated TOEFL iBT 2026 content creator. Generate ONLY Module 1 of an Adaptive Reading test JSON.

CRITICAL: Generate ALL THREE types of passages:
1. complete_words (1 passage, EXACTLY 10 blanks following ETS patterns)
2. daily_life (2-3 SEPARATE passages, 2-3 questions each)
3. academic_passage (1 passage, 5 questions)

AVOID REPEATING THESE (already used in earlier tests — different subject, scenario and wording; do not reuse their names, settings or storylines):
${Array.from(new Set(existingTopics)).slice(0, 150).map((t) => `- ${t}`).join('\n') || '(none)'}

${READING_QUALITY_RULES}

TOPICS:
- Complete Words: "${cwTopicM1}"
- Daily Life #1: "${dailyLifeTopic1}"
- Daily Life #2: "${dailyLifeTopic2}"
${dailyLifeTopic3 ? `- Daily Life #3 (optional): "${dailyLifeTopic3}"` : ""}
- Academic: "${academicTopicM1}"

COMPLETE WORDS RULES (CRITICAL):
- Exactly 10 blanks per passage
- Word length: 70-120 words total
- Blanks in 3-4 sentences
- First sentence: 0 blanks
- Middle sentences: 5 blanks each
- Last sentence: 2-5 blanks
- Max 5 blanks per sentence
- Content words (70%): Noun > Verb > Adjective > Adverb
- Function words (30%): is, the, from, to, by, in
- No duplicates
- Prefix visibility rules (this only decides how many letters of "visible" to keep — it does NOT affect how the blank is marked in paragraphHtml, see below):
  * 2-3 letters: show 1 (is → visible "i", hidden "s")
  * 4-6 letters: show 2-3 (from → visible "fr", hidden "om")
  * 7-9 letters: show 3 (record → visible "rec", hidden "ord")
  * 10+ letters: show 3-4 (However → visible "How", hidden "ever")
- Blanks placed only at word end (show prefix, hide suffix)
- paragraphHtml blank marking (CRITICAL — the renderer depends on this exact format):
  In paragraphHtml, write each blank as the "visible" prefix immediately followed by EXACTLY two underscore characters "__" — nothing else. No HTML tags, no data attributes, no bracketed numbers, and the number of underscores must always be exactly 2 regardless of how many letters are hidden.
  Example: if visible="peo" and hidden="ple", write "peo__" in paragraphHtml (NOT "peo___", NOT "<span data-order='1'>peo<span class='hidden'>ple</span></span>", NOT "peo__ [1]").

Return ONLY this JSON structure (NO markdown, NO explanations, NO extra text):
{
  "meta": {"id": "m1", "label": "Module 1", "examEra": "ibt_2026", "moduleType": "module1"},
  "modules": [{
    "id": "module1",
    "stage": 1,
    "items": [
      {
        "id": "m1-cw1",
        "taskKind": "complete_words",
        "stage": 1,
        "difficulty": "core",
        "passage": "Plain text paragraph with blanks...",
        "paragraphHtml": "<p>His inv__ allowed kno__ to spr__ rap__ across the region, making things far che__ and more acc__.</p>",
        "blanks": [
          {"order": 1, "word": "people", "visible": "peo", "hidden": "ple", "correctToken": "ple", "partOfSpeech": "noun"},
          {"order": 2, "word": "place", "visible": "pla", "hidden": "ce", "correctToken": "ce", "partOfSpeech": "noun"},
          {"order": 3, "word": "was", "visible": "w", "hidden": "as", "correctToken": "as", "partOfSpeech": "verb"},
          {"order": 4, "word": "from", "visible": "fr", "hidden": "om", "correctToken": "om", "partOfSpeech": "func"},
          {"order": 5, "word": "important", "visible": "imp", "hidden": "ortant", "correctToken": "ortant", "partOfSpeech": "adj"},
          {"order": 6, "word": "survival", "visible": "sur", "hidden": "vival", "correctToken": "vival", "partOfSpeech": "noun"},
          {"order": 7, "word": "clear", "visible": "cle", "hidden": "ar", "correctToken": "ar", "partOfSpeech": "adj"},
          {"order": 8, "word": "record", "visible": "rec", "hidden": "ord", "correctToken": "ord", "partOfSpeech": "noun"},
          {"order": 9, "word": "dancing", "visible": "dan", "hidden": "cing", "correctToken": "cing", "partOfSpeech": "verb"},
          {"order": 10, "word": "methods", "visible": "met", "hidden": "hods", "correctToken": "hods", "partOfSpeech": "noun"}
        ]
      },
      {
        "id": "m1-dl1",
        "taskKind": "daily_life",
        "stage": 1,
        "difficulty": "core",
        "contentHtml": "<p>Daily life context about ${dailyLifeTopic1}...</p>",
        "questions": [
          {"stem": "Question 1?", "choices": [{"id": "A", "text": "Option A", "isCorrect": true}, {"id": "B", "text": "Option B", "isCorrect": false}, {"id": "C", "text": "Option C", "isCorrect": false}, {"id": "D", "text": "Option D", "isCorrect": false}]},
          {"stem": "Question 2?", "choices": [{"id": "A", "text": "Option A", "isCorrect": false}, {"id": "B", "text": "Option B", "isCorrect": true}, {"id": "C", "text": "Option C", "isCorrect": false}, {"id": "D", "text": "Option D", "isCorrect": false}]}
        ]
      },
      {
        "id": "m1-dl2",
        "taskKind": "daily_life",
        "stage": 1,
        "difficulty": "core",
        "contentHtml": "<p>Daily life context about ${dailyLifeTopic2}...</p>",
        "questions": [
          {"stem": "Question 1?", "choices": [{"id": "A", "text": "Option A", "isCorrect": true}, {"id": "B", "text": "Option B", "isCorrect": false}, {"id": "C", "text": "Option C", "isCorrect": false}, {"id": "D", "text": "Option D", "isCorrect": false}]},
          {"stem": "Question 2?", "choices": [{"id": "A", "text": "Option A", "isCorrect": false}, {"id": "B", "text": "Option B", "isCorrect": true}, {"id": "C", "text": "Option C", "isCorrect": false}, {"id": "D", "text": "Option D", "isCorrect": false}]}
        ]
      },
      {
        "id": "m1-ac1",
        "taskKind": "academic_passage",
        "stage": 1,
        "difficulty": "core",
        "title": "The ${academicTopicM1}",
        "passageHtml": "<p>Paragraph 1 about ${academicTopicM1}...</p><p>Paragraph 2...</p><p>Paragraph 3...</p>",
        "questions": [
          {"stem": "What is...?", "choices": [{"id": "A", "text": "Option A", "isCorrect": true}, {"id": "B", "text": "Option B", "isCorrect": false}, {"id": "C", "text": "Option C", "isCorrect": false}, {"id": "D", "text": "Option D", "isCorrect": false}]},
          {"stem": "According to...?", "choices": [{"id": "A", "text": "Option A", "isCorrect": false}, {"id": "B", "text": "Option B", "isCorrect": true}, {"id": "C", "text": "Option C", "isCorrect": false}, {"id": "D", "text": "Option D", "isCorrect": false}]},
          {"stem": "The word ... refers to?", "choices": [{"id": "A", "text": "Option A", "isCorrect": false}, {"id": "B", "text": "Option B", "isCorrect": false}, {"id": "C", "text": "Option C", "isCorrect": true}, {"id": "D", "text": "Option D", "isCorrect": false}]},
          {"stem": "Why does...?", "choices": [{"id": "A", "text": "Option A", "isCorrect": false}, {"id": "B", "text": "Option B", "isCorrect": false}, {"id": "C", "text": "Option C", "isCorrect": false}, {"id": "D", "text": "Option D", "isCorrect": true}]},
          {"stem": "Where would...?", "choices": [{"id": "A", "text": "Option A", "isCorrect": true}, {"id": "B", "text": "Option B", "isCorrect": false}, {"id": "C", "text": "Option C", "isCorrect": false}, {"id": "D", "text": "Option D", "isCorrect": false}]}
        ]
      }
    ]
  }]
}`;

    // complete_words는 반드시 blanks 10개 — 지켜지지 않으면 최대 3번까지 재시도.
    let payload: any = null;
    let blankIssues: string[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const retryNote =
        attempt > 1
          ? `\n\n⚠️ 이전 응답이 검증에 실패했습니다: ${blankIssues.join('; ')}\ncomplete_words 항목은 반드시 "blanks" 배열에 정확히 10개의 항목이 있어야 하고, academic_passage의 passageHtml은 반드시 <p> 3개(정확히 3문단)여야 합니다. 응답하기 전에 개수를 세어 확인하세요.`
          : '';

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 12000,
        messages: [{ role: 'user', content: prompt + retryNote }],
      });
      void logAnthropicUsage('admin/updated-reading/generate:module1', 'claude-sonnet-4-6', message.usage);

      const raw = (message.content[0] as any).text as string;
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in Claude response');
      }

      payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      blankIssues = [...findBlankCountIssues(payload), ...findAcademicParagraphIssues(payload)];
      if (blankIssues.length === 0) break;
    }

    if (blankIssues.length > 0) {
      return NextResponse.json(
        { ok: false, error: `생성 검증 실패 — 빈칸 10개/학술 지문 3문단 (3회 재시도 후): ${blankIssues.join('; ')}` },
        { status: 500 }
      );
    }

    // ✅ 정답 위치 무작위화 — 패턴 감지에 기대지 않고 매 문제 choices를 무조건 섞는다
    // (validateAndShuffleIfNeeded는 AAAA 같은 구조적 패턴만 잡고, 통계적 쏠림(B/C 편중)은
    // 원래 정답 글자 묶음 자체를 안 바꾸니 셔플해도 못 고침 — shuffleAllChoicesInPayload로 교체)
    shuffleAllChoicesInPayload(payload);

    // ✅ 정답 블라인드 검증 + 근거 문장 초안 (실패해도 생성은 성공 처리)
    let qa: unknown = null;
    try { qa = await verifyQuestionsAndAttachEvidence(payload, client); } catch (e) { console.error('[QA] verify failed', e); }

    const id = randomUUID();
    payload.meta.id = id;
    payload.meta.usedTopics = {
      complete_words: [cwTopicM1],
      daily_life: [dailyLifeTopic1, dailyLifeTopic2].concat(dailyLifeTopic3 ? [dailyLifeTopic3] : []),
      academic: [academicTopicM1],
    };

    // ✅ Problem Bank에 저장 (비동기)
    extractReadingTestToBank(payload, id).catch((err) => {
      console.error('[ProblemBank] Failed to extract Module1:', err);
    });

    return NextResponse.json({ ok: true, id, payload, qa });
  } catch (err: any) {
    console.error('MODULE 1 GENERATE ERROR', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}

async function generateModule2({
  module1Payload,
  cwTopicM2Lower,
  dailyLifeTopic2L1,
  dailyLifeTopic2L2,
  academicTopicM2Upper,
}: {
  module1Payload: any;
  cwTopicM2Lower: string;
  dailyLifeTopic2L1: string;
  dailyLifeTopic2L2: string;
  academicTopicM2Upper: string;
}) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Module 1의 주제 추출
    const m1Topics = module1Payload?.meta?.usedTopics || {};
    const m1UsedTopics: string[] = [];
    Object.values(m1Topics).forEach((topics: any) => {
      if (Array.isArray(topics)) m1UsedTopics.push(...topics);
      else if (typeof topics === 'string') m1UsedTopics.push(topics);
    });

    // 기존 테스트의 주제 장부(전체 이력: usedTopics + 실제 지문 제목)
    const existingTopics = collectUsedTopics(await fetchTestPayloads(supabase, 'reading_tests_2026'), 150);

    // Module 1 주제 + 기존 주제 모두 제외
    const excludedTopics = [...m1UsedTopics, ...existingTopics];

    const prompt = `You are an expert Updated TOEFL iBT 2026 content creator.

CRITICAL: Generate ONLY Module 2 (stage2Pool) JSON. Do NOT include Module 1.

AVOID DUPLICATE TOPICS (Module 1 of this test + earlier tests — do not reuse their subjects, settings or storylines):
${Array.from(new Set(excludedTopics)).slice(0, 170).map(t => `- ${t}`).join('\n')}

${READING_QUALITY_RULES}

GENERATE Module 2 with TWO branches:
- hard: complete_words (EXACTLY 10 blanks, ETS style) + academic_passage (5 questions)
- easy: complete_words (EXACTLY 10 blanks, ETS style) + daily_life (2-3 questions each)

TOPICS TO USE:
- Complete Words: "${cwTopicM2Lower}"
- Daily Life #1: "${dailyLifeTopic2L1}"
- Daily Life #2: "${dailyLifeTopic2L2}"
- Academic: "${academicTopicM2Upper}"

COMPLETE WORDS RULES (BOTH hard & easy branches):
- Exactly 10 blanks per passage
- Word length: 70-120 words
- Blanks in 3-4 sentences
- First sentence: 0 blanks
- Max 5 blanks per sentence
- Content words 70%, Function words 30%
- No duplicates
- Prefix visibility: 2-3 chars→1, 4-6→2-3, 7-9→3, 10+→3-4 (this only decides the "visible" field length, not the blank marking)
- paragraphHtml blank marking (CRITICAL — the renderer depends on this exact format): write each blank as the "visible" prefix immediately followed by EXACTLY two underscore characters "__" — nothing else. No HTML tags, no data attributes, no bracketed numbers, and always exactly 2 underscores regardless of hidden length.
  Example: visible="peo" hidden="ple" → write "peo__" in paragraphHtml (NOT "peo___", NOT any HTML span/attribute, NOT "peo__ [1]").

Return ONLY this JSON structure (NO markdown, NO explanations):
{
  "stage2Pool": {
    "cutScore": 0.7,
    "hard": {
      "id": "module2-hard",
      "stage": 2,
      "items": [
        {
          "id": "m2h-cw1",
          "taskKind": "complete_words",
          "stage": 2,
          "difficulty": "hard",
          "passage": "Plain text paragraph...",
          "paragraphHtml": "<p>His inv__ allowed kno__ to spr__ rap__ across the region, making things far che__ and more acc__.</p>",
          "blanks": [
            {"order": 1, "word": "people", "visible": "peo", "hidden": "ple", "correctToken": "ple", "partOfSpeech": "noun"},
            {"order": 2, "word": "place", "visible": "pla", "hidden": "ce", "correctToken": "ce", "partOfSpeech": "noun"},
            {"order": 3, "word": "was", "visible": "w", "hidden": "as", "correctToken": "as", "partOfSpeech": "verb"},
            {"order": 4, "word": "from", "visible": "fr", "hidden": "om", "correctToken": "om", "partOfSpeech": "func"},
            {"order": 5, "word": "important", "visible": "imp", "hidden": "ortant", "correctToken": "ortant", "partOfSpeech": "adj"},
            {"order": 6, "word": "survival", "visible": "sur", "hidden": "vival", "correctToken": "vival", "partOfSpeech": "noun"},
            {"order": 7, "word": "clear", "visible": "cle", "hidden": "ar", "correctToken": "ar", "partOfSpeech": "adj"},
            {"order": 8, "word": "record", "visible": "rec", "hidden": "ord", "correctToken": "ord", "partOfSpeech": "noun"},
            {"order": 9, "word": "dancing", "visible": "dan", "hidden": "cing", "correctToken": "cing", "partOfSpeech": "verb"},
            {"order": 10, "word": "methods", "visible": "met", "hidden": "hods", "correctToken": "hods", "partOfSpeech": "noun"}
          ]
        },
        {
          "id": "m2h-ac1",
          "taskKind": "academic_passage",
          "stage": 2,
          "difficulty": "hard",
          "title": "Title",
          "passageHtml": "<p>Paragraph 1...</p><p>Paragraph 2...</p><p>Paragraph 3...</p>",
          "questions": [
            {
              "stem": "What does...",
              "choices": [
                {"id": "A", "text": "...", "isCorrect": true},
                {"id": "B", "text": "...", "isCorrect": false},
                {"id": "C", "text": "...", "isCorrect": false},
                {"id": "D", "text": "...", "isCorrect": false}
              ]
            }
          ]
        }
      ]
    },
    "easy": {
      "id": "module2-easy",
      "stage": 2,
      "items": [
        {
          "id": "m2e-cw1",
          "taskKind": "complete_words",
          "stage": 2,
          "difficulty": "easy",
          "passage": "Plain text paragraph...",
          "paragraphHtml": "<p>His inv__ allowed kno__ to spr__ rap__ across the region, making things far che__ and more acc__.</p>",
          "blanks": [
            {"order": 1, "word": "people", "visible": "peo", "hidden": "ple", "correctToken": "ple", "partOfSpeech": "noun"},
            {"order": 2, "word": "place", "visible": "pla", "hidden": "ce", "correctToken": "ce", "partOfSpeech": "noun"},
            {"order": 3, "word": "was", "visible": "w", "hidden": "as", "correctToken": "as", "partOfSpeech": "verb"},
            {"order": 4, "word": "from", "visible": "fr", "hidden": "om", "correctToken": "om", "partOfSpeech": "func"},
            {"order": 5, "word": "important", "visible": "imp", "hidden": "ortant", "correctToken": "ortant", "partOfSpeech": "adj"},
            {"order": 6, "word": "survival", "visible": "sur", "hidden": "vival", "correctToken": "vival", "partOfSpeech": "noun"},
            {"order": 7, "word": "clear", "visible": "cle", "hidden": "ar", "correctToken": "ar", "partOfSpeech": "adj"},
            {"order": 8, "word": "record", "visible": "rec", "hidden": "ord", "correctToken": "ord", "partOfSpeech": "noun"},
            {"order": 9, "word": "dancing", "visible": "dan", "hidden": "cing", "correctToken": "cing", "partOfSpeech": "verb"},
            {"order": 10, "word": "methods", "visible": "met", "hidden": "hods", "correctToken": "hods", "partOfSpeech": "noun"}
          ]
        },
        {
          "id": "m2e-dl1",
          "taskKind": "daily_life",
          "stage": 2,
          "difficulty": "easy",
          "contentHtml": "<p>...</p>",
          "questions": [
            {
              "stem": "Why...",
              "choices": [
                {"id": "A", "text": "...", "isCorrect": true},
                {"id": "B", "text": "...", "isCorrect": false},
                {"id": "C", "text": "...", "isCorrect": false},
                {"id": "D", "text": "...", "isCorrect": false}
              ]
            }
          ]
        }
      ]
    }
  }
}`;

    // complete_words는 반드시 blanks 10개 — 지켜지지 않으면 최대 3번까지 재시도.
    let module2Data: any = null;
    let blankIssues: string[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const retryNote =
        attempt > 1
          ? `\n\n⚠️ 이전 응답이 검증에 실패했습니다: ${blankIssues.join('; ')}\ncomplete_words 항목은 반드시 "blanks" 배열에 정확히 10개의 항목이 있어야 하고, academic_passage의 passageHtml은 반드시 <p> 3개(정확히 3문단)여야 합니다. 응답하기 전에 개수를 세어 확인하세요.`
          : '';

      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 12000,
        messages: [{ role: 'user', content: prompt + retryNote }],
      });
      void logAnthropicUsage('admin/updated-reading/generate:module2', 'claude-sonnet-4-6', message.usage);

      const raw = (message.content[0] as any).text as string;
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('No JSON found in Claude response');
      }

      module2Data = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      blankIssues = [...findBlankCountIssues(module2Data), ...findAcademicParagraphIssues(module2Data)];
      if (blankIssues.length === 0) break;
    }

    if (blankIssues.length > 0) {
      return NextResponse.json(
        { ok: false, error: `생성 검증 실패 — 빈칸 10개/학술 지문 3문단 (3회 재시도 후): ${blankIssues.join('; ')}` },
        { status: 500 }
      );
    }

    // ✅ 정답 위치 무작위화 (hard와 easy 모두) — 매 문제 choices를 무조건 섞는다
    shuffleAllChoicesInPayload(module2Data.stage2Pool.hard);
    shuffleAllChoicesInPayload(module2Data.stage2Pool.easy);

    // ✅ 정답 블라인드 검증 + 근거 문장 초안 (hard/easy 모두)
    let qa: unknown = null;
    try { qa = await verifyQuestionsAndAttachEvidence(module2Data, client); } catch (e) { console.error('[QA] verify failed', e); }

    const id = randomUUID();
    module2Data.meta = {
      id,
      moduleType: 'module2',
    };

    // ✅ Problem Bank에 저장 (비동기)
    extractReadingTestToBank(module2Data, id).catch((err) => {
      console.error('[ProblemBank] Failed to extract Module2:', err);
    });

    return NextResponse.json({ ok: true, id, payload: module2Data, qa });
  } catch (err: any) {
    console.error('MODULE 2 GENERATE ERROR', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'Unknown error' }, { status: 500 });
  }
}

