import { getSupabaseServer } from '@/lib/supabaseServer';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect, notFound } from 'next/navigation';
import ListeningSessionClient from '../../../_components/ListeningSessionClient';

export default async function ListeningPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getUserAndProfile();
  if (!user) redirect('/login');

  const { id } = await params;
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('jr_listening_sessions')
    .select('*')
    .eq('id', id)
    .eq('status', 'PUBLISHED')
    .single();

  if (error || !data) notFound();

  return <ListeningSessionClient session={data} mode="review" />;
}
