export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import { logAnthropicUsage } from '@/lib/ai/logAnthropicUsage';

export const runtime = 'nodejs';
export const maxDuration = 120;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: Request) {
  try {
    const { buildSentenceTopic, emailTopic, academicTopic } = await req.json() as {
      buildSentenceTopic?: string;
      emailTopic: string;
      academicTopic: string;
    };

    if (!emailTopic?.trim() || !academicTopic?.trim()) {
      return NextResponse.json({ ok: false, error: 'All 3 topics required' }, { status: 400 });
    }

    const prompt = `You are an expert Updated TOEFL Writing content creator. Generate a complete Updated TOEFL Writing test JSON with exactly 3 tasks.

Task 1 — Build a Sentence (10 questions, 6 min 50 sec global timer):
Optional setting hint (may be empty): "${buildSentenceTopic}" — use it for AT MOST ONE of the 10 questions (e.g. q1). The other 9 questions must use completely different settings. Never build the whole task around this hint.
Pick 10 DIFFERENT settings, e.g.: campus library, flight delay, dorm roommate, lab report, restaurant order, bank/phone plan, job fair, gym membership, museum trip, group project, apartment repair, weather/commute, online shopping return, doctor appointment.

This task is NOT one themed essay. EVERY question is an independent mini-conversation:
- Each of the 10 questions has its OWN situation and topic (e.g. a library, a flight delay, a lab, a roommate, a job fair...). Do NOT reuse one situation across questions; the 10 contexts must all differ.
- contextLeadIn is the other speaker's short line (a question or statement), written like "A: ..." — the test taker builds the reply that answers it.
- CONVERSATION COHERENCE (critical): the built sentence must be a natural, direct reply to the A line, as if you read the two lines aloud as a real dialogue. If A asks a question, B's sentence must answer it or respond to it. If A makes a statement, B's sentence must be a natural reaction or follow-up to that statement. Design A's line FIRST so that B's target structure is the obvious thing to say next; never attach an unrelated A line to a sentence you already wrote.
  BAD: A: "Excuse me, do you work here at the pharmacy?"  B: "Can you recommend a good cold medicine for me?"  (B ignores A's question)
  GOOD: A: "Hello! How can I help you today?"  B: "Can you recommend a good cold medicine for me?"
  Before finalizing each question, re-read A then B once; if B does not clearly follow from A, rewrite A.
- contextLeadOut is usually "" (empty) because the built sentence IS the whole reply.
- Each question has:
  • tokens: the pieces that form the correct answer, IN CORRECT ORDER
  • correctOrder: array of those token ids in the correct order (same order as tokens)
  • distractors: 0-2 extra tokens that are NOT part of the answer (see below)
  • punctuation: sentence-final punctuation ("?" or "." or "") — NOT a token

GRAMMAR FOCUS — this task tests word order and structure, not creativity. Across the 10 questions cover a spread of these (each question tests ONE main structure):
  indirect (embedded) questions ("Could you tell me where the library is?"), relative clauses (who/which/that/whose),
  inverted conditionals / subjunctive ("Had I known..., I would have..."), negative inversion ("Never have I seen..."),
  passive voice, perfect tenses, comparatives, reported speech, "wish"/"would rather" patterns, noun clauses ("what she said"),
  and ordinary wh-questions with auxiliaries. Answers may be statements or questions.

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

DISTRACTORS: on about 4 of the 10 questions (spread across difficulty) add 1-2 distractors, e.g.
"distractors": [{"id":"d1","text":"did","type":"WORD"}]. A distractor must be a plausible but grammatically
wrong choice for that slot (wrong tense/form, an extra auxiliary, a wrong preposition or pronoun). It must NOT make
a second valid answer: with it, the sentence must become ungrammatical or change the meaning. Ids start with "d".
Questions without distractors use "distractors": []. Distractors are NEVER listed in tokens or correctOrder.

Every token in tokens is used exactly once in the correct answer — the item is scored all-or-nothing,
1 point, with no partial credit.

- Sentences should be natural English
- Difficulty: first 3 easy (q1-q3), middle 4 medium (q4-q7), last 3 harder (q8-q10)

Example of a correctly split question (with one distractor):
  contextLeadIn: "A: I'm going shopping later."   contextLeadOut: ""
  answer sentence: "What brand will you buy?"
  tokens: [{"id":"t1","text":"What","type":"WORD"},{"id":"t2","text":"brand","type":"WORD"},
           {"id":"t3","text":"will","type":"WORD"},{"id":"t4","text":"you","type":"WORD"},
           {"id":"t5","text":"buy","type":"WORD"}]
  correctOrder: ["t1","t2","t3","t4","t5"]   punctuation: "?"
  distractors: [{"id":"d1","text":"did","type":"WORD"}]

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

    // 구조 검증 — Build a Sentence는 정답이 토큰 id 배열이라 어긋나면 채점이 불가능해진다.
    const check = (pl: any): string[] => {
      const issues: string[] = [];
      const bs = pl?.items?.find((t: any) => t.taskKind === 'build_a_sentence');
      if (!Array.isArray(bs?.questions) || bs.questions.length !== 10) issues.push(`build_a_sentence needs exactly 10 questions (got ${bs?.questions?.length ?? 0})`);
      (bs?.questions ?? []).forEach((q: any) => {
        const ids: string[] = (q.tokens ?? []).map((t: any) => t.id);
        const order: string[] = q.correctOrder ?? [];
        if (ids.length < 4 || ids.length > 9) issues.push(`${q.id}: ${ids.length} tokens (need 5-8)`);
        if (new Set(ids).size !== ids.length) issues.push(`${q.id}: duplicate token ids`);
        const ds: any[] = Array.isArray(q.distractors) ? q.distractors : [];
        if (ds.length > 2) issues.push(`${q.id}: ${ds.length} distractors (max 2)`);
        if (ds.some((d) => !d?.id || !d?.text || ids.includes(d.id))) issues.push(`${q.id}: distractor needs unique id and text`);
        if (ds.some((d) => (q.tokens ?? []).some((t: any) => String(t.text).toLowerCase() === String(d.text).toLowerCase()))) issues.push(`${q.id}: distractor duplicates an answer token`);
        if (order.length !== ids.length || order.some((id) => !ids.includes(id)) || new Set(order).size !== order.length)
          issues.push(`${q.id}: correctOrder must contain every token id exactly once`);
      });
      if (!pl?.items?.some((t: any) => t.taskKind === 'email')) issues.push('missing email task');
      const ad = pl?.items?.find((t: any) => t.taskKind === 'academic_discussion');
      if (!ad || (ad.studentPosts?.length ?? 0) !== 2) issues.push('academic_discussion needs exactly 2 studentPosts');
      return issues;
    };

    let payload: any = null;
    let issues: string[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const retryNote = attempt > 1 ? `\n\nYour previous answer failed validation: ${issues.join('; ')}. Fix these and return the full JSON again.` : '';
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 7500,
        messages: [{ role: 'user', content: prompt + retryNote }],
      });
      void logAnthropicUsage('admin/updated-writing/generate', 'claude-sonnet-4-6', message.usage);

      const raw = (message.content[0] as { type: string; text: string }).text.trim();
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      issues = check(payload);
      if (issues.length === 0) break;
    }
    if (issues.length > 0) {
      return NextResponse.json({ ok: false, error: `Writing 생성 검증 실패 (3회 재시도 후): ${issues.join('; ')}` }, { status: 500 });
    }

    const id = randomUUID();
    payload.meta.id = id;
    // 주제 추천이 중복을 피할 수 있도록 이번에 소비한 주제를 남긴다.
    payload.meta.usedTopics = {
      build_sentence: buildSentenceTopic?.trim() ? [buildSentenceTopic] : [],
      email: [emailTopic],
      academic: [academicTopic],
    };

    return NextResponse.json({ ok: true, id, payload });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
