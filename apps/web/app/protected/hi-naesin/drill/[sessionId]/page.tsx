import { notFound, redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import DrillClient from './_components/DrillClient';

export const dynamic = 'force-dynamic';

type Params = Promise<{ sessionId: string }>;
type SearchParams = Promise<{ type?: string; step?: string }>;

const TYPE_ORDER = ['vocab', 'translation', 'fill_blank', 'writing', 'grammar_choice'] as const;

type DrillRow = {
  id: string;
  drill_type: string;
  order_index: number;
  payload: Record<string, unknown>;
};

type ResponseRow = {
  drill_id: string;
  response_text: string | null;
  response_choice: string | null;
  is_correct: boolean | null;
  score_pct: number | null;
  feedback_text: string | null;
};

export default async function HiNaesinDrillPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { sessionId } = await params;
  const { type: typeParam, step: stepStr } = await searchParams;

  const supabase = await getServerSupabase();

  const { data: session } = await supabase
    .from('hi_naesin_sessions')
    .select('id, passage_id, status, assignment_id')
    .eq('id', sessionId)
    .single();

  if (!session) notFound();
  if (session.status === 'submitted') {
    redirect(`/hi-naesin/drill/${sessionId}/complete`);
  }

  const [
    { data: passageData },
    { data: allDrillsRaw },
    { data: allResponsesRaw },
    { data: assignmentData },
  ] = await Promise.all([
    supabase.from('hi_naesin_passages').select('title, passage_text, translation_ko').eq('id', session.passage_id).single(),
    supabase.from('hi_naesin_drills')
      .select('id, drill_type, order_index, payload')
      .eq('passage_id', session.passage_id)
      .order('order_index'),
    supabase.from('hi_naesin_drill_responses')
      .select('drill_id, response_text, response_choice, is_correct, score_pct, feedback_text')
      .eq('session_id', sessionId),
    session.assignment_id
      ? supabase.from('hi_naesin_assignments').select('enabled_drill_types').eq('id', session.assignment_id).single()
      : Promise.resolve({ data: null }),
  ]);

  const allDrills    = (allDrillsRaw ?? []) as DrillRow[];
  const allResponses = (allResponsesRaw ?? []) as ResponseRow[];

  if (allDrills.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-neutral-500">이 지문에 등록된 Drill이 없습니다.</p>
      </main>
    );
  }

  // 타입별 그룹화 (초기 위치 계산용)
  const drillsByType: Record<string, DrillRow[]> = {};
  for (const d of allDrills) {
    if (!drillsByType[d.drill_type]) drillsByType[d.drill_type] = [];
    drillsByType[d.drill_type].push(d);
  }
  const enabledDrillTypes = (assignmentData as any)?.enabled_drill_types as string[] | null ?? null;
  const availableTypes = (TYPE_ORDER as readonly string[]).filter(
    (t) => (drillsByType[t]?.length ?? 0) > 0
      && (enabledDrillTypes === null || enabledDrillTypes.includes(t)),
  );
  const respondedSet = new Set(allResponses.map((r) => r.drill_id));

  const currentType = availableTypes.includes(typeParam ?? '')
    ? (typeParam as string)
    : availableTypes[0];

  const currentDrills = drillsByType[currentType] ?? [];
  const typeTotal     = currentDrills.length;
  const firstUnanswered = currentDrills.findIndex((d) => !respondedSet.has(d.id));
  const defaultStep = firstUnanswered >= 0 ? firstUnanswered : currentDrills.length - 1;
  const initialStep = stepStr !== undefined
    ? Math.max(0, Math.min(parseInt(stepStr, 10) || 0, typeTotal - 1))
    : defaultStep;

  return (
    <DrillClient
      sessionId={sessionId}
      passageTitle={passageData?.title ?? '지문'}
      passageText={passageData?.passage_text ?? ''}
      passageTranslation={passageData?.translation_ko ?? null}
      allDrills={allDrills}
      initialResponses={allResponses}
      initialType={currentType}
      initialStep={initialStep}
      enabledDrillTypes={enabledDrillTypes}
    />
  );
}
