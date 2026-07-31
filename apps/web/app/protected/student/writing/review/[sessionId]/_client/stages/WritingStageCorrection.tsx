'use client';

import { useState } from 'react';

interface CorrectionStageProps {
  itemNum: string;
  originalAnswer: string;
  feedback: string; // Email 첨삭 피드백
  onComplete: (correctedAnswer: string) => void;
  loading: boolean;
}

export function WritingStageCorrection({
  itemNum,
  originalAnswer,
  feedback,
  onComplete,
  loading,
}: CorrectionStageProps) {
  const [correctedAnswer, setCorrectedAnswer] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSubmit = () => {
    if (!correctedAnswer.trim()) {
      alert('고쳐진 답변을 입력해주세요');
      return;
    }
    onComplete(correctedAnswer);
  };

  return (
    <div className="space-y-6">
      {/* 원래 답변 */}
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">원래 답변</h3>
        <div className="rounded-lg bg-white p-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            {originalAnswer}
          </p>
        </div>
      </div>

      {/* 첨삭 피드백 */}
      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <button
          onClick={() => setShowFeedback(!showFeedback)}
          className="mb-4 flex w-full items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          <span>{showFeedback ? '▼' : '▶'}</span>
          Email 첨삭 내용 보기
        </button>

        {showFeedback && (
          <div className="rounded-lg bg-white p-4 text-sm text-slate-700 leading-relaxed">
            {feedback || '(첨삭 내용 없음)'}
          </div>
        )}
      </div>

      {/* 고쳐진 답변 작성 */}
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-emerald-900">
          첨삭 내용을 반영해서 고쳐쓰세요
        </h3>
        <p className="mb-4 text-xs text-emerald-700">
          💡 Tip: 첨삭 내용을 읽으며 설명을 이해하고, 그에 맞게 수정하세요.
        </p>
        <textarea
          value={correctedAnswer}
          onChange={(e) => setCorrectedAnswer(e.target.value)}
          placeholder="첨삭 내용을 고려하여 수정된 답변을 작성하세요..."
          className="w-full rounded-lg border border-emerald-200 bg-white p-4 text-sm leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          rows={8}
        />
        <p className="mt-2 text-xs text-slate-500">
          단어: {correctedAnswer.split(/\s+/).filter(Boolean).length}
        </p>
      </div>

      {/* 비교 */}
      {correctedAnswer.trim() && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-4 text-sm font-semibold text-slate-900">
            Before vs After
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">원래 답변</p>
              <div className="rounded-lg bg-rose-50 p-3 text-sm text-slate-700">
                {originalAnswer}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold text-slate-500">고쳐진 답변</p>
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-slate-700">
                {correctedAnswer}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={loading || !correctedAnswer.trim()}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        {loading ? '저장 중...' : '다음 단계로 진행'}
      </button>
    </div>
  );
}
