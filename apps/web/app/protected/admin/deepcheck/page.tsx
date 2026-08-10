import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

const SKILL_LABEL: Record<string, string> = {
  reading: '📖 리딩', listening: '🎧 리스닝', speaking: '🎤 스피킹',
  writing: '✍️ 라이팅', grammar: '📚 문법', vocab: '🔤 어휘',
};

export default async function AdminDeepCheckPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = getServiceSupabase();
  const { data: sessions } = await service
    .from('deepcheck_sessions')
    .select('id, student_id, core_concepts, weaknesses, strengths, english_explanation, skills_covered, status, created_at')
    .in('status', ['ready', 'completed'])
    .order('created_at', { ascending: false })
    .limit(100);

  const studentIds = [...new Set((sessions ?? []).map((s) => s.student_id))];
  const { data: profiles } =
    studentIds.length > 0
      ? await service.from('profiles').select('id, full_name, name, email').in('id', studentIds)
      : { data: [] as { id: string; full_name: string | null; name: string | null; email: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.name || p.email || '이름 미설정']));

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="space-y-2">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4" />
          돌아가기
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">🧠 DeepCheck 준비 현황</h1>
        <p className="text-sm text-gray-600">학생들이 세션 전에 정리한 내용입니다.</p>
      </div>

      {(sessions ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-12 text-center">
          <p className="text-gray-500">아직 준비된 세션이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(sessions ?? []).map((s) => (
            <div key={s.id} className="rounded-lg border bg-white shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{nameById.get(s.student_id)}</span>
                <span className="text-[11px] text-gray-400">
                  {new Date(s.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {(s.skills_covered ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(s.skills_covered ?? []).map((sk: string) => (
                    <span key={sk} className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                      {SKILL_LABEL[sk] ?? sk}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-3 text-xs">
                <div>
                  <p className="font-semibold text-gray-500 mb-1">🎯 중심 개념</p>
                  <p className="text-gray-700">{(s.core_concepts ?? []).join(', ') || '-'}</p>
                </div>
                <div>
                  <p className="font-semibold text-rose-500 mb-1">🔴 약점</p>
                  <p className="text-gray-700">{(s.weaknesses ?? []).join(', ') || '-'}</p>
                </div>
                <div>
                  <p className="font-semibold text-emerald-600 mb-1">🟢 강점</p>
                  <p className="text-gray-700">{(s.strengths ?? []).join(', ') || '-'}</p>
                </div>
              </div>

              {s.english_explanation && (
                <div className="rounded-md border border-sky-100 bg-sky-50 px-3 py-2">
                  <p className="text-[10px] font-semibold text-sky-600 mb-1">🗣️ 영어로 설명해보기</p>
                  <p className="text-xs text-sky-900">{s.english_explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
