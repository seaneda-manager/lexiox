import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import AddUnitForm from './_client/AddUnitForm';
import BulkUnitsForm from './_client/BulkUnitsForm';
import AssignPlanForm from './_client/AssignPlanForm';
import PlanRow from './_client/PlanRow';
import UnitRow from './_client/UnitRow';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function HomeworkBookDetailPage({ params }: PageProps) {
  const { id: bookId } = await params;
  const supabase = await getServerSupabase();

  const { data: book } = await supabase
    .from('homework_books')
    .select('id, title, subject')
    .eq('id', bookId)
    .maybeSingle();
  if (!book) notFound();

  const { data: units } = await supabase
    .from('homework_book_units')
    .select('id, unit_index, title, answer_key_data')
    .eq('book_id', bookId)
    .order('unit_index', { ascending: true });

  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, name, email')
    .eq('role', 'student')
    .order('full_name', { ascending: true });

  const { data: plans } = await supabase
    .from('student_homework_plans')
    .select('id, student_id, weekdays, units_per_session, cursor_unit_index, is_paused, start_date')
    .eq('book_id', bookId);

  const studentNameById = new Map(
    (students ?? []).map((s) => [s.id, s.full_name || s.name || s.email || '이름 미설정']),
  );

  const { data: generatedCounts } = await supabase
    .from('photo_homework')
    .select('plan_id')
    .eq('book_id', bookId);
  const generatedCountByPlan = new Map<string, number>();
  for (const r of generatedCounts ?? []) {
    if (!r.plan_id) continue;
    generatedCountByPlan.set(r.plan_id, (generatedCountByPlan.get(r.plan_id) ?? 0) + 1);
  }

  const totalUnits = units?.length ?? 0;

  return (
    <main className="mx-auto max-w-3xl space-y-6 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/admin/homework/books" className="hover:underline">교재</Link>
          {' / '}{book.title}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">{book.title}</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          유닛 {totalUnits}개
          {totalUnits > 0 && ` · 정답 미입력 ${(units ?? []).filter((u) => ((u.answer_key_data as any)?.items?.length ?? 0) === 0).length}개`}
        </p>
      </header>

      {/* 배정된 학생들 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">배정된 학생</h2>
        {(plans ?? []).length === 0 ? (
          <p className="text-sm text-neutral-400">아직 배정된 학생이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {(plans ?? []).map((p) => (
              <PlanRow
                key={p.id}
                bookId={bookId}
                plan={p}
                studentName={studentNameById.get(p.student_id) ?? '이름 미설정'}
                totalUnits={totalUnits}
                generatedCount={generatedCountByPlan.get(p.id) ?? 0}
              />
            ))}
          </div>
        )}
      </section>

      {/* 학생 배정 */}
      <AssignPlanForm bookId={bookId} students={(students ?? []).map((s) => ({
        id: s.id,
        name: studentNameById.get(s.id) ?? '이름 미설정',
      }))} />

      {/* 유닛 목록 */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">유닛 목록</h2>
        {(units ?? []).length === 0 ? (
          <p className="text-sm text-neutral-400">아직 등록된 유닛이 없습니다. 아래에서 추가하세요.</p>
        ) : (
          <div className="space-y-2">
            {(units ?? []).map((u) => (
              <UnitRow key={u.id} bookId={bookId} unit={u as any} />
            ))}
          </div>
        )}
      </section>

      {/* 구조 일괄 등록 + 유닛 추가 */}
      <BulkUnitsForm bookId={bookId} nextUnitIndex={totalUnits + 1} />
      <AddUnitForm bookId={bookId} nextUnitIndex={totalUnits + 1} />
    </main>
  );
}
