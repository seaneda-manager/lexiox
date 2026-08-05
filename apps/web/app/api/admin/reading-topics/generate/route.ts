export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: Request) {
  try {
    const { count = 10, excludedTopics = [], module = 'M1' } = await req.json();

    const excluded = Array.isArray(excludedTopics) ? excludedTopics.join(', ') : '';

    const prompt = `You are a TOEFL 2026 Reading topic expert.

Generate ${count} NEW reading topics for different passage types.

CONSTRAINTS:
1. Avoid these topics:
   ${excluded || '(none yet)'}

2. Distribution:
   - 30% complete_words topics (60-80 words, academic/science)
   - 40% daily_life topics (80-140 words, campus/practical)
   - 30% academic_passage topics (250-300 words, scholarly)

3. Difficulty split:
   - Easy (40%): accessible, straightforward
   - Medium (40%): balanced complexity
   - Hard (20%): abstract, technical, dense

4. For module "${module}":
   ${module === 'M2-Hard' ? '   - Focus on academic/technical topics only' : ''}
   ${module === 'M2-Easy' ? '   - Focus on practical/daily life topics' : ''}

Return ONLY valid JSON (no markdown):
{
  "topics": [
    {
      "topic": "Topic Name",
      "type": "complete_words|daily_life_short|daily_life_long|academic_passage",
      "difficulty": "easy|medium|hard",
      "category": "Biology|History|Physics|Culture|Technology|Environment|Science|Business|other",
      "word_count": 70,
      "tone": "academic|casual|formal",
      "style": "scientific|notice|email|announcement|technical|scholarly"
    },
    ...
  ]
}`;

    let message;
    try {
      message = await client.messages.create({
        model: 'claude-opus-5',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });
      console.log('✓ Claude API call successful');
    } catch (apiErr: any) {
      console.error('❌ Claude API Error:', apiErr);
      throw new Error(`Claude API failed: ${apiErr.message}`);
    }

    if (!message) {
      throw new Error('Message is undefined');
    }

    if (!message.content || message.content.length === 0) {
      throw new Error(`No content in response. stop_reason: ${message.stop_reason}`);
    }

    // Find text content (skip thinking blocks)
    const textBlock = message.content.find((c: any) => c.type === 'text');
    if (!textBlock || !(textBlock as any).text) {
      throw new Error(`No text block found. Available types: ${message.content.map((c: any) => c.type).join(', ')}`);
    }

    const raw = (textBlock as any).text as string;
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON found in Claude response');
    }

    let payload;
    try {
      payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    } catch (parseErr: any) {
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
        `JSON parsing failed at line ${errorLine || '?'} column ${errorCol || '?'}:\n${context}`
      );
    }

    if (!payload?.topics || !Array.isArray(payload.topics)) {
      throw new Error('Invalid response structure: missing topics array');
    }

    return NextResponse.json({
      ok: true,
      count: payload.topics.length,
      topics: payload.topics,
      excluded: excludedTopics,
    });
  } catch (err: any) {
    console.error('TOPIC GENERATION ERROR', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
