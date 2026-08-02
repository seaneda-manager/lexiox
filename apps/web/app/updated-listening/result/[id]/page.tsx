import { ListeningReviewClient } from '@/app/protected/student/listening/review/[resultId]/_client/ListeningReviewClient';

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
  correct: number;
  total: number;
  questions: Array<{
    id: string;
    number: number;
    stem: string;
    audioUrl?: string;
    choices: any[];
    type: string;
    itemType: string;
    userAnswer: string | null;
    correctAnswer: string;
    correctChoiceId?: string;
    isCorrect: boolean;
    explanation: any | null;
  }>;
}

export default async function ListeningResultPage({ params }: PageProps) {
  let reviewData: ReviewData | null = null;
  let error: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/updated-listening/result/${params.id}`, {
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
