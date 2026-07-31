'use client';

import { useState } from 'react';
import { LXGymPTRecommendation } from '@/app/protected/student/_components/LXGymPTRecommendation';

interface ListeningResult {
  id: string;
  test_id: string;
  module: number;
  difficulty: string;
  correct_count: number;
  total_questions: number;
  answers: any[];
  review_attempts: any[];
  created_at: string;
}

interface ReviewProgressProps {
  resultId: string;
  initialResult: ListeningResult;
}

const LISTENING_STAGES = [
  { key: 'listen_again', label: '다시 듣기', step: 1 },
  { key: 'correct_answer', label: '오답 수정', step: 2 },
  { key: 'transcript_study', label: '지문 해석', step: 3 },
  { key: 'shadowing', label: '쉐도윙', step: 4 },
];

// Mock 데이터
const MOCK_AUDIO: Record<string, string> = {
  '1': '(오디오 URL)',
};

const MOCK_TRANSCRIPT: Record<string, string> = {
  '1': 'Professor: Good morning, everyone. Today we\'re going to discuss the impact of climate change on coastal ecosystems. As many of you know, rising sea levels pose a significant threat to communities around the world. But what you might not realize is the equally devastating effect on marine life. For example, coral reefs are particularly vulnerable because they can only survive in narrow temperature ranges...',
};

const MOCK_QUESTIONS: Record<string, { text: string; choices: string[] }> = {
  '1': {
    text: 'What is the main topic of the lecture?',
    choices: [
      'The history of climate change research',
      'The impact of climate change on coastal ecosystems',
      'How to protect marine life from pollution',
      'The economic consequences of rising sea levels',
    ],
  },
};

export function ListeningReviewClient({
  resultId,
  initialResult,
}: ReviewProgressProps) {
  const [result, setResult] = useState<ListeningResult>(initialResult);
  const [selectedQuestion, setSelectedQuestion] = useState('1');
  const [currentStage, setCurrentStage] = useState('listen_again');
  const [loading, setLoading] = useState(false);

  const question = MOCK_QUESTIONS[selectedQuestion];
  const transcript = MOCK_TRANSCRIPT[selectedQuestion];
  const audio = MOCK_AUDIO[selectedQuestion];

  const handleProgressStage = async (nextStageName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/review/listening/add-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultId,
          questionId: selectedQuestion,
          stage: nextStageName,
        }),
      });

      if (!response.ok) throw new Error('Failed to save attempt');

      const reviewResponse = await fetch(
        `/api/review/get-review-data?type=listening&resultId=${resultId}`
      );
      const reviewData = await reviewResponse.json();

      setResult({
        ...result,
        review_attempts: reviewData.attempts,
      });

      const nextIdx = LISTENING_STAGES.findIndex((s) => s.key === nextStageName);
      if (nextIdx < LISTENING_STAGES.length - 1) {
        setCurrentStage(LISTENING_STAGES[nextIdx + 1].key);
      }
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
          Student / Listening / 리뷰
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Listening 리뷰
        </h1>
        <p className="text-sm text-slate-500">
          Module {result.module} - {result.difficulty === 'easy' ? '🟢 Easy' : '🔴 Hard'}
        </p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* 메인 콘텐츠 */}
        <div className="col-span-8 space-y-6">
          {/* 문제 선택기 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">문제 선택</h2>
            <div className="grid grid-cols-10 gap-2">
              {Array.from({ length: result.total_questions }, (_, i) => {
                const qNum = String(i + 1);
                return (
                  <button
                    key={qNum}
                    onClick={() => setSelectedQuestion(qNum)}
                    className={`rounded-lg border-2 py-1.5 text-xs font-semibold transition ${
                      selectedQuestion === qNum
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {qNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 오디오 + 문제 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">음성 듣기</h3>
            <div className="mb-6 rounded-lg bg-slate-100 p-4">
              <p className="text-sm text-slate-600">🔊 {audio}</p>
              <p className="mt-2 text-xs text-slate-500">
                (실제 환경에서는 오디오 플레이어가 표시됩니다)
              </p>
            </div>

            <h3 className="mb-3 text-sm font-bold text-slate-900">문제 {selectedQuestion}</h3>
            <p className="mb-4 text-sm text-slate-700">{question?.text}</p>

            <div className="space-y-2">
              {question?.choices.map((choice, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg border-2 p-3 text-sm ${
                    idx === 1
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <strong>{String.fromCharCode(65 + idx)}.</strong> {choice}
                </div>
              ))}
            </div>
          </div>

          {/* Stage 진행도 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">
              리뷰 진행 - {LISTENING_STAGES.find((s) => s.key === currentStage)?.label}
            </h3>

            <div className="space-y-3 mb-6">
              {LISTENING_STAGES.map((stage) => {
                const stageIdx = LISTENING_STAGES.findIndex((s) => s.key === stage.key);
                const currentIdx = LISTENING_STAGES.findIndex((s) => s.key === currentStage);
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
              {currentStage === 'listen_again' && (
                <p className="text-sm text-slate-700">
                  위의 음성을 다시 듣고, 정답이 무엇인지 생각해보세요.
                </p>
              )}
              {currentStage === 'correct_answer' && (
                <p className="text-sm text-slate-700">
                  틀렸다면, 왜 틀렸는지 생각해보고 정답을 다시 확인하세요.
                </p>
              )}
              {currentStage === 'transcript_study' && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-600">Transcript</p>
                  <div className="rounded-lg bg-white p-3 text-sm leading-relaxed text-slate-700">
                    {transcript}
                  </div>
                </div>
              )}
              {currentStage === 'shadowing' && (
                <p className="text-sm text-slate-700">
                  음성을 다시 듣고, 같은 속도로 따라 말해보세요. (Shadowing)
                </p>
              )}
            </div>

            {/* 다음 단계 버튼 */}
            {(() => {
              const currentIdx = LISTENING_STAGES.findIndex((s) => s.key === currentStage);
              return currentIdx < LISTENING_STAGES.length - 1 ? (
                <button
                  onClick={() => {
                    const nextStage = LISTENING_STAGES[currentIdx + 1];
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
          {/* 정답률 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">정답률</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">정답:</span>
                <span className="text-lg font-bold text-emerald-700">
                  {result.correct_count}/{result.total_questions}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-200">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{
                    width: `${(result.correct_count / result.total_questions) * 100}%`,
                  }}
                />
              </div>
              <p className="text-center text-sm font-semibold text-slate-700">
                {Math.round((result.correct_count / result.total_questions) * 100)}%
              </p>
            </div>
          </div>

          {/* 진행도 */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">리뷰 진행도</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">현재 문제:</span>
                <span className="font-semibold">
                  {selectedQuestion}/{result.total_questions}
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
              sectionType="listening"
              reviewAttempts={result.review_attempts}
              resultId={resultId}
            />
          )}
        </div>
      </div>
    </main>
  );
}
