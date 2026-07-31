'use client';

import { useState } from 'react';

interface ExplanationStageProps {
  itemNum: string;
  itemKey: string;
  explanation: string; // 오답 설명
  corePoints: string[]; // core point들 (예: ['subject-verb agreement', 'tense'])
  onComplete: () => void;
  loading: boolean;
}

export function WritingStageExplanation({
  itemNum,
  itemKey,
  explanation,
  corePoints,
  onComplete,
  loading,
}: ExplanationStageProps) {
  const [reveledPoints, setRevealedPoints] = useState<Set<number>>(new Set());
  const [allComprehended, setAllComprehended] = useState(false);

  const handleRevealPoint = (idx: number) => {
    const newRevealed = new Set(reveledPoints);
    newRevealed.add(idx);
    setRevealedPoints(newRevealed);
  };

  const handleAllComprehended = () => {
    // 모든 core point를 봐야 완료 가능
    if (reveledPoints.size === corePoints.length) {
      setAllComprehended(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* 설명 제목 */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-900">
          문항 {itemNum} - 오답 설명 읽기
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          {explanation}
        </p>
      </div>

      {/* Core Points */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">
          핵심 포인트 ({reveledPoints.size}/{corePoints.length})
        </h3>

        <div className="space-y-3">
          {corePoints.map((point, idx) => {
            const isRevealed = reveledPoints.has(idx);

            return (
              <div
                key={idx}
                className="rounded-lg border border-slate-200 p-4"
              >
                {isRevealed ? (
                  <p className="text-sm font-semibold text-slate-900">
                    {idx + 1}. {point}
                  </p>
                ) : (
                  <button
                    onClick={() => handleRevealPoint(idx)}
                    className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                  >
                    클릭해서 {idx + 1}번 포인트 확인하기
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 이해 확인 */}
      {reveledPoints.size === corePoints.length && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={allComprehended}
              onChange={(e) => setAllComprehended(e.target.checked)}
              className="mt-1 h-5 w-5"
            />
            <span className="text-sm font-semibold text-emerald-900">
              위의 설명과 핵심 포인트를 충분히 이해했습니다. 다음 단계로 진행합니다.
            </span>
          </label>
        </div>
      )}

      {/* 다음 단계 버튼 */}
      <button
        onClick={onComplete}
        disabled={
          loading ||
          reveledPoints.size !== corePoints.length ||
          !allComprehended
        }
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-300"
      >
        {loading ? '저장 중...' : '다음 단계로 진행'}
      </button>

      {/* 진행 상황 */}
      <p className="text-center text-xs text-slate-500">
        {reveledPoints.size === corePoints.length && allComprehended
          ? '✅ 준비 완료! 다음 단계로 진행하세요.'
          : `${Math.min(reveledPoints.size + 1, corePoints.length)}/${corePoints.length}개 포인트 확인`}
      </p>
    </div>
  );
}
