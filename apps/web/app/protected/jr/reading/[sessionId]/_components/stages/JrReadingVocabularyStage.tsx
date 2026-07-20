"use client";

import React, { useState } from "react";
import { saveVocabularyLogAction } from "../../actions";

type Props = {
  passage: {
    id: string;
    content: string;
  };
  logs: any[];
  onSave: (logs: any[]) => void;
  onComplete: () => void;
};

export default function JrReadingVocabularyStage({
  passage,
  logs,
  onSave,
  onComplete,
}: Props) {
  const [highlightedWords, setHighlightedWords] = useState<Set<string>>(
    new Set(logs.map((l) => l.word_text))
  );
  const [showWordDetail, setShowWordDetail] = useState<string | null>(null);

  const handleHighlightWord = async (word: string) => {
    if (highlightedWords.has(word)) {
      highlightedWords.delete(word);
    } else {
      highlightedWords.add(word);
      // 단어 정보 모달 열기
      setShowWordDetail(word);
    }
    setHighlightedWords(new Set(highlightedWords));
  };

  const handleCompleteStage = async () => {
    await onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow">
        <h2 className="text-xl font-bold text-slate-900 mb-4">1단계: 단어 책업</h2>
        <p className="text-sm text-slate-600 mb-4">
          모르는 단어를 클릭해서 표시하세요. 품사, 뜻, 해석 요령이 제시됩니다.
        </p>

        {/* Passage Display */}
        <div className="bg-slate-50 rounded-lg p-6 leading-relaxed text-slate-900 cursor-pointer">
          {passage.content.split(" ").map((word, idx) => (
            <span
              key={idx}
              onClick={() => handleHighlightWord(word.replace(/[.,!?;:]/g, ""))}
              className={`cursor-pointer mx-1 ${
                highlightedWords.has(word.replace(/[.,!?;:]/g, ""))
                  ? "bg-yellow-200 font-semibold"
                  : "hover:bg-yellow-100"
              }`}
            >
              {word}
            </span>
          ))}
        </div>
      </div>

      {/* Word Detail Modal (Placeholder) */}
      {showWordDetail && (
        <div className="bg-white rounded-lg p-6 shadow border-2 border-blue-200">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-slate-900">{showWordDetail}</h3>
            <button
              onClick={() => setShowWordDetail(null)}
              className="text-slate-500 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-semibold text-slate-600">품사</label>
              <input
                type="text"
                placeholder="예: noun, verb"
                className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">뜻</label>
              <input
                type="text"
                placeholder="영문 뜻"
                className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-600">해석 요령</label>
              <textarea
                placeholder="이 단어를 어떻게 이해하면 좋을까?"
                className="w-full mt-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                rows={3}
              />
            </div>
            <button
              onClick={() => setShowWordDetail(null)}
              className="w-full mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700"
            >
              저장
            </button>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="bg-emerald-50 rounded-lg p-4">
        <p className="text-sm text-slate-600">
          표시된 단어: <span className="font-bold text-emerald-700">{highlightedWords.size}</span>개
        </p>
      </div>

      {/* Navigation */}
      <button
        onClick={handleCompleteStage}
        className="w-full rounded-lg bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700"
      >
        다음 단계로
      </button>
    </div>
  );
}
