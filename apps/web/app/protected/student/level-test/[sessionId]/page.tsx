import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { getServiceSupabase } from '@/lib/supabase/service';
import TestRunner, { type PublicQuestion } from './_client/TestRunner';

export const dynamic = 'force-dynamic';

const SECTION_ORDER = ['grammar', 'vocab', 'listening', 'reading', 'speaking', 'writing'];
const SECTION_LABEL: Record<string, string> = {
  grammar: '📚 문법', vocab: '🔤 어휘', listening: '🎧 듣기', reading: '📖 읽기', speaking: '🎤 말하기', writing: '✍️ 쓰기',
};
const UNSCORED_SECTIONS = ['speaking', 'writing'];

type PageProps = { params: Promise<{ sessionId: string }> };

export default async function LevelTestSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session } = await supabase
    .from('level_test_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .maybeSingle();
  if (!session) notFound();

  if (session.status === 'completed') {
    const scores = (session.section_scores ?? {}) as Record<string, number>;
    return (
      <main className="mx-auto max-w-lg space-y-6 pb-12">
        <header>
          <div className="text-xs text-neutral-400 mb-1">
            <Link href="/student/level-test" className="hover:underline">레벨 테스트</Link>
            {' / 결과'}
          </div>
          <h1 className="text-xl font-bold text-neutral-900">테스트 결과</h1>
        </header>

        <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
          {SECTION_ORDER.filter((s) => !UNSCORED_SECTIONS.includes(s)).map((section) => {
            const pct = scores[section];
            if (pct === undefined) return null;
            return (
              <div key={section} className="flex items-center gap-3">
                <span className="w-16 flex-shrink-0 text-xs text-neutral-600">{SECTION_LABEL[section]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 flex-shrink-0 text-right text-xs font-semibold text-neutral-700">{pct}%</span>
              </div>
            );
          })}
          {UNSCORED_SECTIONS.map((section) => (
            <div key={section} className="flex items-center gap-3 border-t border-neutral-100 pt-3">
              <span className="w-16 flex-shrink-0 text-xs text-neutral-600">{SECTION_LABEL[section]}</span>
              <span className="text-xs text-neutral-400">선생님 검토 대기 중</span>
            </div>
          ))}
        </div>

        {session.recommended_level ? (
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5 space-y-1">
            <p className="text-xs font-semibold text-violet-600">🎯 추천 레벨</p>
            <p className="text-lg font-bold text-violet-900">{session.recommended_level}</p>
            {session.teacher_notes && <p className="text-sm text-violet-800 whitespace-pre-wrap">{session.teacher_notes}</p>}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 p-5 text-center text-sm text-neutral-400">
            선생님이 결과를 검토하면 추천 레벨이 여기에 표시됩니다.
          </div>
        )}
      </main>
    );
  }

  // ── 진행 중: 문제은행을 service role로 읽고 정답 필드는 절대 클라이언트로 보내지 않는다 ──
  const service = getServiceSupabase();
  const { data: questions } = await service
    .from('level_test_questions')
    .select('id, section, order_index, prompt, passage_text, audio_url, choices')
    .eq('is_active', true)
    .order('order_index', { ascending: true });

  const questionsBySection: Record<string, PublicQuestion[]> = {};
  for (const q of questions ?? []) {
    if (!questionsBySection[q.section]) questionsBySection[q.section] = [];
    questionsBySection[q.section].push(q as PublicQuestion);
  }
  const sectionOrder = SECTION_ORDER.filter((s) => (questionsBySection[s]?.length ?? 0) > 0);

  if (sectionOrder.length === 0) {
    return (
      <main className="mx-auto max-w-lg space-y-6 pb-12">
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          아직 등록된 레벨 테스트 문제가 없습니다.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg space-y-6 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/student/level-test" className="hover:underline">레벨 테스트</Link>
        </div>
        <h1 className="text-xl font-bold text-neutral-900">레벨 테스트</h1>
      </header>

      <TestRunner sessionId={sessionId} questionsBySection={questionsBySection} sectionOrder={sectionOrder} />
    </main>
  );
}
