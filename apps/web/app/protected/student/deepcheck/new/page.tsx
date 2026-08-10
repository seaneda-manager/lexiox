import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { fetchHiNaesinWeaknessStats } from '@/lib/hi-naesin/fetchWeaknessStats';
import { createDeepCheckAction } from '../actions';
import DeepCheckForm from './_client/DeepCheckForm';

export const dynamic = 'force-dynamic';

export default async function NewDeepCheckPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const stats = await fetchHiNaesinWeaknessStats(supabase, user.id);
  const suggestedWeaknesses = stats
    .filter((s) => s.accuracyPct < 70)
    .slice(0, 5)
    .map((s) => s.category);
  const suggestedStrengths = [...stats]
    .filter((s) => s.accuracyPct >= 80)
    .sort((a, b) => b.accuracyPct - a.accuracyPct)
    .slice(0, 5)
    .map((s) => s.category);

  return (
    <main className="mx-auto max-w-lg space-y-6 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/student/deepcheck" className="hover:underline">DeepCheck</Link>
          {' / 새 세션 준비'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">DeepCheck 준비하기</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          선생님과의 세션 전에 오늘 이야기할 내용을 간단히 정리해 보세요.
        </p>
      </header>

      <DeepCheckForm
        suggestedWeaknesses={suggestedWeaknesses}
        suggestedStrengths={suggestedStrengths}
        action={createDeepCheckAction}
        submitLabel="준비 완료"
      />
    </main>
  );
}
