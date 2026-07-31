import { getServerSupabase } from '@/lib/supabase/server';
import { WritingReviewClient } from './_client/WritingReviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    sessionId: string;
  };
}

export default async function WritingReviewPage({ params }: PageProps) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>로그인이 필요합니다</div>;
  }

  // Writing 세션 조회
  const { data: session, error } = await supabase
    .from('writing_2026_sessions')
    .select('id, test_id, raw_answers, review_attempts, created_at')
    .eq('id', params.sessionId)
    .eq('user_id', user.id)
    .single();

  if (error || !session) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          세션을 찾을 수 없습니다
        </div>
      </div>
    );
  }

  return <WritingReviewClient sessionId={params.sessionId} initialSession={session} />;
}
