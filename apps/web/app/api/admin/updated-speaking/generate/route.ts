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
- speakingSeconds: 8 for sentences 1-2, 10 for sentences 3-5, 12 for sentences 6-7
- locationLabel: for EACH sentence, a short 2-4 word sign/label for the specific corner, section, or device this sentence relates to within the situation (e.g. for "campus bookstore": "Textbook Section", "Checkout Counter", "Study Area", "Return Desk"). These will be rendered as small signage text on a floor plan illustration, so keep them short and sign-like, and make sure the 7 labels are spread across different areas (not all the same spot).

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
        { "id": "s1", "text": "...", "speakingSeconds": 8, "locationLabel": "..." },
        { "id": "s2", "text": "...", "speakingSeconds": 8, "locationLabel": "..." },
        { "id": "s3", "text": "...", "speakingSeconds": 10, "locationLabel": "..." },
        { "id": "s4", "text": "...", "speakingSeconds": 10, "locationLabel": "..." },
        { "id": "s5", "text": "...", "speakingSeconds": 10, "locationLabel": "..." },
        { "id": "s6", "text": "...", "speakingSeconds": 12, "locationLabel": "..." },
        { "id": "s7", "text": "...", "speakingSeconds": 12, "locationLabel": "..." }
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

    // 구조 검증(문장 7개·질문 4개·음절 대략 범위) — 어긋나면 최대 3회 재시도.
    // (LLM은 음절 수를 자주 틀리므로 모음군 기반 추정으로 넉넉한 범위만 본다.)
    const syl = (t: string) => (t.toLowerCase().replace(/e\b/g, '').match(/[aeiouy]+/g) ?? []).length || 1;
    const check = (pl: any): string[] => {
      const issues: string[] = [];
      const lr = pl?.tasks?.find((t: any) => t.type === 'listen_repeat');
      const iv = pl?.tasks?.find((t: any) => t.type === 'interview');
      if (!Array.isArray(lr?.sentences) || lr.sentences.length !== 7) issues.push(`listen_repeat sentences must be exactly 7 (got ${lr?.sentences?.length ?? 0})`);
      else {
        lr.sentences.forEach((st: any, i: number) => {
          const n = syl(String(st.text ?? ''));
          const [lo, hi] = i < 2 ? [7, 13] : i < 5 ? [11, 19] : [16, 27];
          if (n < lo || n > hi) issues.push(`sentence ${i + 1} has about ${n} syllables, expected ${i < 2 ? '9-11' : i < 5 ? '14-16' : '19-23'}`);
        });
        const labels = new Set(lr.sentences.map((st: any) => st.locationLabel));
        if (labels.size < 5) issues.push('locationLabel values must be spread across different areas');
      }
      if (!Array.isArray(iv?.questions) || iv.questions.length !== 4) issues.push(`interview questions must be exactly 4 (got ${iv?.questions?.length ?? 0})`);
      return issues;
    };

    let payload: any = null;
    let issues: string[] = [];
    for (let attempt = 1; attempt <= 3; attempt++) {
      const retryNote = attempt > 1 ? `\n\nYour previous answer failed validation: ${issues.join('; ')}. Fix these and return the full JSON again.` : '';
      const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt + retryNote }],
      });
      void logAnthropicUsage('admin/updated-speaking/generate', 'claude-sonnet-4-6', message.usage);

      const raw = (message.content[0] as { type: string; text: string }).text.trim();
      const jsonStart = raw.indexOf('{');
      const jsonEnd = raw.lastIndexOf('}');
      payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      issues = check(payload);
      if (issues.length === 0) break;
    }
    if (issues.length > 0) {
      return NextResponse.json({ ok: false, error: `Speaking 생성 검증 실패 (3회 재시도 후): ${issues.join('; ')}` }, { status: 500 });
    }

    payload.id = randomUUID();
    // 주제 추천이 중복을 피할 수 있도록 이번에 소비한 주제를 남긴다.
    payload.usedTopics = {
      listen_repeat: [listenRepeatTopic],
      interview: [interviewTopic],
    };

    return NextResponse.json({ ok: true, id: payload.id, payload });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
