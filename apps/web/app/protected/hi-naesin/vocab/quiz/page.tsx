import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import type { VocabPayload } from '@/models/hi-naesin/drill';
import VocaQuizClient from './VocaQuizClient';

export const dynamic = 'force-dynamic';

export default async function HiNaesinVocaQuizPage() {
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: assignments } = await supabase
    .from('hi_naesin_assignments')
    .select('passage_id')
    .eq('student_id', user.id);

  const assignedPassageIds = [...new Set((assignments ?? []).map((a) => a.passage_id))];

  const words =
    assignedPassageIds.length > 0
      ? await supabase
          .from('hi_naesin_drills')
          .select('id, payload')
          .eq('drill_type', 'vocab')
          .in('passage_id', assignedPassageIds)
      : { data: [] };

  const quizWords = ((words.data ?? []) as { id: string; payload: VocabPayload }[])
    .map((d) => ({
      id: d.id,
      word: d.payload.word ?? '',
      meaningKo: d.payload.meaningKo ?? '',
      isExpression: d.payload.isExpression ?? false,
    }))
    .filter((w) => w.word && w.meaningKo);

  return (
    <main className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-400">
            <Link href="/hi-naesin" className="hover:underline">내신 Drill</Link>
            {' / '}
            <Link href="/hi-naesin/vocab" className="hover:underline">내신 단어</Link>
            {' / 문제 풀기'}
          </div>
          <h1 className="mt-0.5 text-xl font-bold text-neutral-900">단어 문제 풀기</h1>
        </div>
        <Link
          href="/hi-naesin/vocab"
          className="rounded-xl border px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
        >
          단어 목록으로
        </Link>
      </header>

      {quizWords.length < 4 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          문제를 풀려면 단어가 4개 이상 필요합니다.{' '}
          <Link href="/hi-naesin/vocab" className="underline">단어 목록으로</Link>
        </div>
      ) : (
        <VocaQuizClient words={quizWords} />
      )}
    </main>
  );
}
