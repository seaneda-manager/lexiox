"use client";
import React from "react";

type Props = {
  transcript: string;
  onComplete: () => void;
};

export default function JrListeningScriptReviewStage({ transcript, onComplete }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-2">3단계: 스크립트 확인</h2>
        <p className="text-sm text-slate-600 mb-6">정답을 확인하고 스크립트를 읽어보세요.</p>
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <p className="text-slate-700 leading-relaxed">{transcript}</p>
        </div>
        <button
          onClick={onComplete}
          className="w-full rounded-lg bg-amber-600 px-6 py-3 text-white font-semibold hover:bg-amber-700"
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
}
