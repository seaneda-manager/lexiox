'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface WritingSession {
  id: string;
  test_id: string;
  raw_answers: Record<string, string>;
  review_attempts: any[];
  created_at: string;
}

interface ReviewProgressProps {
  sessionId: string;
  initialSession: WritingSession;
}

const STAGES = [
  { key: 'explanation_read', label: '설명 읽기', step: 1 },
  { key: 're_do', label: '다시 풀기', step: 2 },
  { key: 'reason_writing', label: '오답 이유 작성', step: 3 },
  { key: 'correction', label: '첨삭 보고 고쳐쓰기', step: 4 },
  { key: 'final_revision', label: '안보고 다시쓰기', step: 5 },
];

export function WritingReviewClient({ sessionId, initialSession }: ReviewProgressProps) {
  const [session, setSession] = useState<WritingSession>(initialSession);
  const [selectedItem, setSelectedItem] = useState<string>('1');
  const [currentStage, setCurrentStage] = useState<string>('explanation_read');
  const [loading, setLoading] = useState(false);

  // 현재 문항에 대한 최신 리뷰 시도 찾기
  const getCurrentReviewProgress = () => {
    const itemAttempts = session.review_attempts.filter(
      (a) => a.itemKey === selectedItem
    );
    return itemAttempts[itemAttempts.length - 1] || null;
  };

  const currentProgress = getCurrentReviewProgress();

  // 다음 스테이지로 진행
  const handleProgressToNextStage = async () => {
    setLoading(true);
    try {
      const currentStageIdx = STAGES.findIndex((s) => s.key === currentStage);
      const nextStage = STAGES[currentStageIdx + 1];

      if (!nextStage) {
        alert('모든 리뷰 단계를 완료했습니다!');
        return;
      }

      // API 호출 - 문법 오류 등을 포함해서 저장
      const response = await fetch('/api/review/writing/add-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          stage: nextStage.key,
          grammarErrors: [], // TODO: 실제 오류 데이터
        }),
      });

      if (!response.ok) throw new Error('Failed to save attempt');

      const data = await response.json();

      // 세션 재조회
      const reviewResponse = await fetch(
        `/api/review/get-review-data?type=writing&sessionId=${sessionId}`
      );
      const reviewData = await reviewResponse.json();

      // UI 업데이트
      setCurrentStage(nextStage.key);
      setSession({
        ...session,
        review_attempts: reviewData.attempts,
      });
    } catch (error) {
      console.error('Error:', error);
      alert('오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      {/* 헤더 */}
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Student / Writing / 리뷰
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Writing 리뷰
        </h1>
        <p className="text-sm text-slate-500">
          1-10번 문항: 설명 읽기 → 다시 풀기 → 오답 이유 → 첨삭 반영 → 최종 작성
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="col-span-8 space-y-6">
          {/* 문항 선택기 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">문항 선택</h2>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }, (_, i) => {
                const itemNum = String(i + 1);
                const isSelected = selectedItem === itemNum;
                return (
                  <button
                    key={itemNum}
                    onClick={() => setSelectedItem(itemNum)}
                    className={`rounded-lg border-2 py-2 text-sm font-semibold transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {itemNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 리뷰 진행 UI */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">
              문항 {selectedItem} - {currentProgress?.stage || '시작'} 단계
            </h2>

            {/* 스테이지 진행 표시 */}
            <div className="mb-6 space-y-4">
              {STAGES.map((stage, idx) => {
                const isCompleted = currentProgress && STAGES.findIndex((s) => s.key === currentProgress.stage) >= idx;
                const isCurrent = currentProgress?.stage === stage.key;

                return (
                  <div
                    key={stage.key}
                    className={`rounded-lg border-2 p-4 ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50'
                        : isCompleted
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          isCurrent
                            ? 'bg-blue-500 text-white'
                            : isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {isCompleted ? '✓' : stage.step}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{stage.label}</p>
                        <p className="text-xs text-slate-500">
                          {isCurrent && '현재 진행 중'}
                          {isCompleted && !isCurrent && '완료됨'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 다음 단계 버튼 */}
            <button
              onClick={handleProgressToNextStage}
              disabled={loading || !currentProgress || STAGES.findIndex((s) => s.key === currentProgress.stage) >= STAGES.length - 1}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              {loading ? '저장 중...' : '다음 단계로 진행'}
            </button>
          </div>
        </div>

        {/* 사이드바 */}
        <div className="col-span-4 space-y-6">
          {/* 오류 분석 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">문법 오류 분석</h2>
            <div className="space-y-3 text-sm">
              <p className="text-slate-500">오류 데이터를 분석 중입니다...</p>
            </div>
          </div>

          {/* 진행도 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">전체 진행도</h2>
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">
                리뷰 시도: {session.review_attempts?.length || 0}회
              </p>
              <p className="text-slate-600">
                현재 단계: {STAGES.find((s) => s.key === currentStage)?.label || '시작'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
