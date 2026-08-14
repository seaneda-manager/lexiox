'use client';

import { useState } from 'react';
import Link from 'next/link';

interface DailyTest {
  id: string;
  date: string;
  title: string;
  sections: Array<{
    name: string;
    questionCount: number;
  }>;
  status: 'not_started' | 'in_progress' | 'completed';
  score?: number;
}

interface PhaseDailyTestsProps {
  studentId: string;
  tests: DailyTest[];
  onTestClick?: (testId: string) => void;
}

export function PhaseDailyTests({
  studentId,
  tests,
  onTestClick,
}: PhaseDailyTestsProps) {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const completedCount = tests.filter(t => t.status === 'completed').length;
  const progressPercent = Math.round((completedCount / tests.length) * 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-900';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓ 완료';
      case 'in_progress':
        return '진행 중';
      default:
        return '미시작';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h2 className="text-2xl font-bold text-blue-900 mb-2">📝 Daily Tests</h2>
        <p className="text-sm text-blue-700 mb-4">
          매일의 TOEFL 테스트를 모두 풀어봅니다. 실제 시험과 동일한 형식과 난이도입니다.
        </p>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">진행률</span>
            <span className="font-semibold text-blue-700">
              {completedCount}/{tests.length} ({progressPercent}%)
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-blue-200 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tests List */}
      <div className="space-y-3">
        {tests.map((test, idx) => (
          <div
            key={test.id}
            className={`rounded-lg border-2 p-4 cursor-pointer transition ${getStatusColor(
              test.status
            )}`}
            onClick={() => {
              setSelectedTest(test.id);
              onTestClick?.(test.id);
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold">{test.title}</h3>
                    <p className="text-xs opacity-75">{test.date}</p>
                  </div>
                </div>

                {/* Sections */}
                <div className="mt-3 ml-11 space-y-1">
                  {test.sections.map((section, sidx) => (
                    <div key={sidx} className="text-sm opacity-75">
                      • {section.name}: {section.questionCount}개 문제
                    </div>
                  ))}
                </div>
              </div>

              {/* Status & Score */}
              <div className="ml-4 text-right">
                <div className="inline-block rounded-full px-3 py-1 bg-opacity-20 bg-current text-xs font-semibold mb-2">
                  {getStatusLabel(test.status)}
                </div>
                {test.score !== undefined && (
                  <p className="text-lg font-bold">{test.score}점</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">
          💡 <strong>팁:</strong> Daily Tests는 매일 진행하는 것이 가장 효과적입니다. 같은 시간대에 푸는 것을 추천합니다.
        </p>
      </div>

      {/* Start Button */}
      {tests.length > 0 && (
        <button
          onClick={() => {
            const nextIncompleteTest = tests.find(
              t => t.status === 'not_started'
            );
            if (nextIncompleteTest) {
              onTestClick?.(nextIncompleteTest.id);
            }
          }}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition"
        >
          {tests.some(t => t.status === 'not_started')
            ? '다음 테스트 시작하기'
            : '모든 테스트를 완료했습니다! 🎉'}
        </button>
      )}
    </div>
  );
}
