'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface SpeakingResult {
  id: string;
  student_id: string;
  test_id: string;
  audio_urls: Record<string, string>;
  submitted_at: string;
  status: string;
  scores?: {
    task1?: Array<{ item: number; score: number; feedback: string }>;
    task2?: Array<{ item: number; score: number; feedback: string }>;
    overall?: number;
  };
  feedback?: string;
}

export default function TestResultDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [result, setResult] = useState<SpeakingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const { data, error: err } = await supabase
          .from('speaking_test_responses')
          .select('*')
          .eq('id', params.id)
          .single();

        if (err) throw err;
        setResult(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load result');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [params.id, supabase]);

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </main>
    );
  }

  if (error || !result) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="text-red-700">{error || 'Result not found'}</p>
          <Link href="/speaking-2026/results" className="mt-4 inline-block text-red-600 hover:underline">
            ← 목록으로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  const task1Items = result.scores?.task1 || [];
  const task2Items = result.scores?.task2 || [];
  const overallScore = result.scores?.overall;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      {/* 헤더 */}
      <header className="space-y-4">
        <Link href="/speaking-2026/results" className="text-sm text-blue-600 hover:underline">
          ← 결과 목록으로
        </Link>
        <h1 className="text-3xl font-bold text-slate-900">Speaking Test Result</h1>
      </header>

      {/* 총점 카드 */}
      {overallScore !== null && overallScore !== undefined && (
        <div className="rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 p-8 text-center">
          <p className="text-sm text-slate-600 mb-2">Overall Score</p>
          <p className="text-6xl font-bold text-blue-600">{overallScore}</p>
          <p className="text-slate-500 mt-2">/ 100</p>
        </div>
      )}

      {/* 상태 정보 */}
      <div className="rounded-lg border bg-white p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Status:</span>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
            result.status === 'submitted' ? 'bg-amber-100 text-amber-700' :
            result.status === 'scoring' ? 'bg-blue-100 text-blue-700' :
            result.status === 'scored' ? 'bg-emerald-100 text-emerald-700' :
            'bg-purple-100 text-purple-700'
          }`}>
            {result.status === 'submitted' ? '채점 중' :
             result.status === 'scoring' ? '채점 중' :
             result.status === 'scored' ? '완료' : '검토됨'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-600">Submitted:</span>
          <span className="text-sm text-slate-700">
            {new Date(result.submitted_at).toLocaleString('ko-KR')}
          </span>
        </div>
      </div>

      {/* Task 1 결과 */}
      {task1Items.length > 0 && (
        <section className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            Task 1: Listen & Repeat (7 items)
          </h2>

          <div className="space-y-3">
            {task1Items.map((item) => (
              <div key={item.item} className="border-l-4 border-sky-500 bg-sky-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-900">Item {item.item}</p>
                  <p className="text-2xl font-bold text-sky-600">{item.score}</p>
                </div>
                {item.feedback && (
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {item.feedback}
                  </p>
                )}
                {result.audio_urls[`item_${item.item}`] && (
                  <audio
                    controls
                    src={result.audio_urls[`item_${item.item}`]}
                    className="mt-3 w-full"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Task 2 결과 */}
      {task2Items.length > 0 && (
        <section className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-xl font-bold text-slate-900">
            Task 2: Interview (4 items)
          </h2>

          <div className="space-y-3">
            {task2Items.map((item) => (
              <div key={item.item} className="border-l-4 border-violet-500 bg-violet-50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-slate-900">Question {item.item - 7}</p>
                  <p className="text-2xl font-bold text-violet-600">{item.score}</p>
                </div>
                {item.feedback && (
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {item.feedback}
                  </p>
                )}
                {result.audio_urls[`item_${item.item}`] && (
                  <audio
                    controls
                    src={result.audio_urls[`item_${item.item}`]}
                    className="mt-3 w-full"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 전체 피드백 */}
      {result.feedback && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h3 className="font-semibold text-slate-900 mb-2">Overall Feedback</h3>
          <p className="text-slate-700 leading-relaxed">{result.feedback}</p>
        </section>
      )}

      {/* 상태 대기 메시지 */}
      {(result.status === 'submitted' || result.status === 'scoring') && !overallScore && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-amber-900">
            ⏳ 채점이 진행 중입니다. 잠시 후 새로고침하면 결과를 확인할 수 있습니다.
          </p>
        </section>
      )}

      {/* 액션 버튼 */}
      <div className="flex gap-3">
        <Link
          href="/speaking-2026/results"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          목록으로
        </Link>
        <Link
          href="/speaking-2026/test/directions"
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
        >
          다시 시험보기
        </Link>
      </div>
    </main>
  );
}
