import { getSupabaseServer } from '@/lib/supabaseServer';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect, notFound } from 'next/navigation';
import ReadingSessionClient from '../../../_components/ReadingSessionClient';

export default async function ReadingStudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getUserAndProfile();
  if (!user) redirect('/login');

  const { id } = await params;
  const supabase = await getSupabaseServer();

  const { data, error } = await supabase
    .from('jr_reading_passages')
    .select('*')
    .eq('id', id)
    .eq('status', 'PUBLISHED')
    .single();

  if (error || !data) notFound();

  return (
    <ReadingSessionClient
      passage={data}
      mode="study"
    />
  );
}
