"use client";
import React from "react";

type Props = {
  passage: { id: string; content: string };
  logs: any[];
  onSave: (logs: any[]) => void;
  onComplete: () => void;
};

export default function JrReadingTranslationStage({ passage, logs, onSave, onComplete }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-4">3단계: 지문 해석</h2>
        <p className="text-sm text-slate-600 mb-4">생각 단위별로 직독 직해 및 의역을 작성하세요.</p>
        <textarea
          placeholder="해석을 작성하세요..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          rows={8}
        />
      </div>
      <button
        onClick={onComplete}
        className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700"
      >
        다음 단계로
      </button>
    </div>
  );
}
