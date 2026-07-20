"use client";

import React, { useState } from "react";

type Props = {
  chapter: {
    id: string;
    title: string;
    content: string;
  };
  onComplete: () => void;
};

export default function JrGrammarLessonStage({ chapter, onComplete }: Props) {
  const [completed, setCompleted] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-2">1단계: 개념 설명</h2>
        <p className="text-sm text-slate-600 mb-6">
          문법 개념을 애니메이션과 함께 학습합니다. 2주 동안 4번 반복하면 완성됩니다.
        </p>

        {/* Chapter Content */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">{chapter.title}</h3>
          <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
            <p>{chapter.content}</p>
          </div>
        </div>

        {/* Interactive Animation Placeholder */}
        <div className="bg-slate-100 rounded-lg p-8 mb-6 text-center">
          <div className="text-6xl mb-4">▶</div>
          <p className="text-slate-600 text-sm">
            애니메이션: 개념 시각화 (추후 구현)
          </p>
        </div>

        {/* Comprehension Check */}
        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
          <h4 className="font-semibold text-emerald-900 mb-3">개념 확인</h4>
          <p className="text-sm text-emerald-800 mb-4">이 개념을 이해했습니까?</p>
          <button
            onClick={() => setCompleted(true)}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700"
          >
            ✓ 이해했습니다
          </button>
        </div>
      </div>

      {completed && (
        <button
          onClick={onComplete}
          className="w-full rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700"
        >
          다음 단계로 (문제 풀이)
        </button>
      )}
    </div>
  );
}
