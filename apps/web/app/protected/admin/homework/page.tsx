import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SUBJECT_LABEL: Record<string, string> = {
  vocab:   '어휘/단어',
  grammar: '문법 드릴',
  reading: '리딩 문제',
  mixed:   '복합',
};

export default async function AdminHomeworkPage() {
  const supabase = await getServerSupabase();

  const { data: homeworks } = await supabase
    .from('photo_homework')
    .select('id, title, subject, due_at, is_active, created_at')
    .order('created_at', { ascending: false });

  // 제출 수 집계
  const hwIds = (homeworks ?? []).map((h: any) => h.id as string);
  const { data: submissions } = hwIds.length > 0
    ? await supabase
        .from('photo_homework_submissions')
        .select('homework_id')
        .in('homework_id', hwIds)
    : { data: [] };

  const submCountMap = new Map<string, number>();
  for (const s of (submissions ?? [])) {
    const id = (s as any).homework_id as string;
    submCountMap.set(id, (submCountMap.get(id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">숙제 관리</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            정답지를 업로드하면 학생들이 카메라로 자동 채점받을 수 있습니다.
          </p>
        </div>
        <Link
          href="/admin/homework/new"
          className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
        >
          + 새 숙제
        </Link>
      </header>

      {(homeworks ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          아직 만든 숙제가 없습니다.{' '}
          <Link href="/admin/homework/new" className="underline">첫 숙제 만들기</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(homeworks ?? []).map((hw: any) => {
            const subCount = submCountMap.get(hw.id) ?? 0;
            const dueStr = hw.due_at
              ? new Intl.DateTimeFormat('ko-KR', {
                  month: 'numeric', day: 'numeric', weekday: 'short',
                }).format(new Date(hw.due_at))
              : null;

            return (
              <Link
                key={hw.id}
                href={`/admin/homework/${hw.id}`}
                className="block rounded-2xl border border-neutral-200 bg-white p-5 hover:border-neutral-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      {hw.subject && (
                        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-500">
                          {SUBJECT_LABEL[hw.subject] ?? hw.subject}
                        </span>
                      )}
                      {!hw.is_active && (
                        <span className="rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-400">
                          비활성
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-neutral-900">{hw.title}</p>
                    {dueStr && (
                      <p className="text-xs text-neutral-400 mt-0.5">마감 {dueStr}</p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-neutral-900">{subCount}</p>
                    <p className="text-[11px] text-neutral-400">제출</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
