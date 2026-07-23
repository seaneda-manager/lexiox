'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LearningStageLayout from '../components/LearningStageLayout';

export default function LearningStageStudentPage() {
  const params = useParams();
  const router = useRouter();
  const wordId = params.wordId as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 페이지 로드 시 초기화
    setLoading(false);
  }, [wordId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">학습 자료를 불러오고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 p-4">
      <LearningStageLayout
        wordId={wordId}
        onComplete={() => {
          router.push(`/student/learning-stage/progress`);
        }}
      />
    </div>
  );
}
