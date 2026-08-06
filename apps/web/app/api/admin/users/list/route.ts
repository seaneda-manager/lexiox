import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/list
 * 모든 학생 목록 조회 (이름, 이메일)
 */
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // Admin API로 모든 사용자 조회
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('[ListUsers] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      );
    }

    // 필터링 및 변환
    const studentList = (users || [])
      .filter(u => u.user_metadata?.role === 'student' || !u.user_metadata?.role)
      .map(u => ({
        id: u.id,
        name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'Unknown',
        email: u.email || '',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      ok: true,
      students: studentList,
    });
  } catch (err: any) {
    console.error('[ListUsers] ERROR:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
