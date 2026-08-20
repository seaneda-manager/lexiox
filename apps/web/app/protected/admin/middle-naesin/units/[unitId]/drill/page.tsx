import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { gradeLabel, type MiddleNaesinUnit, type MiddleNaesinContent } from '@/models/middle-naesin';
import { buildDrillSections } from '@/components/middle-naesin/drill/types';
import MiddleNaesinDrillSections from '@/components/middle-naesin/drill/MiddleNaesinDrillSections';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ section?: string; drill?: string }>;
};

export default async function MiddleNaesinAdminDrillPage({ params, searchParams }: Props) {
  const { unitId } = await params;
  const { section, drill } = await searchParams;
  const supabase = await getServerSupabase();

  const [{ data: unit, error: unitErr }, { data: contents }] = await Promise.all([
    supabase.from('middle_naesin_units').select('*').eq('id', unitId).single(),
    supabase
      .from('middle_naesin_contents')
      .select('*')
      .eq('unit_id', unitId)
      .order('sort_order')
      .order('content_type'),
  ]);

  if (unitErr || !unit) notFound();

  const u = unit as MiddleNaesinUnit;
  const items = (contents ?? []) as MiddleNaesinContent[];

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
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-400">
            중학내신 / 드릴 미리보기
          </div>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900">{unitTitle}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/middle-naesin/units/${unitId}`}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            ← 에디터로
          </Link>
          <Link
            href={`/admin/middle-naesin/units/${unitId}/preview`}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            미리보기
          </Link>
        </div>
      </header>

      <MiddleNaesinDrillSections
        unitId={unitId}
        unitTitle={unitTitle}
        drillData={drillData}
        section={section}
        drill={drill}
      />
    </main>
  );
}
