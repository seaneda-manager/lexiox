'use client';

import { useState } from 'react';

interface ReviewQuestion {
  id: string;
  number: number;
  stem: string;
  type: string;
  itemType: string;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: any | null;
}

interface ReviewData {
  testId: string;
  testLabel: string;
  stage1: { correct: number; total: number; score: number };
  stage2: { correct: number; total: number; score: number };
  questions: ReviewQuestion[];
}

interface ReviewProgressProps {
  reviewData: ReviewData;
}

const READING_STAGES = [
  { key: 'explanation_read', label: '오답 설명 읽기', step: 1, onlyWrong: true },
  { key: 'evidence_highlight', label: '근거 찾기 (하일라이트)', step: 2 },
  { key: 'interpretation', label: '해석하기', step: 3 },
  { key: 'question_type', label: '문제유형 확인', step: 4 },
  { key: 'choices_interpretation', label: '문제/보기 해석', step: 5 },
];

export function ReadingReviewClient({ reviewData }: ReviewProgressProps) {
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(
    reviewData.questions[0]?.id || ''
  );
  const [currentStage, setCurrentStage] = useState('explanation_read');
  const [loading, setLoading] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string[]>([]);

  const selectedQuestion = reviewData.questions.find(
    (q) => q.id === selectedQuestionId
  );
  const isCorrect = selectedQuestion?.isCorrect ?? false;

  const handleProgressStage = async (nextStageName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/review/reading/add-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: selectedQuestionId,
          stage: nextStageName,
        }),
      });

      if (!response.ok) throw new Error('Failed to save attempt');

      const nextIdx = READING_STAGES.findIndex((s) => s.key === nextStageName);
      if (nextIdx < READING_STAGES.length - 1) {
        setCurrentStage(READING_STAGES[nextIdx + 1].key);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const applicableStages = isCorrect
    ? READING_STAGES.filter((s) => !s.onlyWrong)
    : READING_STAGES;

  if (!selectedQuestion) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          문제가 없습니다
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* 서브헤더 */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Reading 리뷰
        </h2>
        <p className="text-sm text-slate-500">
          {isCorrect ? '정답' : '오답'}에 대해 학습하세요
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="col-span-8 space-y-6">
          {/* 문제 선택기 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">문제 선택</h2>
            <div className="grid grid-cols-10 gap-2">
              {reviewData.questions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuestionId(q.id)}
                  className={`rounded-lg border-2 py-1.5 text-xs font-semibold transition ${
                    selectedQuestionId === q.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {q.number}
                </button>
              ))}
            </div>
          </div>

          {/* 지문 + 문제 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">지문</h3>
            <div className="mb-6 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {selectedQuestion.stem}
            </div>

            <h3 className="mb-3 text-sm font-bold text-slate-900">
              문제 {selectedQuestion.number}
            </h3>
            <div className="mb-4 rounded-lg bg-gray-50 p-3">
              <p className="text-sm text-slate-700">{selectedQuestion.type}</p>
              <p className="text-xs text-slate-500">{selectedQuestion.itemType}</p>
            </div>

            <div className="space-y-2">
              <div className="mb-3">
                <p className="text-sm font-semibold text-slate-700 mb-2">답안:</p>
                <div className={`rounded-lg border-2 p-3 text-sm font-mono ${
                  selectedQuestion.isCorrect
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-rose-500 bg-rose-50 text-rose-700'
                }`}>
                  {selectedQuestion.userAnswer || '(미답)'}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">정답:</p>
                <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-3 text-sm font-mono text-blue-700">
                  {selectedQuestion.correctAnswer}
                </div>
              </div>
            </div>

            {selectedQuestion.explanation && (
              <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-3">
                <p className="text-xs font-semibold text-purple-700 uppercase">설명</p>
                <p className="mt-1 text-sm text-purple-900">{selectedQuestion.explanation}</p>
              </div>
            )}
          </div>

          {/* Stage 진행도 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              리뷰 진행 - {applicableStages.find((s) => s.key === currentStage)?.label}
            </h3>

            <div className="space-y-3 mb-6">
              {applicableStages.map((stage) => {
                const stageIdx = applicableStages.findIndex((s) => s.key === stage.key);
                const currentIdx = applicableStages.findIndex((s) => s.key === currentStage);
                const isCompleted = stageIdx < currentIdx;
                const isCurrent = stage.key === currentStage;

                return (
                  <div
                    key={stage.key}
                    className={`rounded-lg border-2 p-3 ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50'
                        : isCompleted
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                          isCurrent
                            ? 'bg-blue-500 text-white'
                            : isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-300 text-slate-700'
                        }`}
                      >
                        {isCompleted ? '✓' : stage.step}
                      </div>
                      <p className="text-sm font-semibold text-slate-900">{stage.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stage 컨텐츠 */}
            <div className="mb-6 rounded-lg bg-blue-50 p-4">
              <p className="text-center text-sm text-slate-600">
                {applicableStages.find((s) => s.key === currentStage)?.label} 컨텐츠
              </p>
            </div>

            {/* 다음 단계 버튼 */}
            {(() => {
              const currentIdx = applicableStages.findIndex((s) => s.key === currentStage);
              return currentIdx < applicableStages.length - 1 ? (
                <button
                  onClick={() => {
                    const nextStage = applicableStages[currentIdx + 1];
                    handleProgressStage(nextStage.key);
                  }}
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {loading ? '저장 중...' : '다음 단계로 진행'}
                </button>
              ) : (
                <button
                  disabled
                  className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
                >
                  ✓ 이 문제 리뷰 완료!
                </button>
              );
            })()}
          </div>
        </div>

        {/* 사이드바 */}
        <div className="col-span-4 space-y-6">
          {/* 테스트 정보 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">테스트 정보</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600">테스트:</p>
                <p className="font-semibold text-slate-900">{reviewData.testLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-blue-50 p-2">
                  <p className="text-xs text-blue-600">Stage 1</p>
                  <p className="font-bold text-blue-700">
                    {reviewData.stage1.correct}/{reviewData.stage1.total}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-50 p-2">
                  <p className="text-xs text-purple-600">Stage 2</p>
                  <p className="font-bold text-purple-700">
                    {reviewData.stage2.correct}/{reviewData.stage2.total}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 이 문제 상태 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">이 문제</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">상태:</span>
                <span
                  className={`font-semibold ${
                    isCorrect ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {isCorrect ? '✓ 정답' : '✗ 오답'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">문제번호:</span>
                <span className="font-semibold">{selectedQuestion.number}</span>
              </div>
            </div>
          </div>

          {/* 진행도 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">리뷰 진행도</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">문제:</span>
                <span className="font-semibold">
                  {selectedQuestion.number}/{reviewData.questions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">총 오답:</span>
                <span className="font-semibold">
                  {reviewData.questions.filter((q) => !q.isCorrect).length}개
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
