import { getServerSupabase } from '@/lib/supabase/server';
import type { MiddleNaesinUnit, MiddleNaesinContent } from '@/models/middle-naesin';
import { SummaryDocument } from '@/components/middle-naesin/summary/SummaryDocument';

export const dynamic = 'force-dynamic';

// 관리자용 직전 공부 요약본: 같은 교재·학년·학기의 지정한 과(기본 5·6과)를 한 번에 모아 인쇄한다.
export default async function AdminUnitSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ lessons?: string; seed?: string; gmax?: string }>;
}) {
  const { unitId } = await params;
  const { lessons = '5,6', seed = '1', gmax } = await searchParams;
  const wanted = lessons.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n));
  const supabase = await getServerSupabase();

  const { data: base } = await supabase.from('middle_naesin_units').select('*').eq('id', unitId).single();
  if (!base) return <div className="p-8 text-red-600">단원을 찾을 수 없습니다.</div>;
  const b = base as MiddleNaesinUnit;

  let q = supabase
    .from('middle_naesin_units')
    .select('*')
    .eq('publisher', b.publisher)
    .eq('grade', b.grade)
    .eq('semester', b.semester)
    .in('lesson_number', wanted);
  q = b.school_name ? q.eq('school_name', b.school_name) : q.is('school_name', null);
  const { data: siblings } = await q.order('lesson_number');

  const units = new Map<string, MiddleNaesinUnit>();
  for (const u of (siblings ?? []) as MiddleNaesinUnit[]) units.set(u.id, u);
  units.set(b.id, b);
  const ordered = [...units.values()].sort((x, y) => (x.lesson_number ?? 0) - (y.lesson_number ?? 0));

  const { data: contentRows } = await supabase
    .from('middle_naesin_contents')
    .select('*')
    .in('unit_id', ordered.map((u) => u.id))
    .order('sort_order')
    .order('content_type');

  return (
    <SummaryDocument
      mode="admin"
      units={ordered}
      contents={(contentRows ?? []) as MiddleNaesinContent[]}
      seed={seed}
      gmax={gmax && Number(gmax) > 0 ? Number(gmax) : Infinity}
      lessons={lessons}
      backHref={`/admin/middle-naesin/units/${unitId}`}
      backLabel="← 단원"
    />
  );
}
