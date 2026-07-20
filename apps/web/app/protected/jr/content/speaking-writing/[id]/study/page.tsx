import { getSupabaseServer } from '@/lib/supabaseServer';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect, notFound } from 'next/navigation';
import SpeakingWritingClient from '../../../_components/SpeakingWritingClient';

export default async function SpeakingWritingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getUserAndProfile();
  if (!user) redirect('/login');

  const { id } = await params;
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('jr_speaking_writing_tasks')
    .select('*')
    .eq('id', id)
    .eq('status', 'PUBLISHED')
    .single();

  if (error || !data) notFound();

  return <SpeakingWritingClient task={data} mode="study" />;
}
