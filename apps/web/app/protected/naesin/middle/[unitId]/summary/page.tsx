import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import type { MiddleNaesinUnit, MiddleNaesinContent } from '@/models/middle-naesin';
import { SummaryDocument } from '@/components/middle-naesin/summary/SummaryDocument';

export const dynamic = 'force-dynamic';

// 학생용 직전 공부 요약본. 배정되고 공개된 단원만 보이며, 같은 교재의 5·6과 중 배정된 과를 함께 모은다.
export default async function StudentUnitSummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ lessons?: string; seed?: string }>;
}) {
  const { unitId } = await params;
  const { lessons = '5,6', seed = '1' } = await searchParams;
  const wanted = lessons.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n));
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return notFound();

  const [{ data: base }, { data: assignRows }] = await Promise.all([
    supabase.from('middle_naesin_units').select('*').eq('id', unitId).single(),
    supabase.from('middle_naesin_assignments').select('unit_id').eq('student_id', user.id),
  ]);
  const assigned = new Set((assignRows ?? []).map((a) => a.unit_id as string));
  const b = base as MiddleNaesinUnit | null;
  if (!b || !b.is_published || !assigned.has(b.id)) return notFound();

  let q = supabase
    .from('middle_naesin_units')
    .select('*')
    .eq('publisher', b.publisher)
    .eq('grade', b.grade)
    .eq('semester', b.semester)
    .eq('is_published', true)
    .in('lesson_number', wanted)
    .in('id', [...assigned]);
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
      mode="student"
      units={ordered}
      contents={(contentRows ?? []) as MiddleNaesinContent[]}
      seed={seed}
      gmax={Infinity}
      lessons={lessons}
      backHref="/naesin/middle"
      backLabel="← 단원 목록"
    />
  );
}
