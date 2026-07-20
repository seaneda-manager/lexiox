"use client";
import React from "react";

type Props = {
  audioUrl: string;
  transcript: string;
  onComplete: () => void;
};

export default function JrListeningShadowingStage({ audioUrl, transcript, onComplete }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-2">4단계: Shadowing & 표현 연습</h2>
        <p className="text-sm text-slate-600 mb-6">스크립트를 따라 읽으며 발음과 리듬을 익힙니다.</p>
        <audio controls className="w-full mb-6">
          <source src={audioUrl} type="audio/mpeg" />
        </audio>
        <div className="bg-slate-50 rounded-lg p-6 mb-6 text-slate-700 leading-relaxed">
          {transcript}
        </div>
        <div className="space-y-2 mb-6">
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            🎤 따라 읽기 녹음
          </button>
          <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            💬 다른 표현 연습
          </button>
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
