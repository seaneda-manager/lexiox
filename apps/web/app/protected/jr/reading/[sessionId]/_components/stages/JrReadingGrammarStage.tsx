"use client";

import React, { useState } from "react";

type Props = {
  passage: { id: string; content: string };
  logs: any[];
  onSave: (logs: any[]) => void;
  onComplete: () => void;
};

export default function JrReadingGrammarStage({
  passage,
  logs,
  onSave,
  onComplete,
}: Props) {
  const [notes, setNotes] = useState<string>("");

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-4">2단계: 주요 문법</h2>
        <p className="text-sm text-slate-600 mb-4">
          지문의 주요 문법 요소(수식절, 구 등)를 분석하고 해석 팁을 학습합니다.
        </p>

        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">상대절 (Relative Clause)</h3>
            <p className="text-sm text-slate-700 mb-3">
              지문에서 나타나는 상대절의 패턴을 학습합니다.
            </p>
            <textarea
              placeholder="해석 팁을 작성하세요"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">동명사구 (Gerund Phrase)</h3>
            <p className="text-sm text-slate-700 mb-3">
              동명사구의 역할과 해석 방법을 이해합니다.
            </p>
            <textarea
              placeholder="해석 팁을 작성하세요"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              rows={3}
            />
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
