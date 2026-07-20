import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type { ScriptSegment } from '@/models/listening';

const client = new Anthropic();

interface RequestBody {
  transcript: string;
  taskKind?: 'conversation' | 'academic_lecture' | 'campus_audio_log';
}

/**
 * POST /api/admin/listening/generate-script
 *
 * Transcript를 받아서 Claude를 사용해 단어 레벨 타임스탐프를 생성합니다.
 *
 * 입력:
 * - transcript: "Professor: Good morning... Student: Hi..."
 * - taskKind: 'conversation' | 'academic_lecture' | 'campus_audio_log'
 *
 * 출력:
 * - scriptSegments: ScriptSegment[]
 */
export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { transcript, taskKind = 'conversation' } = body;

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: 'transcript is required' },
        { status: 400 }
      );
    }

    // Claude를 사용해 타임스탐프가 있는 JSON 생성
    const systemPrompt = `You are an expert in TOEFL listening tests.
Your task is to parse a transcript and generate word-level timestamps for each segment.

The output must be a valid JSON array of ScriptSegment objects with this structure:
{
  "id": "SEG_001",
  "speaker": "professor" | "student" | "instructor" | "announcement",
  "text": "The complete sentence or phrase",
  "startTime": 1.2,
  "endTime": 3.5,
  "words": [
    { "word": "Good", "startTime": 1.2, "endTime": 1.5 },
    { "word": "morning", "startTime": 1.6, "endTime": 2.1 },
    ...
  ]
}

Guidelines:
1. Average speaking rate: 130-150 WPM
2. Each word takes approximately 0.3-0.5 seconds
3. Speaker transitions have 0.5-1.0 second gaps
4. Segments should be 1-2 sentences per speaker
5. For timestamps, distribute words evenly across the segment duration

Return ONLY valid JSON array, no markdown or explanation.`;

    const userPrompt = `Parse this transcript and generate word-level timestamps for each segment:

Task kind: ${taskKind}

Transcript:
${transcript}

Generate ScriptSegment objects with word-level timestamps. Output must be valid JSON array only.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Claude의 응답 추출
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // JSON 파싱
    let scriptSegments: ScriptSegment[];
    try {
      // JSON 추출 (마크다운 코드블록이 있을 경우 처리)
      let jsonStr = content.text;
      const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }
      scriptSegments = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse Claude response:', content.text);
      throw new Error('Failed to parse generated script segments');
    }

    // 데이터 검증
    if (!Array.isArray(scriptSegments)) {
      throw new Error('Response must be an array of ScriptSegment objects');
    }

    // 각 segment 검증
    for (const seg of scriptSegments) {
      if (!seg.id || !seg.speaker || !seg.text || typeof seg.startTime !== 'number' || !Array.isArray(seg.words)) {
        throw new Error('Invalid ScriptSegment structure');
      }
      for (const word of seg.words) {
        if (!word.word || typeof word.startTime !== 'number' || typeof word.endTime !== 'number') {
          throw new Error('Invalid word timestamp structure');
        }
      }
    }

    return NextResponse.json({
      ok: true,
      payload: scriptSegments,
    });
  } catch (error: any) {
    console.error('Error in generate-script:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to generate script segments' },
      { status: 500 }
    );
  }
}
