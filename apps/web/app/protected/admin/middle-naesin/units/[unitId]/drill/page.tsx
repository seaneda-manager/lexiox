import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { gradeLabel, type MiddleNaesinUnit, type MiddleNaesinContent } from '@/models/middle-naesin';
import { buildDrillData } from '@/components/middle-naesin/drill/types';
import MiddleNaesinDrillShell from '@/components/middle-naesin/drill/MiddleNaesinDrillShell';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ contentId?: string }>;
};

export default async function MiddleNaesinAdminDrillPage({ params, searchParams }: Props) {
  const { unitId } = await params;
  const { contentId } = await searchParams;
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

  const drillData = buildDrillData(unitId, items, contentId);

  const unitTitle = [
    u.publisher,
    gradeLabel(u.grade),
    `${u.semester}학기`,
    u.lesson_number != null ? `Lesson ${u.lesson_number}` : null,
    u.lesson_title ? `"${u.lesson_title}"` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Content picker (when multiple drillable contents exist)
  const drillableContents = items.filter(
    (c) => c.content_type === 'main_text' || c.content_type === 'dialogue',
  );

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

      {/* Content selector */}
      {drillableContents.length > 1 && (
        <div className="flex flex-wrap gap-2 rounded-2xl border bg-white p-4">
          <span className="self-center text-sm text-neutral-500">드릴할 지문:</span>
          {drillableContents.map((c) => (
            <Link
              key={c.id}
              href={`/admin/middle-naesin/units/${unitId}/drill?contentId=${c.id}`}
              className={[
                'rounded-xl border px-3 py-1.5 text-sm transition',
                c.id === (contentId ?? drillableContents[0]?.id)
                  ? 'border-sky-300 bg-sky-50 text-sky-700 font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-50',
              ].join(' ')}
            >
              {c.title ?? c.content_type}
            </Link>
          ))}
        </div>
      )}

      {drillData ? (
        <MiddleNaesinDrillShell drillData={drillData} unitTitle={unitTitle} />
      ) : (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          드릴할 지문(본문/대화문)이 없습니다.{' '}
          <Link href={`/admin/middle-naesin/units/${unitId}`} className="underline">
            에디터에서 본문을 추가하세요.
          </Link>
        </div>
      )}
    </main>
  );
}
