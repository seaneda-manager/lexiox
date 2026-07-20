"use client";

import React, { useState } from "react";

export type GameRange = "TODAY" | "CUMULATIVE" | "CHAPTER";

type Props = {
  onSelect: (range: GameRange, chapterId?: string) => void;
  chapters?: Array<{ id: string; name: string }>;
};

export default function RangeSelectorModal({ onSelect, chapters = [] }: Props) {
  const [selectedRange, setSelectedRange] = useState<GameRange | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>("");

  const handleConfirm = () => {
    if (!selectedRange) return;
    if (selectedRange === "CHAPTER" && !selectedChapter) return;

    onSelect(selectedRange, selectedChapter);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full">
        <div className="text-2xl font-bold mb-6 text-center">📖 학습 범위 선택</div>

        {/* 범위 선택 버튼들 */}
        <div className="space-y-3 mb-6">
          {/* 오늘 진도 */}
          <button
            onClick={() => {
              setSelectedRange("TODAY");
              setSelectedChapter("");
            }}
            className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all ${
              selectedRange === "TODAY"
                ? "bg-blue-500 text-white scale-105 shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📍 오늘 진도
            <div className="text-sm font-normal text-gray-600 mt-1">
              {selectedRange === "TODAY" ? "이 세션의 단어들" : ""}
            </div>
          </button>

          {/* 누적진도 */}
          <button
            onClick={() => {
              setSelectedRange("CUMULATIVE");
              setSelectedChapter("");
            }}
            className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all ${
              selectedRange === "CUMULATIVE"
                ? "bg-blue-500 text-white scale-105 shadow-lg"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            📚 누적진도
            <div className="text-sm font-normal text-gray-600 mt-1">
              {selectedRange === "CUMULATIVE" ? "지금까지 배운 모든 단어" : ""}
            </div>
          </button>

          {/* 챕터 선택 */}
          {chapters.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-bold text-gray-700 mb-3">📖 챕터 선택</div>
              <div className="grid grid-cols-3 gap-2">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setSelectedRange("CHAPTER");
                      setSelectedChapter(ch.id);
                    }}
                    className={`py-3 px-2 rounded-lg font-bold text-sm transition-all ${
                      selectedRange === "CHAPTER" && selectedChapter === ch.id
                        ? "bg-blue-500 text-white scale-105"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {ch.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3">
          <button
            disabled={!selectedRange}
            onClick={handleConfirm}
            className="flex-1 py-4 px-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            🎮 게임 시작
          </button>
        </div>

        {/* 설명 */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-gray-600">
          💡 <strong>팁:</strong> 누적진도로 플레이하면 전체 복습이 가능합니다!
        </div>
      </div>
    </div>
  );
}
