import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { gradeLabel, type MiddleNaesinUnit, type MiddleNaesinContent } from '@/models/middle-naesin';
import { buildDrillSections } from '@/components/middle-naesin/drill/types';
import MiddleNaesinDrillSections from '@/components/middle-naesin/drill/MiddleNaesinDrillSections';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ section?: string; drill?: string }>;
};

export default async function MiddleNaesinStudentDrillPage({ params, searchParams }: Props) {
  const { unitId } = await params;
  const { section, drill } = await searchParams;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: unit, error: unitErr }, { data: contents }, { data: assignment }] = await Promise.all([
    supabase.from('middle_naesin_units').select('*').eq('id', unitId).single(),
    supabase
      .from('middle_naesin_contents')
      .select('*')
      .eq('unit_id', unitId)
      .order('sort_order')
      .order('content_type'),
    supabase
      .from('middle_naesin_assignments')
      .select('id')
      .eq('unit_id', unitId)
      .eq('student_id', user.id)
      .maybeSingle(),
  ]);

  if (unitErr || !unit) notFound();
  if (!assignment) notFound();

  const u = unit as MiddleNaesinUnit;
  const items = (contents ?? []) as MiddleNaesinContent[];

  // Only show published units to students
  if (!u.is_published) notFound();

  const drillData = buildDrillSections(unitId, items);

  const unitTitle = [
    u.publisher,
    gradeLabel(u.grade),
    `${u.semester}학기`,
    u.lesson_number != null ? `Lesson ${u.lesson_number}` : null,
    u.lesson_title ? `"${u.lesson_title}"` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-400">
            중학 내신 드릴
          </div>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900">{unitTitle}</h1>
        </div>
        <Link
          href="/naesin/middle"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          ← 단원 목록
        </Link>
      </header>

      <MiddleNaesinDrillSections
        unitId={unitId}
        unitTitle={unitTitle}
        drillData={drillData}
        section={section}
        drill={drill}
        basePath={`/naesin/middle/${unitId}/drill`}
      />
    </main>
  );
}
