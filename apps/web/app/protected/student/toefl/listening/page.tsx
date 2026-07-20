'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

type ListeningTest = {
  id: string;
  label: string;
  is_locked: boolean;
  updated_at: string;
  payload: any;
};

export default function ListeningPage() {
  const router = useRouter();
  const [tests, setTests] = useState<ListeningTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTests = async () => {
      try {
        const res = await fetch('/api/student/listening/tests');
        if (!res.ok) throw new Error('Failed to fetch tests');

        const data = await res.json();
        if (data.ok) {
          setTests(data.tests || []);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        console.error('Error loading tests:', err);
        setError('시험을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadTests();
  }, []);

  const startTest = (testId: string) => {
    router.push(`/student/toefl/listening/${testId}/soundcheck`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <div className="border-b bg-white px-6 py-6 shadow-sm">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🎧 Listening</h1>
              <p className="mt-1 text-sm text-gray-600">TOEFL 2026 리스닝 시험</p>
            </div>
            <Link
              href="/student/dashboard"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              ← 대시보드
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Info Cards */}
        <div className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow-sm border border-blue-100">
            <p className="text-3xl font-bold text-blue-600">📊</p>
            <h3 className="mt-2 font-semibold text-gray-900">구조</h3>
            <p className="mt-1 text-xs text-gray-600">Module 1 (라우팅) + Module 2 (적응형)</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm border border-indigo-100">
            <p className="text-3xl font-bold text-indigo-600">⏱️</p>
            <h3 className="mt-2 font-semibold text-gray-900">시간</h3>
            <p className="mt-1 text-xs text-gray-600">총 약 29분 (Module 1 + 2)</p>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-sm border border-violet-100">
            <p className="text-3xl font-bold text-violet-600">🎯</p>
            <h3 className="mt-2 font-semibold text-gray-900">목표</h3>
            <p className="mt-1 text-xs text-gray-600">1.0~6.0 점수 (CEFR)</p>
          </div>
        </div>

        {/* Tests */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">📝 시험 선택</h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-rose-50 p-6 text-sm text-rose-700 border border-rose-200">
              {error}
            </div>
          ) : tests.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-12 text-center">
              <p className="text-gray-500">아직 배정된 시험이 없습니다.</p>
              <p className="mt-2 text-xs text-gray-400">선생님에게 시험 배정을 요청해주세요.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => (
                <div
                  key={test.id}
                  className="group rounded-xl bg-white p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-300 transition"
                >
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg truncate">
                        {test.label || 'Untitled Test'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {test.updated_at ? new Date(test.updated_at).toLocaleDateString('ko-KR') : '-'}
                      </p>
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>🎧</span>
                        <span>완전한 적응형 시험</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>📋</span>
                        <span>Module 1 + Module 2</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>⏱️</span>
                        <span>약 29분</span>
                      </div>
                    </div>

                    {/* Button */}
                    <button
                      onClick={() => startTest(test.id)}
                      className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition group-hover:shadow-md"
                    >
                      🚀 시험 시작
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="mt-12 rounded-lg bg-blue-50 p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">💡 시험 팁</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✓ 조용한 환경에서 시험을 진행해주세요</li>
            <li>✓ 마이크와 스피커를 미리 확인해주세요</li>
            <li>✓ Module 1의 성적에 따라 Module 2 난이도가 결정됩니다</li>
            <li>✓ 한 번 답을 제출하면 수정할 수 없습니다</li>
            <li>✓ 시험을 완료한 후 오답을 분석해보세요</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
