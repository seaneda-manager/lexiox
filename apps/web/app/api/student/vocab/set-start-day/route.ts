import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { target_student_id, track_id, start_day_index } = await request.json();

  if (!track_id || !start_day_index || start_day_index < 1) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // 현재 사용자의 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'teacher';

  // target_student_id 결정
  let studentId: string;
  if (target_student_id && isAdmin) {
    // Admin은 다른 학생의 Day 변경 가능
    studentId = target_student_id;
  } else {
    // 학생은 본인의 Day만 변경 가능
    const { data: student } = await supabase
      .from('academy_students')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }
    studentId = student.id;
  }

  // 현재 start_day_index 조회 (학생용: 현재보다 이전만 가능하도록 검증)
  if (!isAdmin) {
    const { data: plan } = await supabase
      .from('student_vocab_plans')
      .select('start_day_index')
      .eq('student_id', studentId)
      .eq('track_id', track_id)
      .maybeSingle();

    if (plan && start_day_index > plan.start_day_index) {
      return NextResponse.json(
        { error: '이전 Day로만 돌아갈 수 있습니다' },
        { status: 400 }
      );
    }
  }

  // student_vocab_plans 업데이트
  const { error } = await supabase
    .from('student_vocab_plans')
    .update({ start_day_index, updated_at: new Date().toISOString() })
    .eq('student_id', studentId)
    .eq('track_id', track_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
