import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import VocabAssignClient from './_client/VocabAssignClient';

export const dynamic = 'force-dynamic';

export default async function VocabAssignPage() {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // 권한 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin' && profile?.role !== 'teacher') {
    redirect('/student/home');
  }

  // 학생 목록 조회
  const { data: students } = await supabase
    .from('academy_students')
    .select('id, user_id, full_name')
    .order('full_name');

  // Vocab plans
  const { data: plans } = await supabase
    .from('student_vocab_plans')
    .select(\
      id,
      student_id,
      track_id,
      start_day_index,
      vocab_tracks (
        id,
        title,
        day_count
      )
    \);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">📚 단어 회차 관리</h1>
      <p className="text-gray-600 mb-8">학생의 단어 학습 시작 회차를 조정합니다.</p>

      <VocabAssignClient
        students={students || []}
        plans={plans || []}
      />
    </div>
  );
}
