'use client';

import { useState } from 'react';

interface ReviewData {
  testId: string;
  testLabel: string;
  taskId: string;
  taskType: string;
  taskQuestion: string;
  userScript: string;
  userAudioUrl: string | null;
  userWordCount: number;
  userSentenceCount: number;
  aiFeedback: string;
  aiScore: number;
  modelAnswer: string;
  modelScript: string;
  createdAt: string;
  recordingDuration: number;
}

interface ReviewProgressProps {
  reviewData: ReviewData;
}

const REVIEW_WORKFLOW = [
  {
    key: 'score_review',
    label: '1. AI 점수 확인',
    description: 'AI 점수와 피드백을 확인합니다'
  },
  {
    key: 'listen_own',
    label: '2. 자신의 음성 듣기',
    description: '자신이 녹음한 음성을 재생합니다'
  },
  {
    key: 'model_answer',
    label: '3. 모범 답안 듣기',
    description: '전문가 모범 답안을 듣습니다'
  },
  {
    key: 'script_analysis',
    label: '4. 스크립트 분석',
    description: '발음과 문법을 분석합니다'
  },
  {
    key: 'comparison',
    label: '5. 비교 분석',
    description: '자신의 답과 모범 답을 비교합니다'
  },
  {
    key: 'practice',
    label: '6. 연습하기',
    description: '모범 답안을 따라 말하기 연습'
  },
];

export function SpeakingReviewClient({ reviewData }: ReviewProgressProps) {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const currentStage = REVIEW_WORKFLOW[currentStageIndex];

  const moveToNextStage = () => {
    if (currentStageIndex < REVIEW_WORKFLOW.length - 1) {
      setCurrentStageIndex(currentStageIndex + 1);
    }
  };

  const moveToPrevStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">
          Speaking 리뷰
        </h2>
        <p className="text-sm text-slate-500">
          {currentStage.label} - {currentStage.description}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="col-span-8 space-y-6">
          {/* Task 문제 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">Task {reviewData.taskType}</h3>
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <p className="text-sm text-blue-900">{reviewData.taskQuestion}</p>
            </div>
          </div>

          {/* 단계별 콘텐츠 */}
          {currentStage.key === 'score_review' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900">AI 평가</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                  <p className="text-xs text-green-600 uppercase mb-2">전체 점수</p>
                  <p className="text-3xl font-bold text-green-700">{reviewData.aiScore}</p>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-xs text-blue-600 uppercase mb-2">단어 수</p>
                  <p className="text-2xl font-bold text-blue-700">{reviewData.userWordCount}</p>
                </div>
                <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
                  <p className="text-xs text-purple-600 uppercase mb-2">문장 수</p>
                  <p className="text-2xl font-bold text-purple-700">{reviewData.userSentenceCount}</p>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="text-xs font-bold text-amber-700 uppercase mb-2">피드백</p>
                <p className="text-sm text-amber-900">{reviewData.aiFeedback || 'AI 피드백이 없습니다.'}</p>
              </div>
            </div>
          )}

          {currentStage.key === 'listen_own' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">자신의 음성</h3>
              <div className="rounded-lg bg-purple-50 border border-purple-200 p-6 flex flex-col items-center gap-4">
                <button className="rounded-full bg-purple-600 p-4 text-white hover:bg-purple-700">
                  ▶ 재생 ({reviewData.recordingDuration}초)
                </button>
                <p className="text-xs text-purple-600">음성 재생 기능</p>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-bold text-gray-600 mb-2">당신의 스크립트</p>
                <p className="text-sm text-gray-900 leading-relaxed">{reviewData.userScript}</p>
              </div>
            </div>
          )}

          {currentStage.key === 'model_answer' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">모범 답안</h3>
              <div className="rounded-lg bg-green-50 border border-green-200 p-6 flex flex-col items-center gap-4">
                <button className="rounded-full bg-green-600 p-4 text-white hover:bg-green-700">
                  ▶ 재생 (모범 답안)
                </button>
                <p className="text-xs text-green-600">전문가 음성</p>
              </div>
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-xs font-bold text-gray-600 mb-2">모범 스크립트</p>
                <p className="text-sm text-gray-900 leading-relaxed">{reviewData.modelScript}</p>
              </div>
            </div>
          )}

          {currentStage.key === 'script_analysis' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">스크립트 분석</h3>
              <div className="space-y-4">
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-xs font-bold text-red-700 uppercase mb-2">발음 개선 사항</p>
                  <p className="text-sm text-red-900">자세한 발음 분석은 추후 추가될 예정입니다.</p>
                </div>
                <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                  <p className="text-xs font-bold text-yellow-700 uppercase mb-2">문법 및 표현</p>
                  <p className="text-sm text-yellow-900">문법 체크 기능은 추후 추가될 예정입니다.</p>
                </div>
              </div>
            </div>
          )}

          {currentStage.key === 'comparison' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">비교 분석</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <p className="text-xs font-bold text-rose-700 uppercase mb-3">당신의 답</p>
                  <p className="text-sm text-rose-900 leading-relaxed">{reviewData.userScript}</p>
                </div>
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-bold text-green-700 uppercase mb-3">모범 답</p>
                  <p className="text-sm text-green-900 leading-relaxed">{reviewData.modelScript}</p>
                </div>
              </div>
            </div>
          )}

          {currentStage.key === 'practice' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-bold text-slate-900">쉐도윙 연습</h3>
              <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-6 text-center">
                <p className="text-sm text-cyan-900 mb-4">모범 음성을 듣고 따라 말하기</p>
                <button className="rounded-full bg-cyan-600 p-4 text-white hover:bg-cyan-700">
                  🎤 녹음 시작
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <div className="col-span-4 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">테스트 정보</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600">테스트:</p>
                <p className="font-semibold text-slate-900">{reviewData.testLabel}</p>
              </div>
              <div>
                <p className="text-slate-600">AI 점수:</p>
                <p className="font-semibold text-slate-900">{reviewData.aiScore}점</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">학습 진행도</h3>
            <div className="space-y-2">
              {REVIEW_WORKFLOW.map((stage, idx) => (
                <div
                  key={stage.key}
                  className={`rounded-lg border-2 p-2 text-xs transition ${
                    idx === currentStageIndex
                      ? 'border-blue-500 bg-blue-50'
                      : idx < currentStageIndex
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        idx < currentStageIndex
                          ? 'bg-emerald-500 text-white'
                          : idx === currentStageIndex
                            ? 'bg-blue-500 text-white'
                            : 'bg-slate-300 text-slate-600'
                      }`}
                    >
                      {idx < currentStageIndex ? '✓' : idx + 1}
                    </div>
                    <span className="font-semibold text-slate-900">{stage.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <button
              onClick={moveToPrevStage}
              disabled={currentStageIndex === 0}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              ← 이전
            </button>
            <button
              onClick={moveToNextStage}
              disabled={currentStageIndex === REVIEW_WORKFLOW.length - 1}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
            >
              다음 →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
