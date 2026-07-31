import { getServerSupabase } from '@/lib/supabase/server';
import { SpeakingReviewClient } from './_client/SpeakingReviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    resultId: string;
  };
}

export default async function SpeakingReviewPage({ params }: PageProps) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div>로그인이 필요합니다</div>;
  }

  // Speaking 결과 조회
  const { data: result, error } = await supabase
    .from('speaking_results_2026')
    .select('id, test_id, task_id, script, audio_url, prompt, mode, approx_words, approx_sentences, ai_feedback, ai_total_score, review_attempts, created_at')
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

  return <SpeakingReviewClient resultId={params.resultId} initialResult={result} />;
}
