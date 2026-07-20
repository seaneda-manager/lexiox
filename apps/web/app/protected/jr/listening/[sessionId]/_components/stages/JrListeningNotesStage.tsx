"use client";
import React from "react";

type Props = {
  audioUrl: string;
  onComplete: () => void;
};

export default function JrListeningNotesStage({ audioUrl, onComplete }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-2">1단계: 듣기 & 노트 작성</h2>
        <p className="text-sm text-slate-600 mb-6">음성을 듣고 핵심 내용을 노트에 작성하세요.</p>
        <audio controls className="w-full mb-6">
          <source src={audioUrl} type="audio/mpeg" />
        </audio>
        <textarea
          placeholder="핵심 내용을 노트하세요..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          rows={8}
        />
        <button
          onClick={onComplete}
          className="w-full mt-6 rounded-lg bg-amber-600 px-6 py-3 text-white font-semibold hover:bg-amber-700"
        >
          다음 단계로
        </button>
      </div>
    </div>
  );
}
