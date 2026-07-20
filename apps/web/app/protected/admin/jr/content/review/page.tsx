import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import ContentReviewClient from './_components/ContentReviewClient';

export default async function ContentReviewPage() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  const supabase = await getSupabaseServer();

  // Fetch all AWAITING_REVIEW content
  const [readingResult, grammarResult, listeningResult, speakingResult] = await Promise.all([
    supabase
      .from('jr_reading_passages')
      .select('*')
      .eq('status', 'AWAITING_REVIEW')
      .order('created_at', { ascending: false }),
    supabase
      .from('jr_grammar_chapters')
      .select('*')
      .eq('status', 'AWAITING_REVIEW')
      .order('created_at', { ascending: false }),
    supabase
      .from('jr_listening_sessions')
      .select('*')
      .eq('status', 'AWAITING_REVIEW')
      .order('created_at', { ascending: false }),
    supabase
      .from('jr_speaking_writing_tasks')
      .select('*')
      .eq('status', 'AWAITING_REVIEW')
      .order('created_at', { ascending: false })
  ]);

  const items = [
    ...(readingResult.data || []).map(item => ({ ...item, type: 'reading' })),
    ...(grammarResult.data || []).map(item => ({ ...item, type: 'grammar' })),
    ...(listeningResult.data || []).map(item => ({ ...item, type: 'listening' })),
    ...(speakingResult.data || []).map(item => ({ ...item, type: 'speaking-writing' }))
  ];

  return <ContentReviewClient initialItems={items} />;
}
