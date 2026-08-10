import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  draft: { text: '작성 중', cls: 'bg-slate-100 text-slate-500' },
  ready: { text: '준비 완료', cls: 'bg-emerald-100 text-emerald-700' },
  completed: { text: '세션 완료', cls: 'bg-sky-100 text-sky-700' },
};

export default async function DeepCheckListPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: sessions } = await supabase
    .from('deepcheck_sessions')
    .select('id, core_concepts, status, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-lg space-y-6 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">DeepCheck</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            선생님과의 세션 전, 오늘 이야기할 내용을 정리해요.
          </p>
        </div>
        <Link
          href="/student/deepcheck/new"
          className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
        >
          + 새로 준비하기
        </Link>
      </header>

      {(sessions ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          아직 준비한 세션이 없습니다.{' '}
          <Link href="/student/deepcheck/new" className="underline">첫 세션 준비하기</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(sessions ?? []).map((s) => {
            const status = STATUS_LABEL[s.status] ?? STATUS_LABEL.draft;
            const dateStr = new Intl.DateTimeFormat('ko-KR', {
              month: 'numeric', day: 'numeric', weekday: 'short',
            }).format(new Date(s.created_at));
            return (
              <Link
                key={s.id}
                href={`/student/deepcheck/${s.id}`}
                className="block rounded-2xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-neutral-400 mb-1">{dateStr}</p>
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {(s.core_concepts ?? []).slice(0, 3).join(', ') || '(내용 없음)'}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${status.cls}`}>
                    {status.text}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
