import { headers } from 'next/headers';
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
    // 서버 컴포넌트에서 자기 자신의 API를 절대 URL로 호출해야 하므로,
    // 배포 환경마다 달라지는 host를 요청 헤더에서 그대로 읽어 baseUrl을 만든다.
    // (하드코딩된 localhost 폴백은 로컬 밖에서는 항상 실패했다.)
    const headerList = await headers();
    const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
    const protocol = headerList.get('x-forwarded-proto') ?? (host?.includes('localhost') ? 'http' : 'https');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
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

  return <ReadingDrillClient questionData={questionData} resultId={params.resultId} />;
}
