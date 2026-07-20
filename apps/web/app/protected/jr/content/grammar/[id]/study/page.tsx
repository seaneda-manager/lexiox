import { getSupabaseServer } from '@/lib/supabaseServer';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect, notFound } from 'next/navigation';
import GrammarSessionClient from '../../../_components/GrammarSessionClient';

export default async function GrammarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getUserAndProfile();
  if (!user) redirect('/login');

  const { id } = await params;
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('jr_grammar_chapters')
    .select('*')
    .eq('id', id)
    .eq('status', 'PUBLISHED')
    .single();

  if (error || !data) notFound();

  return <GrammarSessionClient chapter={data} mode="study" />;
}
