import { ReadingReviewClient } from '@/app/protected/student/reading/review/[resultId]/_client/ReadingReviewClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

interface ReviewData {
  testId: string;
  testLabel: string;
  stage1: { correct: number; total: number; score: number };
  stage2: { correct: number; total: number; score: number };
  questions: Array<{
    id: string;
    number: number;
    stem: string;
    paragraph?: string;
    blanks?: Array<{ id: string; index: number; correctToken: string }>;
    type: string;
    itemType: string;
    userAnswer: string | null;
    correctAnswer: string;
    isCorrect: boolean;
    explanation: any | null;
  }>;
}

export default async function ReadingResultPage({ params }: PageProps) {
  let reviewData: ReviewData | null = null;
  let error: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/updated-reading/result/${params.id}`, {
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

  return <ReadingReviewClient reviewData={reviewData} />;
}
