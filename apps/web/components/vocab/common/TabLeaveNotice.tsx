"use client";

import React from "react";

/** 다른 탭으로 나갔다 돌아왔을 때 표시하는 안내 배너 */
export default function TabLeaveNotice({
  show,
  leaveCount,
  onClose,
}: {
  show: boolean;
  leaveCount: number;
  onClose: () => void;
}) {
  if (!show) return null;
  const penalized = leaveCount >= 2;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center p-3" role="alert">
      <div className="max-w-xl w-full rounded-2xl border border-rose-300 bg-rose-50 px-5 py-4 shadow-lg flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1 text-sm font-semibold text-rose-800 leading-snug">
          {penalized
            ? "화면을 벗어나서 이 단어는 오답으로 처리됐어요. 학습 중에는 이 화면에 머물러 주세요."
            : "다른 화면으로 나갔어요. 한 번 더 나가면 그 단어는 오답 처리돼요."}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
}
