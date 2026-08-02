import { ListeningReviewClient } from './_client/ListeningReviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    resultId: string;
  };
}

interface ReviewData {
  testId: string;
  testLabel: string;
  correctCount: number;
  totalCount: number;
  score: number;
  questions: Array<{
    id: string;
    number: number;
    conversationNumber: number;
    stem: string;
    type: string;
    itemType: string;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: any | null;
  }>;
}

export default async function ListeningReviewPage({ params }: PageProps) {
  let reviewData: ReviewData | null = null;
  let error: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/updated-listening/result/${params.resultId}`, {
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

  return <ListeningReviewClient reviewData={reviewData} />;
}
