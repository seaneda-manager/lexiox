export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { generateCompleteWordsWithAI, validateCompleteWords } from '@/lib/utils/generateCompleteWords';
import { validateProblemQuality } from '@/lib/utils/validateProblemQuality';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/problem-bank/generate-complete-words
 *
 * Complete Words 문제 자동 생성 후 Problem Bank에 저장
 *
 * Request:
 * {
 *   "passage": "We know from drawings...",
 *   "topic": "Prehistoric People",
 *   "difficulty": "easy" | "core" | "hard"
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "problem": {
 *     "id": "cw-uuid",
 *     "topic": "Prehistoric People",
 *     "passage": "...",
 *     "blanks": [...]
 *   }
 * }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passage, topic, difficulty } = body as {
      passage: string;
      topic: string;
      difficulty: 'easy' | 'core' | 'hard';
    };

    // 검증
    if (!passage || !topic || !difficulty) {
      return NextResponse.json(
        {
          ok: false,
          error: 'passage, topic, and difficulty are required',
        },
        { status: 400 }
      );
    }

    if (!['easy', 'core', 'hard'].includes(difficulty)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'difficulty must be easy, core, or hard',
        },
        { status: 400 }
      );
    }

    console.log('[GenerateCW] Generating for topic:', topic);

    // AI로 생성
    const generatedProblem = await generateCompleteWordsWithAI({
      passage,
      topic,
      difficulty,
    });

    // 검증
    const validation = validateCompleteWords(generatedProblem);
    if (!validation.valid) {
      console.warn('[GenerateCW] Validation failed:', validation.errors);
      return NextResponse.json(
        {
          ok: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // DB에 저장
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: savedProblem, error: saveError } = await supabase
      .from('problem_bank_complete_words_2026')
      .insert({
        topic: generatedProblem.topic,
        difficulty: generatedProblem.difficulty,
        passage: generatedProblem.passage,
        paragraph_html: `<p>${generatedProblem.passage}</p>`, // 간단한 HTML 변환
        blanks: generatedProblem.blanks,
        created_by: user.id,
      })
      .select()
      .single();

    if (saveError) {
      console.error('[GenerateCW] Save error:', saveError);
      return NextResponse.json(
        { ok: false, error: 'Failed to save problem' },
        { status: 500 }
      );
    }

    console.log('[GenerateCW] ✅ Saved problem:', savedProblem.id);

    // QA 검증
    const qaResult = validateProblemQuality({
      type: 'complete_words',
      blanks: savedProblem.blanks,
    });

    return NextResponse.json({
      ok: true,
      problem: {
        id: savedProblem.id,
        topic: savedProblem.topic,
        difficulty: savedProblem.difficulty,
        passage: savedProblem.passage,
        blanks: savedProblem.blanks,
        metadata: generatedProblem.metadata,
      },
      qa: {
        valid: qaResult.valid,
        score: qaResult.score,
        issues: qaResult.issues,
        warnings: qaResult.warnings,
      },
    });
  } catch (err: any) {
    console.error('[GenerateCW] ERROR:', err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}
