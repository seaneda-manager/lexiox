import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { fetchHiNaesinWeaknessStats } from '@/lib/hi-naesin/fetchWeaknessStats';
import { updateDeepCheckAction } from '../actions';
import DeepCheckForm from '../new/_client/DeepCheckForm';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function DeepCheckDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session } = await supabase
    .from('deepcheck_sessions')
    .select('*')
    .eq('id', id)
    .eq('student_id', user.id)
    .maybeSingle();
  if (!session) notFound();

  const stats = await fetchHiNaesinWeaknessStats(supabase, user.id);
  const suggestedWeaknesses = stats.filter((s) => s.accuracyPct < 70).slice(0, 5).map((s) => s.category);
  const suggestedStrengths = [...stats]
    .filter((s) => s.accuracyPct >= 80)
    .sort((a, b) => b.accuracyPct - a.accuracyPct)
    .slice(0, 5)
    .map((s) => s.category);

  const boundAction = updateDeepCheckAction.bind(null, session.id);

  return (
    <main className="mx-auto max-w-lg space-y-6 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/student/deepcheck" className="hover:underline">DeepCheck</Link>
          {' / 세션 준비'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">DeepCheck 준비 내용</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          세션 전까지 자유롭게 수정할 수 있어요.
        </p>
      </header>

      <DeepCheckForm
        initial={{
          coreConcepts: session.core_concepts ?? [],
          weaknesses: session.weaknesses ?? [],
          strengths: session.strengths ?? [],
          englishExplanation: session.english_explanation ?? '',
          skillsCovered: session.skills_covered ?? [],
        }}
        suggestedWeaknesses={suggestedWeaknesses}
        suggestedStrengths={suggestedStrengths}
        action={boundAction}
        submitLabel="저장"
      />
    </main>
  );
}
