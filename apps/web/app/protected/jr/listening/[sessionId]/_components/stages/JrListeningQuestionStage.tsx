"use client";
import React from "react";

type Props = {
  audioUrl: string;
  onComplete: () => void;
};

export default function JrListeningQuestionStage({ audioUrl, onComplete }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-2">2단계: 문제 풀이</h2>
        <p className="text-sm text-slate-600 mb-6">음성을 다시 듣고 문제를 풀어보세요.</p>
        <audio controls className="w-full mb-6">
          <source src={audioUrl} type="audio/mpeg" />
        </audio>
        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-slate-900 mb-3">What is the main topic?</h3>
          <div className="space-y-2">
            {["A. ...", "B. ...", "C. ...", "D. ..."].map((opt, i) => (
              <label key={i} className="flex items-center gap-2">
                <input type="radio" name="q1" className="w-4 h-4" />
                <span className="text-sm text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
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
