import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { payloadToNaesinPassage } from '@/lib/naesin/passageDocToNaesinPassage';
import type {
  DrillStage,
  SentenceStructureLog,
  SentenceCompositionLog,
  SentenceFunctionLog,
} from '@/components/naesin/drill/types';
import type { Stage3TranslationLog } from '@/components/naesin/drill/NaesinDrillShell';
import NaesinDrillSessionClient from './_components/NaesinDrillSessionClient';

export const dynamic = 'force-dynamic';

type Params = Promise<{ sessionId: string }>;

type SessionLogs = {
  currentStage?: DrillStage;
  currentSentenceIndex?: number;
  structureLogs?: SentenceStructureLog[];
  translationLogs?: Stage3TranslationLog[];
  compositionLogs?: SentenceCompositionLog[];
  sentenceFunctionLogs?: SentenceFunctionLog[];
};

export default async function NaesinDrillSessionPage({ params }: { params: Params }) {
  const { sessionId } = await params;
  const supabase = await getServerSupabase();

  const { data: session } = await supabase
    .from('naesin_sessions')
    .select('id, passage_id, status, logs')
    .eq('id', sessionId)
    .single();

  if (!session) notFound();

  if (session.status === 'submitted') {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center space-y-6">
        <div className="text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-neutral-900">이미 제출된 세션입니다</h1>
        <Link
          href="/naesin/drill"
          className="inline-block rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
        >
          목록으로
        </Link>
      </main>
    );
  }

  const { data: passageRow } = await supabase
    .from('naesin_passages')
    .select('payload')
    .eq('id', session.passage_id)
    .single();

  if (!passageRow?.payload) notFound();

  const passage = payloadToNaesinPassage(passageRow.payload);
  if (!passage) notFound();

  const logs = (session.logs ?? {}) as SessionLogs;

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-6 py-8">
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
          내신 / Drill
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">{passage.title}</h1>
      </header>

      <NaesinDrillSessionClient
        sessionId={sessionId}
        passage={passage}
        initialStage={logs.currentStage ?? 'word_analysis'}
        initialSentenceIndex={logs.currentSentenceIndex ?? 0}
        initialStructureLogs={logs.structureLogs ?? []}
        initialTranslationLogs={logs.translationLogs ?? []}
        initialCompositionLogs={logs.compositionLogs ?? []}
        initialSentenceFunctionLogs={logs.sentenceFunctionLogs ?? []}
      />
    </main>
  );
}
