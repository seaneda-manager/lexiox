import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const SUBJECT_LABEL: Record<string, string> = {
  vocab:   '어휘/단어',
  grammar: '문법 드릴',
  reading: '리딩 문제',
  mixed:   '복합',
};

export default async function HomeworkBooksPage() {
  const supabase = await getServerSupabase();

  const { data: books } = await supabase
    .from('homework_books')
    .select('id, title, subject, total_units, is_active, level, recommended_grade, created_at')
    .order('created_at', { ascending: false });

  const bookIds = (books ?? []).map((b) => b.id);
  const { data: unitCounts } = bookIds.length > 0
    ? await supabase.from('homework_book_units').select('book_id').in('book_id', bookIds)
    : { data: [] as { book_id: string }[] };
  const { data: planCounts } = bookIds.length > 0
    ? await supabase.from('student_homework_plans').select('book_id').in('book_id', bookIds)
    : { data: [] as { book_id: string }[] };

  const unitCountMap = new Map<string, number>();
  for (const u of unitCounts ?? []) unitCountMap.set(u.book_id, (unitCountMap.get(u.book_id) ?? 0) + 1);
  const planCountMap = new Map<string, number>();
  for (const p of planCounts ?? []) planCountMap.set(p.book_id, (planCountMap.get(p.book_id) ?? 0) + 1);

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-400 mb-1">
            <Link href="/admin/homework" className="hover:underline">숙제 관리</Link>
            {' / 교재'}
          </div>
          <h1 className="text-xl font-bold text-neutral-900">교재별 정기 숙제</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            교재를 등록하고 학생별로 배정하면, 스케줄에 따라 숙제가 자동으로 생성됩니다.
          </p>
        </div>
        <Link
          href="/admin/homework/books/new"
          className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
        >
          + 새 교재
        </Link>
      </header>

      {(books ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          아직 등록된 교재가 없습니다.{' '}
          <Link href="/admin/homework/books/new" className="underline">첫 교재 등록하기</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(books ?? []).map((b) => (
            <Link
              key={b.id}
              href={`/admin/homework/books/${b.id}`}
              className="block rounded-2xl border border-neutral-200 bg-white p-5 hover:border-neutral-400 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    {b.subject && (
                      <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-500">
                        {SUBJECT_LABEL[b.subject] ?? b.subject}
                      </span>
                    )}
                    {!b.is_active && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-400">비활성</span>
                    )}
                    {b.level && (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] text-violet-600">{b.level}</span>
                    )}
                    {b.recommended_grade && (
                      <span className="text-[11px] text-neutral-400">{b.recommended_grade}</span>
                    )}
                  </div>
                  <h2 className="text-sm font-semibold text-neutral-900">{b.title}</h2>
                </div>
                <div className="shrink-0 text-right text-[11px] text-neutral-400">
                  <p>유닛 {unitCountMap.get(b.id) ?? 0}개</p>
                  <p>배정 학생 {planCountMap.get(b.id) ?? 0}명</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
