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

export default function JrGrammarPracticeStage({ chapter, onComplete }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [points, setPoints] = useState(0);

  const problems = [
    {
      id: 1,
      text: "He ___ to the store yesterday.",
      options: ["go", "goes", "went", "going"],
      correct: 2,
      hint: "과거 시제를 사용합니다",
    },
    {
      id: 2,
      text: "If I ___ rich, I would travel around the world.",
      options: ["was", "were", "am", "been"],
      correct: 1,
      hint: "가정법에서는 were를 사용합니다",
    },
    {
      id: 3,
      text: "She has been studying for 3 hours ___ .",
      options: ["already", "yet", "still", "just"],
      correct: 0,
      hint: "현재완료진행형과 함께 사용할 수 있는 시간 표현입니다",
    },
  ];

  const problem = problems[currentQuestion];

  const handleAnswer = (selectedIdx: number) => {
    if (selectedIdx === problem.correct) {
      setPoints(points + 10);
      alert("✓ 정답입니다!");
    } else {
      alert(`✗ 틀렸습니다. 힌트: ${problem.hint}`);
    }

    if (currentQuestion < problems.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // 모든 문제 완료
      handleComplete();
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-slate-900">2단계: 연습</h2>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{points}</div>
            <div className="text-xs text-slate-600">points</div>
          </div>
        </div>

        <p className="text-sm text-slate-600 mb-6">
          정확한 답을 선택하세요. 3단계 힌트가 제공됩니다.
        </p>

        {/* Progress */}
        <div className="mb-6 text-center text-sm text-slate-600">
          문제 {currentQuestion + 1} / {problems.length}
        </div>

        {/* Question */}
        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <p className="text-lg text-slate-900 leading-relaxed mb-2">
            {problem.text}
          </p>
          <p className="text-xs text-slate-500 italic">
            빈칸에 알맞은 단어를 선택하세요.
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3 mb-6">
          {problem.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              className="w-full text-left p-4 rounded-lg border-2 border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <span className="font-semibold text-slate-900">{option}</span>
            </button>
          ))}
        </div>

        {/* Hint Box */}
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-xs font-semibold text-yellow-900">💡 힌트</p>
          <p className="text-sm text-yellow-800 mt-1">{problem.hint}</p>
        </div>
      </div>
    </div>
  );
}
