import { getServerSupabase } from '@/lib/supabase/server';
import { ListeningReviewClient } from './_client/ListeningReviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    resultId: string;
  };
}

export default async function ListeningReviewPage({ params }: PageProps) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>로그인이 필요합니다</div>;
  }

  // Listening 결과 조회
  const { data: result, error } = await supabase
    .from('listening_results_2026')
    .select('id, test_id, module, difficulty, correct_count, total_questions, answers, review_attempts, created_at')
    .eq('id', params.resultId)
    .eq('user_id', user.id)
    .single();

  if (error || !result) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          결과를 찾을 수 없습니다
        </div>
      </div>
    );
  }

  return <ListeningReviewClient resultId={params.resultId} initialResult={result} />;
}
