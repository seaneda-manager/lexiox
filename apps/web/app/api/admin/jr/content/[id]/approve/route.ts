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
    const { type } = body;
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

    // Update status to PUBLISHED
    const result = await supabase
      .from(tableName)
      .update({
        status: 'PUBLISHED',
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

    console.log(`[Content Approved] ${type}: ${id}`);

    return NextResponse.json({
      ok: true,
      message: 'Content approved and published',
      data: result.data
    });
  } catch (error) {
    console.error('[Approval Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Approval failed' },
      { status: 500 }
    );
  }
}
