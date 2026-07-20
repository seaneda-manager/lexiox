import { NextRequest, NextResponse } from 'next/server';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { getSupabaseServer } from '@/lib/supabaseServer';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, profile } = await getUserAndProfile();
    if (!user || profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, reason } = body;
    const id = params.id;

    const supabase = await getSupabaseServer();

    // Determine table name
    let tableName: string;
    switch (type) {
      case 'reading':
        tableName = 'jr_reading_passages';
        break;
      case 'grammar':
        tableName = 'jr_grammar_chapters';
        break;
      case 'listening':
        tableName = 'jr_listening_sessions';
        break;
      case 'speaking-writing':
        tableName = 'jr_speaking_writing_tasks';
        break;
      default:
        return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    // Update status to REJECTED with reason
    const result = await supabase
      .from(tableName)
      .update({
        status: 'REJECTED',
        ai_review: {
          rejection_reason: reason,
          rejected_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (result.error) {
      return NextResponse.json(
        { error: `Database error: ${result.error.message}` },
        { status: 500 }
      );
    }

    console.log(`[Content Rejected] ${type}: ${id} - Reason: ${reason}`);

    return NextResponse.json({
      ok: true,
      message: 'Content rejected and available for regeneration',
      data: result.data
    });
  } catch (error) {
    console.error('[Rejection Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Rejection failed' },
      { status: 500 }
    );
  }
}
