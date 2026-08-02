import { SpeakingReviewClient } from '@/app/protected/student/speaking/review/[resultId]/_client/SpeakingReviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

interface ReviewData {
  testId: string;
  testLabel: string;
  score: number;
  band: string;
  questions: Array<{
    id: string;
    number: number;
    type: string;
    prompt: string;
    prepTime: number;
    responseTime: number;
    userRecordingUrl?: string;
    modelAnswer: string;
    isCorrect: boolean;
    score: number;
    feedback: string;
  }>;
}

export default async function SpeakingResultPage({ params }: PageProps) {
  let reviewData: ReviewData | null = null;
  let error: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/updated-speaking/result/${params.id}`;
    console.log('[SPEAKING PAGE] Fetching from:', url);

    const response = await fetch(url, {
      cache: 'no-store',
    });

    console.log('[SPEAKING PAGE] Response status:', response.status);

    if (!response.ok) {
      error = `API Error: ${response.status}`;
      const errorText = await response.text();
      console.error('[SPEAKING PAGE] Error response:', errorText);
    } else {
      reviewData = await response.json();
      console.log('[SPEAKING PAGE] Success, data:', reviewData);
    }
  } catch (err: any) {
    error = err?.message || 'Failed to fetch review data';
    console.error('[SPEAKING PAGE] Fetch error:', err);
  }

  if (error || !reviewData) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          결과를 찾을 수 없습니다
        </div>
      </div>
    );
  }

  return <SpeakingReviewClient reviewData={reviewData} />;
}
