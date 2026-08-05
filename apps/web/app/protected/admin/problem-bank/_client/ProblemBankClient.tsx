'use client';

import { useState } from 'react';

type ProblemType = 'complete_words' | 'daily_life' | 'academic_passage';
type Difficulty = 'easy' | 'core' | 'hard';

interface RecentProblem {
  id: string;
  topic: string;
  difficulty: Difficulty;
  created_at: string;
  source_test_id: string | null;
}

interface Stats {
  totalCompleteWords: number;
  totalDailyLife: number;
  totalAcademicPassage: number;
  total: number;
}

export default function ProblemBankClient({ stats, recentProblems }: { stats: Stats; recentProblems: RecentProblem[] }) {
  const [activeTab, setActiveTab] = useState<ProblemType>('complete_words');
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const TABS: { id: ProblemType; label: string; icon: string; count: number }[] = [
    { id: 'complete_words', label: '완성형', icon: '✏️', count: stats.totalCompleteWords },
    { id: 'daily_life', label: '일상', icon: '💬', count: stats.totalDailyLife },
    { id: 'academic_passage', label: '학술', icon: '📖', count: stats.totalAcademicPassage },
  ];

  const handleMigration = async () => {
    if (!confirm('🔄 기존 모든 Reading/Listening 테스트를 Problem Bank로 마이그레이션하시겠습니까?\n\n이 작업은 몇 분 걸릴 수 있습니다.')) {
      return;
    }

    setMigrating(true);
    setError(null);
    setMigrationResult(null);

    try {
      const res = await fetch('/api/admin/problem-bank/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? 'Migration failed');

      setMigrationResult(data.summary);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 마이그레이션 섹션 */}
      <div className="rounded-lg border bg-gradient-to-r from-emerald-50 to-teal-50 p-6 shadow-sm border-emerald-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-emerald-900">🔄 벌크 마이그레이션</h2>
            <p className="text-xs text-emerald-700 mt-1">기존 Reading/Listening 테스트에서 모든 문제를 Problem Bank로 추출</p>
          </div>
          <button
            onClick={handleMigration}
            disabled={migrating}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {migrating ? '마이그레이션 중…' : '지금 실행'}
          </button>
        </div>

        {migrationResult && (
          <div className="mt-4 rounded-lg bg-white p-4 border border-emerald-200">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-gray-600">처리된 테스트</p>
                <p className="text-lg font-bold text-gray-900">{migrationResult.total_tests_processed}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">추출된 문제</p>
                <p className="text-lg font-bold text-gray-900">{migrationResult.total_problems_extracted}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">완성형</p>
                <p className="text-lg font-bold text-sky-600">{migrationResult.by_type?.complete_words ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">일상 / 학술</p>
                <p className="text-lg font-bold text-amber-600">
                  {(migrationResult.by_type?.daily_life ?? 0) + (migrationResult.by_type?.academic_passage ?? 0)}
                </p>
              </div>
            </div>
            <p className="text-xs text-emerald-700 mt-3">✅ 마이그레이션 완료! 페이지를 새로고침하면 통계가 업데이트됩니다.</p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg bg-rose-50 p-3 border border-rose-200">
            <p className="text-xs text-rose-700">❌ 오류: {error}</p>
          </div>
        )}
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon} {tab.label}
              <span className="ml-2 text-xs font-normal text-gray-500">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* 최근 문제 목록 */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="px-6 py-4 border-b">
          <h3 className="text-sm font-semibold text-gray-900">최근 추가된 문제 (완성형)</h3>
          <p className="text-xs text-gray-600 mt-1">Problem Bank의 최신 10개 문제</p>
        </div>

        <div className="divide-y">
          {recentProblems.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-600">아직 추출된 문제가 없습니다</p>
              <p className="text-xs text-gray-500 mt-1">Reading/Listening 테스트를 생성하거나 마이그레이션을 실행해주세요</p>
            </div>
          ) : (
            recentProblems.map((problem) => (
              <div key={problem.id} className="px-6 py-4 hover:bg-gray-50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{problem.topic}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          problem.difficulty === 'easy'
                            ? 'bg-green-100 text-green-800'
                            : problem.difficulty === 'core'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {problem.difficulty === 'easy' ? '쉬움' : problem.difficulty === 'core' ? '중간' : '어려움'}
                      </span>
                      {problem.source_test_id && (
                        <span className="text-xs text-gray-500">
                          출처: <code className="font-mono">{problem.source_test_id.slice(0, 8)}...</code>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{new Date(problem.created_at).toLocaleDateString('ko-KR')}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 정보 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs text-blue-700">
          💡 <strong>Problem Bank</strong>는 Reading/Listening 테스트에서 자동으로 추출된 문제 저장소입니다.
        </p>
        <ul className="text-xs text-blue-600 mt-2 space-y-1 ml-5 list-disc">
          <li>새로운 테스트 생성 시 자동으로 추출</li>
          <li>Daily Test 생성의 문제 소스</li>
          <li>벌크 마이그레이션으로 기존 테스트 일괄 처리 가능</li>
        </ul>
      </div>
    </div>
  );
}
