'use client';

import { useState } from 'react';

interface FinalRevisionStageProps {
  itemNum: string;
  originalAnswer: string;
  onComplete: (finalAnswer: string) => void;
  loading: boolean;
}

export function WritingStageFinalRevision({
  itemNum,
  originalAnswer,
  onComplete,
  loading,
}: FinalRevisionStageProps) {
  const [finalAnswer, setFinalAnswer] = useState('');
  const [showOriginal, setShowOriginal] = useState(false);

  const handleSubmit = () => {
    if (!finalAnswer.trim()) {
      alert('최종 답변을 입력해주세요');
      return;
    }
    onComplete(finalAnswer);
  };

  return (
    <div className="space-y-6">
      {/* 안내 */}
      <div className="rounded-3xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-purple-900">
          최종 검증 단계
        </h3>
        <p className="text-sm text-purple-800 leading-relaxed">
          설명과 피드백을 모두 학습했습니다. <strong>이제 어떤 도움 없이</strong> 원래 질문에 대해 최종적으로 답변하세요.
        </p>
        <p className="mt-3 text-xs text-purple-700">
          💡 이 단계에서는 설명, 첨삭, 이전 답변을 보지 않고 작성하는 것이 중요합니다!
        </p>
      </div>

      {/* 최종 답변 작성 */}
      <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-indigo-900">
          최종 답변 (아무것도 보지 않고 작성)
        </h3>
        <textarea
          value={finalAnswer}
          onChange={(e) => setFinalAnswer(e.target.value)}
          placeholder="설명을 다 읽고 학습한 내용을 바탕으로, 완전히 새로운 마음으로 다시 작성하세요..."
          className="w-full rounded-lg border border-indigo-200 bg-white p-4 text-sm leading-relaxed focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          rows={10}
        />
        <p className="mt-2 text-xs text-slate-500">
          단어: {finalAnswer.split(/\s+/).filter(Boolean).length}
        </p>
      </div>

      {/* 비교 (선택) */}
      {finalAnswer.trim() && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <button
            onClick={() => setShowOriginal(!showOriginal)}
            className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {showOriginal ? '▼' : '▶'} 원래 답변과 비교하기
          </button>

          {showOriginal && (
            <div className="space-y-4">
              <p className="text-xs font-semibold text-slate-600">
                (참고용 - 이 화면은 최종 제출 후에 자세히 분석됩니다)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    처음 답변
                  </p>
                  <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {originalAnswer}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    최종 답변
                  </p>
                  <div className="rounded-lg bg-indigo-50 p-3 text-sm text-slate-700">
                    {finalAnswer}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 완료 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={loading || !finalAnswer.trim()}
        className="w-full rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700 disabled:bg-slate-300"
      >
        {loading ? '저장 중...' : '✓ 이 문항 리뷰 완료'}
      </button>

      {/* 완료 후 안내 */}
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
        <p>
          ✅ 이 문항의 리뷰를 완료했습니다. 다른 문항을 선택하여 계속 진행할 수 있습니다.
        </p>
      </div>
    </div>
  );
}
