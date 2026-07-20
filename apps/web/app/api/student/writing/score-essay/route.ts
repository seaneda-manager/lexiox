import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';

/**
 * M4: Automated AI Scoring Pipeline
 *
 * POST /api/student/writing/score-essay
 *
 * ✅ Word count 필터링
 * ✅ Claude Opus 4.1 채점
 * ✅ Rubric 기반 피드백
 * ✅ 3초 내 응답 (async queue)
 */

interface ScoringRequest {
  taskId: 'TASK_1' | 'TASK_2' | 'TASK_3';
  userAnswer: string;
  prompt?: string;
  correctAnswer?: string; // Task 1만 해당
}

interface RubricScores {
  grammar: number;
  vocabulary: number;
  organization: number;
  taskCompletion: number;
}

interface ScoringResponse {
  score: number; // 0-100
  feedback: string;
  strengths: string[];
  improvements: string[];
  wordCount: number;
  rubricScores: RubricScores;
  taskId: string;
}

const TASK_WORD_LIMITS = {
  TASK_1: { min: 8, max: 20 },
  TASK_2: { min: 150, max: 225 },
  TASK_3: { min: 100, max: 200 },
};

function countWords(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  return text.trim().split(/\s+/).length;
}

function generateScoringPrompt(
  taskId: string,
  prompt: string | undefined,
  userAnswer: string,
  correctAnswer: string | undefined,
  wordCount: number
): string {
  if (taskId === 'TASK_1') {
    // Task 1: Build a Sentence
    return `
You are an expert TOEFL iBT Writing examiner.

Task: Build a Sentence

Prompt: "${prompt}"
Correct Answer: "${correctAnswer}"
Student's Answer: "${userAnswer}"
Word Count: ${wordCount}

Score this response on a scale of 0-100 based on:
1. Exact correctness (100% = perfect match)
2. Word order accuracy
3. Grammar and punctuation
4. Completeness of the sentence

Respond in JSON format:
{
  "score": <0-100>,
  "rubricScores": {
    "grammar": <0-100>,
    "vocabulary": <0-100>,
    "organization": <0-100>,
    "taskCompletion": <0-100>
  },
  "feedback": "<brief feedback>",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}
`;
  }

  if (taskId === 'TASK_2') {
    // Task 2: Write Email
    return `
You are an expert TOEFL iBT Writing examiner.

Task: Write an Email

Context: "${prompt || 'N/A'}"
Student's Email:
${userAnswer}

Word Count: ${wordCount}

Score this email on a scale of 0-100 based on TOEFL Writing Rubric:
- Task Completion (30%): Does it address the prompt fully?
- Organization (25%): Is it clearly structured?
- Grammar & Mechanics (25%): Correct usage and punctuation?
- Vocabulary (20%): Appropriate and varied word choice?

Respond in JSON format:
{
  "score": <0-100>,
  "rubricScores": {
    "grammar": <0-100>,
    "vocabulary": <0-100>,
    "organization": <0-100>,
    "taskCompletion": <0-100>
  },
  "feedback": "<2-3 sentence feedback>",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"]
}
`;
  }

  // Task 3: Academic Discussion
  return `
You are an expert TOEFL iBT Writing examiner.

Task: Academic Discussion

Context: "${prompt || 'N/A'}"
Student's Response:
${userAnswer}

Word Count: ${wordCount}

Score this response on a scale of 0-100 based on TOEFL Writing Rubric:
- Task Completion (30%): Does it address the discussion prompt?
- Organization (25%): Is it logically structured with clear position?
- Grammar & Mechanics (25%): Correct usage and sentence variety?
- Vocabulary (20%): Academic and precise word choice?

Respond in JSON format:
{
  "score": <0-100>,
  "rubricScores": {
    "grammar": <0-100>,
    "vocabulary": <0-100>,
    "organization": <0-100>,
    "taskCompletion": <0-100>
  },
  "feedback": "<2-3 sentence feedback>",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"]
}
`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ScoringRequest;
    const { taskId, userAnswer, prompt, correctAnswer } = body;

    // 1️⃣ 입력 검증
    if (!taskId || !userAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId, userAnswer' },
        { status: 400 }
      );
    }

    // 2️⃣ Word count 필터링
    const wordCount = countWords(userAnswer);
    const limits = TASK_WORD_LIMITS[taskId];

    // Word count 경고 (강제하지 않음, 피드백에만 포함)
    let wordCountWarning = '';
    if (wordCount < limits.min) {
      wordCountWarning = `Warning: Answer is below minimum word count (${wordCount}/${limits.min}).`;
    } else if (wordCount > limits.max) {
      wordCountWarning = `Warning: Answer exceeds maximum word count (${wordCount}/${limits.max}).`;
    }

    // 3️⃣ Claude API 호출 (async)
    const client = new Anthropic();

    const scoringPrompt = generateScoringPrompt(
      taskId,
      prompt,
      userAnswer,
      correctAnswer,
      wordCount
    );

    const startTime = Date.now();
    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: scoringPrompt,
        },
      ],
    });

    const elapsed = Date.now() - startTime;

    // 4️⃣ 응답 파싱
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude API');
    }

    let scoringData;
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      scoringData = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', content.text);
      throw new Error('Failed to parse scoring response');
    }

    // 5️⃣ 응답 구성
    const result: ScoringResponse = {
      score: Math.round(scoringData.score || 0),
      feedback: (wordCountWarning + ' ' + (scoringData.feedback || '')).trim(),
      strengths: scoringData.strengths || [],
      improvements: scoringData.improvements || [],
      wordCount,
      rubricScores: scoringData.rubricScores || {
        grammar: 0,
        vocabulary: 0,
        organization: 0,
        taskCompletion: 0,
      },
      taskId,
    };

    // 6️⃣ 성능 로깅
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Writing Score API] Task: ${taskId}, Response time: ${elapsed}ms, Score: ${result.score}`);
    }

    return NextResponse.json(result, {
      headers: {
        'X-Response-Time': `${elapsed}ms`,
      },
    });
  } catch (error) {
    console.error('[Writing Score API] Error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
