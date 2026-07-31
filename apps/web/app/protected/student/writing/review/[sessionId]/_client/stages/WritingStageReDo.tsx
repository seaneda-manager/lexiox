'use client';

import { useState } from 'react';

interface ReDoStageProps {
  itemNum: string;
  originalAnswer: string;
  onComplete: (newAnswer: string) => void;
  loading: boolean;
}

export function WritingStageReDo({
  itemNum,
  originalAnswer,
  onComplete,
  loading,
}: ReDoStageProps) {
  const [newAnswer, setNewAnswer] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  const handleSubmit = () => {
    if (!newAnswer.trim()) {
      alert('답변을 입력해주세요');
      return;
    }
    onComplete(newAnswer);
  };

  return (
    <div className="space-y-6">
      {/* 원래 답변 */}
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-amber-900">
          문항 {itemNum} - 원래 답변
        </h3>
        <div className="rounded-lg bg-white p-4">
          <p className="text-sm text-slate-700 leading-relaxed">
            {originalAnswer || '(입력 없음)'}
          </p>
        </div>
      </div>

      {/* 다시 풀기 */}
      <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-blue-900">
          이번엔 다르게 써보세요
        </h3>
        <textarea
          value={newAnswer}
          onChange={(e) => setNewAnswer(e.target.value)}
          placeholder="설명을 읽은 후 이해한 내용을 바탕으로 다시 작성하세요..."
          className="w-full rounded-lg border border-blue-200 bg-white p-4 text-sm leading-relaxed focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={8}
        />
        <p className="mt-2 text-xs text-slate-500">
          단어: {newAnswer.split(/\s+/).filter(Boolean).length}
        </p>
      </div>

      {/* 비교 */}
      {newAnswer.trim() && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {showComparison ? '▼' : '▶'} 원래 답변과 비교하기
          </button>

          {showComparison && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">원래 답변</p>
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {originalAnswer}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">새로운 답변</p>
                  <div className="rounded-lg bg-blue-50 p-3 text-sm text-slate-700">
                    {newAnswer}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={loading || !newAnswer.trim()}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        {loading ? '저장 중...' : '다음 단계로 진행'}
      </button>
    </div>
  );
}
