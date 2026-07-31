'use client';

import { useState, useEffect } from 'react';
import { LXGymPTRecommendation } from '@/app/protected/student/_components/LXGymPTRecommendation';

interface SpeakingResult {
  id: string;
  test_id: string;
  task_id: string;
  script: string;
  audio_url?: string;
  prompt?: string;
  mode?: string;
  approx_words?: number;
  approx_sentences?: number;
  ai_feedback?: string;
  ai_total_score?: number;
  review_attempts: any[];
  created_at: string;
}

interface ReviewProgressProps {
  resultId: string;
  initialResult: SpeakingResult;
}

const LISTEN_REPEAT_STAGES = [
  { key: 'listen_and_repeat', label: '다시 듣기', step: 1 },
  { key: 'note_taking', label: '노트테이킹', step: 2 },
  { key: 'repeat_recording', label: '따라하기 녹음', step: 3 },
  { key: 'interpretation', label: '해석', step: 4 },
];

const INTERVIEW_STAGES = [
  { key: 'listen_own_answer', label: '자기 답 듣기', step: 1 },
  { key: 'revise', label: '리바이즈', step: 2 },
  { key: 'suggested_template', label: 'Template 적용해 답해보기', step: 3 },
  { key: 'suggested_answer', label: 'Suggested Answer 말하기', step: 4 },
  { key: 'apply_feedback', label: '피드백 적용 연습', step: 5 },
];

export function SpeakingReviewClient({
  resultId,
  initialResult,
}: ReviewProgressProps) {
  const [result, setResult] = useState<SpeakingResult>(initialResult);
  const [loading, setLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState<string>(
    result.task_id?.includes('task1') || result.task_id?.includes('task2')
      ? 'listen_and_repeat'
      : 'listen_own_answer'
  );

  // Task 유형 판별
  const isListenAndRepeat = result.task_id?.includes('task1') || result.task_id?.includes('task2');
  const STAGES = isListenAndRepeat ? LISTEN_REPEAT_STAGES : INTERVIEW_STAGES;

  // Stage 진행
  const handleProgressStage = async (nextStageName: string, data?: any) => {
    setLoading(true);
    try {
      const response = await fetch('/api/review/speaking/add-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultId,
          stage: nextStageName,
          pronunciationErrors: data?.pronunciationErrors || [],
          grammarErrors: data?.grammarErrors || [],
          expressionErrors: data?.expressionErrors || [],
        }),
      });

      if (!response.ok) throw new Error('Failed to save attempt');

      // 결과 재조회
      const reviewResponse = await fetch(
        `/api/review/get-review-data?type=speaking&resultId=${resultId}`
      );
      const reviewData = await reviewResponse.json();

      setResult({
        ...result,
        review_attempts: reviewData.attempts,
      });
      setCurrentStage(nextStageName);
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
          Student / Speaking / 리뷰
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Speaking 리뷰
        </h1>
        <p className="text-sm text-slate-500">
          {isListenAndRepeat
            ? 'Task 1-2 (Listen & Repeat): 발음 개선 연습'
            : 'Task 3-4 (Interview): 답변 개선 및 피드백 적용'}
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="col-span-8 space-y-6">
          {/* Task 정보 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">
              {result.task_id}
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">Prompt</p>
                <p className="mt-1 text-slate-700">{result.prompt}</p>
              </div>
              {result.audio_url && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">원래 답변</p>
                  <audio
                    src={result.audio_url}
                    controls
                    className="mt-2 h-8 w-full"
                  />
                </div>
              )}
              {result.script && (
                <div>
                  <p className="text-xs font-semibold text-slate-500">Transcript</p>
                  <p className="mt-1 text-slate-700 leading-relaxed">
                    {result.script}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stage 진행도 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">
              리뷰 진행 - {STAGES.find((s) => s.key === currentStage)?.label}
            </h2>

            <div className="space-y-3">
              {STAGES.map((stage) => {
                const stageIdx = STAGES.findIndex((s) => s.key === stage.key);
                const currentIdx = STAGES.findIndex((s) => s.key === currentStage);
                const isCompleted = stageIdx < currentIdx;
                const isCurrent = stage.key === currentStage;

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
                      <p className="font-semibold text-slate-900">{stage.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 스테이지별 컨텐츠 */}
            <div className="mt-6 rounded-lg bg-blue-50 p-6">
              <p className="text-center text-sm text-slate-600">
                {STAGES.find((s) => s.key === currentStage)?.label} 컨텐츠가 여기에 표시됩니다
              </p>
            </div>

            {/* 다음 단계 버튼 */}
            {(() => {
              const currentIdx = STAGES.findIndex((s) => s.key === currentStage);
              return currentIdx < STAGES.length - 1 ? (
                <button
                  onClick={() => {
                    const nextStage = STAGES[currentIdx + 1];
                    handleProgressStage(nextStage.key);
                  }}
                  disabled={loading}
                  className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
                >
                  {loading ? '저장 중...' : '다음 단계로 진행'}
                </button>
              ) : (
                <button
                  disabled
                  className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white"
                >
                  ✓ 모든 단계 완료!
                </button>
              );
            })()}
          </div>
        </div>

        {/* 사이드바 */}
        <div className="col-span-4 space-y-6">
          {/* 발음/문법 오류 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">오류 분석</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-500">발음 오류</p>
                <p className="mt-1 text-slate-600">(데이터 로딩 중...)</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">문법 오류</p>
                <p className="mt-1 text-slate-600">(데이터 로딩 중...)</p>
              </div>
            </div>
          </div>

          {/* 진행 통계 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">진행도</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Task 타입:</span>
                <span className="font-semibold">
                  {isListenAndRepeat ? 'Listen & Repeat' : 'Interview'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">현재 단계:</span>
                <span className="font-semibold">
                  {STAGES.findIndex((s) => s.key === currentStage) + 1}/{STAGES.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">리뷰 시도:</span>
                <span className="font-semibold">{result.review_attempts?.length || 0}회</span>
              </div>
            </div>
          </div>

          {/* LXGym PT 추천 */}
          {result.review_attempts && result.review_attempts.length > 0 && (
            <LXGymPTRecommendation
              sectionType="speaking"
              reviewAttempts={result.review_attempts}
              resultId={resultId}
            />
          )}
        </div>
      </div>
    </main>
  );
}
