import { ReadingDrillClient } from './_client/ReadingDrillClient';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    resultId: string;
    questionId: string;
  };
}

interface ReviewQuestion {
  id: string;
  number: number;
  stem: string;
  paragraph?: string;
  type: string;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
}

export default async function ReadingDrillPage({ params }: PageProps) {
  let questionData: ReviewQuestion | null = null;
  let error: string | null = null;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/updated-reading/result/${params.resultId}`, {
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      error = `API Error: ${response.status}`;
    } else {
      const data = await response.json();
      questionData = data.questions.find((q: any) => q.id === params.questionId) || null;
      if (!questionData) {
        error = 'Question not found';
      }
    }
  } catch (err: any) {
    error = err?.message || 'Failed to fetch question data';
  }

  if (error || !questionData) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error || '문제를 찾을 수 없습니다'}
        </div>
      </div>
    );
  }

  return <ReadingDrillClient questionData={questionData} />;
}
