import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { isTestAssigned } from '@/lib/supabase/assignment-guard';
import type { SpeakingTest2026 } from '@/models/speaking-2026';
import SpeakingEditClient from './_client/SpeakingEditClient';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;

export default async function SpeakingEditPage({ params }: { params: Params }) {
  const { id } = await params;
  const supabase = await getServerSupabase();

  const [{ data, error }, assigned] = await Promise.all([
    supabase
      .from('speaking_tests')
      .select('id, label, payload')
      .eq('id', id)
      .maybeSingle(),
    isTestAssigned('speaking', id),
  ]);

  if (error || !data) notFound();

  const test = data.payload as SpeakingTest2026;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Admin / Updated Speaking / 에셋 편집
        </p>
        <h1 className="text-xl font-bold text-slate-900">{data.label}</h1>
        {assigned && (
          <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-white">
            📌 배정됨
          </span>
        )}
      </header>

      <SpeakingEditClient test={test} isLocked={assigned} />
    </main>
  );
}
