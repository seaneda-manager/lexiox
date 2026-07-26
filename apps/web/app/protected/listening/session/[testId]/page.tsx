"use client";

import { useState, useEffect } from "react";
import ListeningSessionContainer from "../../_components/ListeningSessionContainer";

interface StudentListeningSessionPageProps {
  params: {
    testId: string;
  };
}

export default function StudentListeningSessionPage({
  params,
}: StudentListeningSessionPageProps) {
  const { testId } = params;
  const [testData, setTestData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTestData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch test data from API
        const response = await fetch(
          `/api/student/listening/tests/${testId}`
        );

        if (!response.ok) {
          throw new Error("Failed to load test data");
        }

        const data = await response.json();
        if (!data.ok) {
          throw new Error(data.error || "Failed to load test");
        }

        setTestData(data.payload);
      } catch (err: any) {
        console.error("Error loading test:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTestData();
  }, [testId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-5xl animate-pulse">🎧</div>
          <p className="text-xl text-gray-600">테스트를 불러오는 중...</p>
          <p className="text-sm text-gray-500">잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900">테스트를 불러올 수 없습니다</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.href = "/"}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-xl text-red-600">테스트 데이터를 찾을 수 없습니다</p>
        </div>
      </div>
    );
  }

  return <ListeningSessionContainer testData={testData} testId={testId} />;
}
