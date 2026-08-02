import { SpeakingReviewClient } from './_client/SpeakingReviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    resultId: string;
  };
}

interface ReviewData {
  testId: string;
  testLabel: string;
  taskId: string;
  taskType: string;
  taskQuestion: string;
  userScript: string;
  userAudioUrl: string | null;
  userWordCount: number;
  userSentenceCount: number;
  aiFeedback: string;
  aiScore: number;
  modelAnswer: string;
  modelScript: string;
  createdAt: string;
  recordingDuration: number;
}

export default async function SpeakingReviewPage({ params }: PageProps) {
  let reviewData: ReviewData | null = null;
  let error: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/updated-speaking/result/${params.resultId}`, {
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      error = `API Error: ${response.status}`;
    } else {
      reviewData = await response.json();
    }
  } catch (err: any) {
    error = err?.message || 'Failed to fetch review data';
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
