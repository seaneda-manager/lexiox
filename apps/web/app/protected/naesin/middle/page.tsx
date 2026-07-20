import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { gradeLabel, type MiddleNaesinUnit } from '@/models/middle-naesin';

export const dynamic = 'force-dynamic';

export default async function MiddleNaesinStudentPage() {
  const supabase = await getServerSupabase();

  const { data: units } = await supabase
    .from('middle_naesin_units')
    .select('*')
    .eq('is_published', true)
    .order('grade')
    .order('semester')
    .order('lesson_number');

  const items = (units ?? []) as MiddleNaesinUnit[];

  // Group by grade
  const byGrade = new Map<string, MiddleNaesinUnit[]>();
  for (const u of items) {
    if (!byGrade.has(u.grade)) byGrade.set(u.grade, []);
    byGrade.get(u.grade)!.push(u);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      <header>
        <div className="text-xs uppercase tracking-wide text-neutral-400">중학 내신</div>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">단원 드릴</h1>
        <p className="mt-1 text-sm text-neutral-500">학습할 단원을 선택하세요.</p>
      </header>

      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          아직 공개된 단원이 없습니다.
        </div>
      )}

      {[...byGrade.entries()].map(([grade, gradeUnits]) => (
        <section key={grade} className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-semibold text-sky-700">
              {gradeLabel(grade as 'M1' | 'M2' | 'M3')}
            </span>
            <div className="h-px flex-1 bg-neutral-100" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {gradeUnits.map((u) => (
              <Link
                key={u.id}
                href={`/naesin/middle/${u.id}/drill`}
                className="group rounded-2xl border bg-white p-5 transition hover:border-sky-200 hover:shadow-sm"
              >
                <div className="text-xs text-neutral-400">
                  {u.publisher} · {u.semester}학기
                  {u.lesson_number != null ? ` · Lesson ${u.lesson_number}` : ''}
                </div>
                {u.lesson_title && (
                  <div className="mt-1 text-base font-semibold text-neutral-800 group-hover:text-sky-700">
                    {u.lesson_title}
                  </div>
                )}
                {u.school_name && (
                  <div className="mt-0.5 text-xs text-neutral-400">{u.school_name}</div>
                )}
                <div className="mt-3 text-xs font-medium text-sky-500">드릴 시작 →</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
