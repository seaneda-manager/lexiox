"use client";
import React from "react";

type Props = {
  onComplete: () => void;
};

export default function JrListeningCheckupStage({ onComplete }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-2">5단계: Checkup (과제)</h2>
        <p className="text-sm text-slate-600 mb-6">다음 수업 때 제출할 과제입니다.</p>
        <div className="bg-emerald-50 rounded-lg p-4 mb-6 border border-emerald-200">
          <h3 className="font-semibold text-emerald-900 mb-2">📝 숙제</h3>
          <p className="text-sm text-emerald-800">
            오늘 배운 표현을 사용하여 3문장 이상 작성하세요.
          </p>
        </div>
        <textarea
          placeholder="숙제를 작성하세요..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-6"
          rows={6}
        />
        <button
          onClick={onComplete}
          className="w-full rounded-lg bg-amber-600 px-6 py-3 text-white font-semibold hover:bg-amber-700"
        >
          학습 완료
        </button>
      </div>
    </div>
  );
}
