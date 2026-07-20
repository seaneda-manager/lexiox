import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SUBJECT_LABEL: Record<string, string> = {
  vocab:   '어휘/단어',
  grammar: '문법 드릴',
  reading: '리딩 문제',
  mixed:   '복합',
};

export default async function StudentHomeworkPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // 활성 숙제 목록
  const { data: homeworks } = await supabase
    .from('photo_homework')
    .select('id, title, description, subject, due_at, created_at')
    .eq('is_active', true)
    .order('due_at', { ascending: true, nullsFirst: false });

  // 이 학생의 제출 현황
  const hwIds = (homeworks ?? []).map((h: any) => h.id as string);
  const { data: submissions } = hwIds.length > 0
    ? await supabase
        .from('photo_homework_submissions')
        .select('homework_id, correct_count, total_count, graded_at')
        .eq('student_id', user.id)
        .in('homework_id', hwIds)
    : { data: [] };

  const submissionMap = new Map(
    (submissions ?? []).map((s: any) => [s.homework_id as string, s]),
  );

  return (
    <main className="mx-auto max-w-2xl space-y-6 pb-12">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">숙제</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          사진을 찍어 제출하면 AI가 자동으로 채점합니다.
        </p>
      </header>

      {(homeworks ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          배정된 숙제가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {(homeworks ?? []).map((hw: any) => {
            const sub = submissionMap.get(hw.id);
            const isDone = !!sub;
            const scorePct = sub && sub.total_count > 0
              ? Math.round((sub.correct_count / sub.total_count) * 100)
              : null;

            const dueStr = hw.due_at
              ? new Intl.DateTimeFormat('ko-KR', {
                  month: 'numeric', day: 'numeric',
                  weekday: 'short',
                }).format(new Date(hw.due_at))
              : null;

            return (
              <div
                key={hw.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      {hw.subject && (
                        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-500">
                          {SUBJECT_LABEL[hw.subject] ?? hw.subject}
                        </span>
                      )}
                      {dueStr && (
                        <span className="text-[11px] text-neutral-400">
                          마감 {dueStr}
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-semibold text-neutral-900">
                      {hw.title}
                    </h2>
                    {hw.description && (
                      <p className="text-xs text-neutral-400 mt-0.5 line-clamp-2">
                        {hw.description}
                      </p>
                    )}
                  </div>

                  {isDone && scorePct !== null ? (
                    <div className="shrink-0 text-right">
                      <p className={[
                        'text-xl font-black',
                        scorePct >= 80 ? 'text-emerald-600'
                        : scorePct >= 60 ? 'text-amber-500'
                        : 'text-red-500',
                      ].join(' ')}>
                        {scorePct}%
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {sub!.correct_count}/{sub!.total_count}개
                      </p>
                    </div>
                  ) : isDone ? (
                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-700">
                      제출 완료
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] text-amber-700">
                      미제출
                    </span>
                  )}
                </div>

                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/student/homework/${hw.id}/submit`}
                    className={[
                      'flex-1 rounded-xl py-2 text-center text-xs font-semibold transition',
                      isDone
                        ? 'border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700',
                    ].join(' ')}
                  >
                    {isDone ? '다시 제출' : '📷 채점 시작'}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
