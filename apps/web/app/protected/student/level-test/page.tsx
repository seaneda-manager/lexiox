import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { startLevelTestSessionAction } from './actions';

export const dynamic = 'force-dynamic';

const SECTION_LABEL: Record<string, string> = {
  grammar: '문법', vocab: '어휘', listening: '듣기', reading: '읽기',
};

export default async function LevelTestListPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: sessions } = await supabase
    .from('level_test_sessions')
    .select('id, status, section_scores, recommended_level, started_at, completed_at')
    .eq('student_id', user.id)
    .order('started_at', { ascending: false });

  const inProgress = (sessions ?? []).find((s) => s.status === 'in_progress');

  return (
    <main className="mx-auto max-w-lg space-y-6 pb-12">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">레벨 테스트</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          문법·어휘·듣기·읽기·말하기를 종합적으로 평가해 지금 레벨과 다음 교재를 추천받아요.
        </p>
      </header>

      {inProgress ? (
        <Link
          href={`/student/level-test/${inProgress.id}`}
          className="block rounded-2xl bg-amber-500 py-3 text-center text-sm font-semibold text-white hover:bg-amber-600"
        >
          진행 중인 테스트 이어하기 →
        </Link>
      ) : (
        <form action={startLevelTestSessionAction}>
          <button
            type="submit"
            className="w-full rounded-2xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            + 새 레벨 테스트 시작
          </button>
        </form>
      )}

      {(sessions ?? []).filter((s) => s.status === 'completed').length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">이전 결과</h2>
          {(sessions ?? [])
            .filter((s) => s.status === 'completed')
            .map((s) => {
              const scores = (s.section_scores ?? {}) as Record<string, number>;
              const dateStr = s.completed_at
                ? new Intl.DateTimeFormat('ko-KR', { month: 'numeric', day: 'numeric' }).format(new Date(s.completed_at))
                : '';
              return (
                <Link
                  key={s.id}
                  href={`/student/level-test/${s.id}`}
                  className="block rounded-2xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] text-neutral-400 mb-1">{dateStr}</p>
                      <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                        {Object.entries(scores).map(([section, pct]) => (
                          <span key={section}>{SECTION_LABEL[section] ?? section} {pct}%</span>
                        ))}
                      </div>
                    </div>
                    {s.recommended_level && (
                      <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-600">
                        {s.recommended_level}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
        </div>
      )}
    </main>
  );
}
