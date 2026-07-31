import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { generateQuestionPrompt } from '@/lib/reading-topics/question-generator-prompt';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || 'placeholder' });

export async function POST(req: Request) {
  try {
    const { passage, passageType, topic, difficulty, questionCount = 5 } = await req.json();

    if (!passage || !passageType) {
      return NextResponse.json(
        { ok: false, error: 'Missing passage or passageType' },
        { status: 400 }
      );
    }

    const prompt = generateQuestionPrompt({
      passage,
      passageType,
      topic,
      difficulty: difficulty || 'medium',
      questionCount,
    });

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
      console.log('✓ Claude API call successful for questions');
      console.log('Message structure:', {
        content_length: message.content?.length,
        content_types: message.content?.map((c: any) => c.type),
        first_content: JSON.stringify(message.content?.[0], null, 2),
      });
    } catch (apiErr: any) {
      console.error('❌ Claude API Error:', apiErr);
      throw new Error(`Claude API failed: ${apiErr.message}`);
    }

    if (!message || !message.content || message.content.length === 0) {
      throw new Error(`Invalid Claude response: missing content`);
    }

    // Find text content (skip thinking blocks)
    const textBlock = message.content.find((c: any) => c.type === 'text');
    if (!textBlock || !(textBlock as any).text) {
      console.error('DEBUG: No text content found. Available:', message.content.map((c: any) => c.type));
      throw new Error(`Invalid Claude response: no text block found`);
    }

    const raw = (textBlock as any).text as string;
    if (!raw || typeof raw !== 'string') {
      throw new Error(`Invalid Claude response: text is not a string`);
    }

    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No JSON found in response');
    }

    let payload;
    try {
      payload = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    } catch (parseErr: any) {
      const jsonStr = raw.slice(jsonStart, jsonEnd + 1);
      const lines = jsonStr.split('\n');
      const errorLine = parseErr.message.match(/line (\d+)/)?.[1];

      let context = '';
      if (errorLine) {
        const lineNum = parseInt(errorLine);
        const startLine = Math.max(0, lineNum - 2);
        const endLine = Math.min(lines.length, lineNum + 1);
        context = lines.slice(startLine, endLine).join('\n');
      }

      throw new Error(`JSON parsing failed: ${parseErr.message}\n${context}`);
    }

    if (!payload?.questions || !Array.isArray(payload.questions)) {
      console.error('DEBUG: payload structure:', JSON.stringify(payload, null, 2));
      throw new Error('Invalid response structure: missing questions array');
    }

    return NextResponse.json({
      ok: true,
      passageType,
      topic,
      difficulty,
      questionCount: payload.questions.length,
      questions: payload.questions,
    });
  } catch (err: any) {
    console.error('QUESTION GENERATION ERROR', err.message);
    console.error('FULL ERROR:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
