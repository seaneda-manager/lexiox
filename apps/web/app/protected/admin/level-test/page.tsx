import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import ReviewPanel from './_client/ReviewPanel';

export const dynamic = 'force-dynamic';

const SECTION_LABEL: Record<string, string> = {
  grammar: '문법', vocab: '어휘', listening: '듣기', reading: '읽기',
};

type ReviewItem = { prompt: string; audioUrl?: string; text?: string };

export default async function AdminLevelTestPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = getServiceSupabase();
  const { data: sessions } = await service
    .from('level_test_sessions')
    .select('id, student_id, status, section_scores, recommended_level, teacher_notes, completed_at')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(50);

  const studentIds = [...new Set((sessions ?? []).map((s) => s.student_id))];
  const { data: profiles } =
    studentIds.length > 0
      ? await service.from('profiles').select('id, full_name, name, email').in('id', studentIds)
      : { data: [] as { id: string; full_name: string | null; name: string | null; email: string | null }[] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.name || p.email || '이름 미설정']));

  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: openResponses } =
    sessionIds.length > 0
      ? await service
          .from('level_test_responses')
          .select('session_id, question_id, response_audio_url, response_text')
          .in('session_id', sessionIds)
          .or('response_audio_url.not.is.null,response_text.not.is.null')
      : { data: [] as { session_id: string; question_id: string; response_audio_url: string | null; response_text: string | null }[] };

  const questionIds = [...new Set((openResponses ?? []).map((r) => r.question_id))];
  const { data: questions } =
    questionIds.length > 0
      ? await service.from('level_test_questions').select('id, prompt, section').in('id', questionIds)
      : { data: [] as { id: string; prompt: string; section: string }[] };
  const questionById = new Map((questions ?? []).map((q) => [q.id, q]));

  const speakingBySession = new Map<string, ReviewItem[]>();
  const writingBySession = new Map<string, ReviewItem[]>();
  for (const r of openResponses ?? []) {
    const q = questionById.get(r.question_id);
    if (!q) continue;
    if (r.response_audio_url) {
      const list = speakingBySession.get(r.session_id) ?? [];
      list.push({ prompt: q.prompt, audioUrl: r.response_audio_url });
      speakingBySession.set(r.session_id, list);
    } else if (r.response_text) {
      const list = writingBySession.get(r.session_id) ?? [];
      list.push({ prompt: q.prompt, text: r.response_text });
      writingBySession.set(r.session_id, list);
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            돌아가기
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">🧭 레벨 테스트 결과</h1>
          <p className="text-sm text-gray-600">완료된 테스트를 검토하고 추천 레벨을 지정하세요.</p>
        </div>
        <Link
          href="/admin/level-test/questions"
          className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          📋 문제은행 관리
        </Link>
      </div>

      {(sessions ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed bg-gray-50 p-12 text-center">
          <p className="text-gray-500">완료된 레벨 테스트가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(sessions ?? []).map((s) => {
            const scores = (s.section_scores ?? {}) as Record<string, number>;
            const speakingItems = speakingBySession.get(s.id) ?? [];
            const writingItems = writingBySession.get(s.id) ?? [];
            return (
              <div key={s.id} className="rounded-lg border bg-white shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{nameById.get(s.student_id)}</span>
                  <span className="text-[11px] text-gray-400">
                    {s.completed_at && new Date(s.completed_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex flex-wrap gap-3 text-xs">
                  {Object.entries(scores).map(([section, pct]) => (
                    <span key={section} className="text-gray-600">
                      {SECTION_LABEL[section] ?? section} <strong className="text-gray-900">{pct}%</strong>
                    </span>
                  ))}
                </div>

                {speakingItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-gray-500">🎤 말하기 녹음</p>
                    {speakingItems.map((item, idx) => (
                      <div key={idx} className="rounded-md border border-gray-100 bg-gray-50 p-2 space-y-1">
                        <p className="text-xs text-gray-600">{item.prompt}</p>
                        {item.audioUrl && <audio controls src={item.audioUrl} className="w-full h-8" />}
                      </div>
                    ))}
                  </div>
                )}

                {writingItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-gray-500">✍️ 쓰기 답안</p>
                    {writingItems.map((item, idx) => (
                      <div key={idx} className="rounded-md border border-gray-100 bg-gray-50 p-2 space-y-1">
                        <p className="text-xs text-gray-600">{item.prompt}</p>
                        <p className="text-xs text-gray-900 whitespace-pre-wrap">{item.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                <ReviewPanel sessionId={s.id} initialLevel={s.recommended_level} initialNotes={s.teacher_notes} />
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
