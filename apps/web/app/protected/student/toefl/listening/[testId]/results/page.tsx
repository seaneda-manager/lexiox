'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Result = {
  module1: { correctCount: number; totalQuestions: number; correctRate: number };
  module2: { correctCount: number; totalQuestions: number; mode: string };
  combinedCorrect: number;
  combinedTotal: number;
};

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    const data = sessionStorage.getItem(`test-${testId}-results`);
    if (data) {
      const parsed = JSON.parse(data);
      setResult(parsed);

      // Save result to database
      const saveResult = async () => {
        try {
          const res = await fetch('/api/student/listening/submit-result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              testId,
              ...parsed,
            }),
          });

          if (!res.ok) {
            console.error('Failed to save result to database');
          }
        } catch (err) {
          console.error('Error saving result:', err);
        }
      };

      saveResult();
    }
  }, [testId]);

  if (!result) {
    return <div className="flex h-screen items-center justify-center">로딩 중...</div>;
  }

  const correctRate = (result.combinedCorrect / result.combinedTotal) * 100;
  const band = Math.min(6, Math.max(1, Math.round((correctRate / 100) * 6 * 2) / 2));
  const cefr = band >= 5 ? 'C1' : band >= 4.5 ? 'B2' : band >= 3.5 ? 'B1' : 'A2';

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900">📊 시험 결과</h1>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        {/* Score Summary */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white shadow-lg">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">{band.toFixed(1)}</h2>
            <p className="text-lg opacity-90">
              {cefr} · {correctRate.toFixed(0)}% 정답률
            </p>
            <p className="text-sm opacity-75">
              총 {result.combinedCorrect}/{result.combinedTotal} 문제 정답
            </p>
          </div>
        </div>

        {/* Score Table */}
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">구분</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">정답</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-600">정답률</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">Module 1 (라우팅)</td>
                <td className="px-4 py-3 text-center">{result.module1.correctCount}/{result.module1.totalQuestions}</td>
                <td className="px-4 py-3 text-center text-gray-700">
                  {result.module1.correctRate.toFixed(0)}%
                </td>
              </tr>
              <tr className="border-b hover:bg-gray-50 bg-blue-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  Module 2 ({result.module2.mode === 'hard' ? '어려움' : '쉬움'})
                </td>
                <td className="px-4 py-3 text-center">{result.module2.correctCount}/{result.module2.totalQuestions}</td>
                <td className="px-4 py-3 text-center text-gray-700">
                  {((result.module2.correctCount / result.module2.totalQuestions) * 100).toFixed(0)}%
                </td>
              </tr>
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-4">총점</td>
                <td className="px-4 py-4 text-center">{result.combinedCorrect}/{result.combinedTotal}</td>
                <td className="px-4 py-4 text-center text-indigo-700">
                  {correctRate.toFixed(0)}%
                </td>
              </tr>
            </tbody>
            </table>
          </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">Module 1 분석</h3>
            <p className="text-sm text-gray-600">
              {result.module1.correctRate >= 60 ? '✅ Hard Module 2로 진입' : '⭕ Easy Module 2로 진입'}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Module 1 성적이 60% 이상일 때 난이도 높은 Module 2로 진입합니다.
            </p>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">최종 점수</h3>
            <p className="text-lg font-bold text-indigo-600">{band.toFixed(1)} ({cefr})</p>
            <p className="text-xs text-gray-500 mt-2">
              TOEFL iBT 2026 새 점수 체계 (1.0~6.0)
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <Link
            href={`/student/toefl/listening/${testId}/review`}
            className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            📖 오답 리뷰
          </Link>
          <Link
            href="/student/toefl/listening"
            className="rounded-lg border border-gray-200 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            시험 목록으로
          </Link>
        </div>
      </div>
    </main>
  );
}
