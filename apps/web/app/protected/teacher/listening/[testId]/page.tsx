'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type Result = {
  id: string;
  student_id: string;
  module1_correct_count: number;
  module1_total: number;
  module1_correct_rate: number;
  module2_mode: 'hard' | 'easy';
  module2_correct_count: number;
  module2_total: number;
  combined_correct: number;
  combined_total: number;
  final_score_band: number;
  final_cefr: string;
  created_at: string;
  student?: { email?: string; user_metadata?: any };
};

type Data = {
  test: { id: string; label: string };
  stats: { totalStudents: number; avgBand: string; avgCorrectRate: string };
  results: Result[];
};

export default function TeacherListeningResultsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const res = await fetch(`/api/teacher/listening/results?testId=${testId}`);
        if (!res.ok) throw new Error('Failed to load results');

        const result = await res.json();
        if (result.ok) {
          setData(result);
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        console.error('Error loading results:', err);
        setError('결과를 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [testId]);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">로딩 중...</div>;
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-6xl">
          <Link href="/teacher/dashboard" className="mb-6 text-blue-600 hover:underline">
            ← 대시보드로
          </Link>
          <div className="rounded-lg bg-rose-50 p-6 text-rose-700">{error || '데이터를 찾을 수 없습니다.'}</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-4">
            <Link href="/teacher/dashboard" className="text-sm text-blue-600 hover:underline">
              ← 대시보드로
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">📊 {data.test.label}</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-8">
          <div className="rounded-lg bg-white p-6 shadow-sm border border-blue-100">
            <p className="text-3xl font-bold text-blue-600">{data.stats.totalStudents}</p>
            <p className="mt-2 text-sm text-gray-600">응시 학생</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm border border-indigo-100">
            <p className="text-3xl font-bold text-indigo-600">{data.stats.avgBand}</p>
            <p className="mt-2 text-sm text-gray-600">평균 점수</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm border border-violet-100">
            <p className="text-3xl font-bold text-violet-600">{data.stats.avgCorrectRate}%</p>
            <p className="mt-2 text-sm text-gray-600">평균 정답률</p>
          </div>
        </div>

        {/* Results Table */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">학생</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-600">Module 1</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-600">Module 2</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-600">정답률</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-600">점수</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-600">CEFR</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-600">응시일</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.results.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      응시 결과가 없습니다.
                    </td>
                  </tr>
                ) : (
                  data.results.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {result.student?.email || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {result.module1_correct_count}/{result.module1_total}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs px-2 py-1 rounded ${
                          result.module2_mode === 'hard'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {result.module2_correct_count}/{result.module2_total} ({result.module2_mode})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-medium">
                        {((result.combined_correct / result.combined_total) * 100).toFixed(0)}%
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-indigo-600">
                        {result.final_score_band.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${
                          result.final_cefr === 'C1' ? 'bg-purple-100 text-purple-700' :
                          result.final_cefr === 'B2' ? 'bg-blue-100 text-blue-700' :
                          result.final_cefr === 'B1' ? 'bg-green-100 text-green-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {result.final_cefr}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-xs text-gray-500">
                        {new Date(result.created_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
