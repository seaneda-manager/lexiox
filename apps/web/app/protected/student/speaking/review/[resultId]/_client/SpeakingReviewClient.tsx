'use client';

import { useState } from 'react';

interface ReviewQuestion {
  id: string;
  number: number;
  type: string;
  prompt: string;
  prepTime: number;
  responseTime: number;
  userRecordingUrl?: string;
  modelAnswer: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
}

interface ReviewData {
  testId: string;
  testLabel: string;
  score: number;
  band: string;
  questions: ReviewQuestion[];
}

export function SpeakingReviewClient({ reviewData }: { reviewData: ReviewData }) {
  const [selectedId, setSelectedId] = useState(reviewData.questions[0]?.id || '');
  const [stage, setStage] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const selected = reviewData.questions.find((q) => q.id === selectedId);
  if (!selected) return <div className="p-6 text-rose-700">문제가 없습니다</div>;

  const STAGES = [
    '1. 정답/오답 확인',
    '2. Shadowing',
    '3. 자신의 음성 비교',
    '4. 모범 답변',
    '5. 발음 분석',
    '6. 피드백',
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <h2 className="text-xl font-bold">Speaking 리뷰</h2>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <p className="text-xs font-bold uppercase mb-2">질문</p>
        <div className="grid grid-cols-10 gap-2">
          {reviewData.questions.map((q) => (
            <button
              key={q.id}
              onClick={() => { setSelectedId(q.id); setStage(0); }}
              className={`rounded border-2 py-2 text-xs font-semibold ${
                selectedId === q.id
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {q.isCorrect ? '✓' : '✗'}{q.number}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b overflow-x-auto">
        <div className="flex gap-1 px-6">
          {STAGES.map((s, i) => (
            <button
              key={i}
              onClick={() => setStage(i)}
              className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${
                i === stage
                  ? 'border-b-2 border-blue-500 text-blue-700'
                  : 'text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-8 rounded-lg border border-slate-200 bg-white p-6">
          {/* Stage 0: 정답/오답 확인 */}
          {stage === 0 && (
            <>
              <div className="mb-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
                <p className="text-sm font-bold text-blue-900 mb-2">📝 질문</p>
                <p className="text-sm text-blue-800">{selected.prompt}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-blue-700">
                  <p>⏱️ 준비시간: {selected.prepTime}초</p>
                  <p>🎤 답변시간: {selected.responseTime}초</p>
                </div>
              </div>

              <div className={`rounded-lg p-4 ${selected.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                <p className={`font-bold ${selected.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                  {selected.isCorrect ? '✓ 좋은 답변!' : '✗ 더 개선 필요'}
                </p>
                <p className={`text-sm mt-2 ${selected.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  점수: {selected.score}/10
                </p>
              </div>
            </>
          )}

          {/* Stage 1: Shadowing */}
          {stage === 1 && (
            <>
              <p className="text-sm font-bold mb-3">🎤 Shadowing (모범 답변 따라하기)</p>
              <audio controls className="w-full rounded mb-4" src="data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=" />
              <p className="text-xs text-slate-600">모범 답변을 들으며 따라해보세요</p>
            </>
          )}

          {/* Stage 2: 자신의 음성 비교 */}
          {stage === 2 && (
            <>
              <p className="text-sm font-bold mb-4">🎙️ 자신의 음성 재생</p>
              {selected.userRecordingUrl ? (
                <audio controls className="w-full rounded mb-4" src={selected.userRecordingUrl} />
              ) : (
                <div className="rounded-lg bg-slate-100 p-6 text-center mb-4">
                  <p className="text-sm text-slate-600">❌ 녹음이 없습니다</p>
                </div>
              )}
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`w-full py-2 rounded font-semibold text-sm ${
                  isRecording
                    ? 'bg-red-500 text-white'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isRecording ? '🔴 녹음 중...' : '🎤 재녹음'}
              </button>
            </>
          )}

          {/* Stage 3: 모범 답변 */}
          {stage === 3 && (
            <>
              <p className="text-sm font-bold mb-3">✅ 모범 답변</p>
              <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
                <p className="text-sm text-slate-700 leading-relaxed">{selected.modelAnswer}</p>
              </div>
            </>
          )}

          {/* Stage 4+: 준비 중 */}
          {stage > 3 && (
            <p className="text-slate-600">준비 중...</p>
          )}
        </div>

        <div className="col-span-4 rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-xs font-bold uppercase mb-2">테스트</p>
          <p className="text-sm">{reviewData.testLabel}</p>
          <p className="mt-4 font-bold text-blue-700">
            평점: {reviewData.score}/10 ({reviewData.band})
          </p>
          <div className="mt-4 rounded-lg bg-blue-50 p-3">
            <p className="text-xs font-bold text-blue-700 mb-2">💬 피드백</p>
            <p className="text-xs text-blue-900">{selected.feedback}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
