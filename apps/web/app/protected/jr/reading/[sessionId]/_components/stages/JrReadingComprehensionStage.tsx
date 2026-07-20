"use client";
import React from "react";

type Props = {
  passage: { id: string; content: string };
  logs: any[];
  onSave: (logs: any[]) => void;
  onComplete: () => void;
};

export default function JrReadingComprehensionStage({ passage, logs, onSave, onComplete }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-4">4단계: 이해 확인 (Max 3문제)</h2>
        <p className="text-sm text-slate-600 mb-6">
          주제, 빈칸추론, 순서, 어휘, 문법 등 필수 유형의 문제를 풉니다.
        </p>

        {/* Sample Question */}
        <div className="bg-slate-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-slate-900 mb-3">1. 주제</h3>
          <p className="text-sm text-slate-700 mb-4">
            이 지문의 주제로 가장 적절한 것은?
          </p>
          <div className="space-y-2">
            {["A. ...", "B. ...", "C. ...", "D. ...", "E. ..."].map((option, idx) => (
              <label key={idx} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="q1" className="w-4 h-4" />
                <span className="text-sm text-slate-700">{option}</span>
              </label>
            ))}
          </div>
        </div>
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
