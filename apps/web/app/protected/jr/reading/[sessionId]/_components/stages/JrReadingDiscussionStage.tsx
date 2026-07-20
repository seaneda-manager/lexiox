"use client";
import React from "react";

type Props = {
  passage?: { id: string; content: string };
  logs?: any[];
  onSave?: (logs: any[]) => void;
  onComplete: () => void;
};

export default function JrReadingDiscussionStage({ passage, logs, onSave, onComplete }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-4">5단계: 토론</h2>
        <p className="text-sm text-slate-600 mb-6">
          지문에 대한 질문에 글과 음성으로 답변하세요.
        </p>

        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">질문 1: 주인공의 동기는?</h3>
          <textarea
            placeholder="답변을 작성하세요..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3"
            rows={4}
          />
          <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            🎤 음성 녹음
          </button>
        </div>

        <div className="bg-slate-50 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">질문 2: 당신은 이 상황에서 어떻게 할 것인가?</h3>
          <textarea
            placeholder="답변을 작성하세요..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm mb-3"
            rows={4}
          />
          <button className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            🎤 음성 녹음
          </button>
        </div>
      </div>

      <button
        onClick={onComplete}
        className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700"
      >
        학습 완료
      </button>
    </div>
  );
}
