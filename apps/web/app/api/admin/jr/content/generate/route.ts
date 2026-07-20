import { NextRequest, NextResponse } from 'next/server';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import {
  generateContentFromTextbook,
  reviewGeneratedContent,
  TextbookInput
} from '@/lib/ai/geminiContentGenerator';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const { user, profile } = await getUserAndProfile();
    if (!user || profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request
    const body: TextbookInput = await request.json();

    // Validate input
    if (!body.title || !body.content || !body.contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, contentType' },
        { status: 400 }
      );
    }

    console.log(`[Content Generation] Starting for: ${body.title}`);

    // Step 1: Generate content with Gemini
    console.log('[Step 1] Generating content with Gemini...');
    const generatedContent = await generateContentFromTextbook(body);

    // Step 2: AI Review
    console.log('[Step 2] AI Review...');
    const reviewResult = await reviewGeneratedContent(
      generatedContent,
      body.contentType
    );

    // Step 3: Save to database with status AWAITING_REVIEW
    console.log('[Step 3] Saving to database...');
    const supabase = await getSupabaseServer();

    const contentData = {
      title: body.title,
      content: JSON.stringify(generatedContent),
      content_type: body.contentType,
      difficulty: body.difficulty,
      level: body.level,
      source_textbook: body.source?.textbook || null,
      source_page: body.source?.page || null,
      ai_score: reviewResult.score,
      ai_review: JSON.stringify(reviewResult),
      status: 'AWAITING_REVIEW',
      created_at: new Date().toISOString()
    };

    let result;

    if (body.contentType === 'reading') {
      result = await supabase
        .from('jr_reading_passages')
        .insert([contentData])
        .select()
        .single();
    } else if (body.contentType === 'grammar') {
      result = await supabase
        .from('jr_grammar_chapters')
        .insert([contentData])
        .select()
        .single();
    } else if (body.contentType === 'listening') {
      result = await supabase
        .from('jr_listening_sessions')
        .insert([contentData])
        .select()
        .single();
    } else if (body.contentType === 'speaking-writing') {
      result = await supabase
        .from('jr_speaking_writing_tasks')
        .insert([contentData])
        .select()
        .single();
    }

    if (result?.error) {
      console.error('Database error:', result.error);
      return NextResponse.json(
        { error: `Database error: ${result.error.message}` },
        { status: 500 }
      );
    }

    console.log(`[Success] Content generated with score: ${reviewResult.score}%`);

    return NextResponse.json({
      ok: true,
      id: result?.data?.id,
      contentPreview: generatedContent,
      reviewScore: reviewResult.score,
      reviewStatus: reviewResult.status,
      reviewNotes: reviewResult.notes,
      status: 'AWAITING_REVIEW'
    });

  } catch (error) {
    console.error('[Content Generation Error]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Content generation failed'
      },
      { status: 500 }
    );
  }
}
