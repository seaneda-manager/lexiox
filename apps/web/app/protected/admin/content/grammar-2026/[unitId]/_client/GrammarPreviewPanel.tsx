"use client";

import { useState, useCallback } from "react";
import type {
  GrammarUnit,
  ExplanationSegment,
  GrammarDrill,
  GrammarStylisticItem,
  GrammarStudentResponse,
} from "@/models/grammar/types";
// TODO: Import these components when available
// import ExplanationPlayer from "@/app/protected/grammar-2026/[unitId]/_client/ExplanationPlayer";
// import DrillRunner from "@/app/protected/grammar-2026/[unitId]/_client/DrillRunner";
// import StylisticQuiz from "@/app/protected/grammar-2026/[unitId]/_client/StylisticQuiz";

type Tab = "segments" | "drills" | "stylistic";

type Props = {
  activeTab: Tab;
  unit: GrammarUnit;
  segments: ExplanationSegment[];
  drills: GrammarDrill[];
  stylisticItems: GrammarStylisticItem[];
};

export default function GrammarPreviewPanel({
  activeTab,
  unit,
  segments,
  drills,
  stylisticItems,
}: Props) {
  // key로 강제 리마운트해서 미리보기 리셋
  const [previewKey, setPreviewKey] = useState(0);
  const [previewDone, setPreviewDone] = useState(false);

  const resetPreview = useCallback(() => {
    setPreviewKey((k) => k + 1);
    setPreviewDone(false);
  }, []);

  const isEmpty = {
    segments: segments.length === 0,
    drills: drills.length === 0,
    stylistic: stylisticItems.length === 0,
  };

  return (
    <div className="flex flex-col h-full">
      {/* 미리보기 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-xs font-semibold text-gray-600">학생 화면 미리보기</p>
          <span className="text-[10px] text-gray-300 bg-gray-100 px-2 py-0.5 rounded-full">
            {activeTab === "segments" && "설명 단계"}
            {activeTab === "drills"   && "드릴 단계"}
            {activeTab === "stylistic" && "Stylistic 단계"}
          </span>
        </div>
        <button
          onClick={resetPreview}
          className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-indigo-500 transition"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          미리보기 리셋
        </button>
      </div>

      {/* 미리보기 본문 */}
      <div className="flex-1 overflow-y-auto">
        {/* 디바이스 프레임 */}
        <div className="max-w-sm mx-auto my-6 rounded-3xl border-4 border-gray-200 bg-white shadow-xl overflow-hidden">
          {/* 폰 상단바 */}
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-300" />
            <div className="w-2 h-2 rounded-full bg-yellow-300" />
            <div className="w-2 h-2 rounded-full bg-green-300" />
            <div className="flex-1 mx-3 bg-white rounded-full text-[10px] text-center text-gray-400 py-0.5">
              grammar-2026/{unit.id}
            </div>
          </div>

          {/* 학생 화면 */}
          <div className="p-4 min-h-[500px]">
            {/* 미니 헤더 */}
            <div className="mb-4">
              <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wide">
                LEXiOX-Gram
              </p>
              <p className="text-sm font-bold text-gray-900">{unit.label_ko}</p>
              <p className="text-[11px] text-gray-400">{unit.label_en}</p>
            </div>

            {/* 콘텐츠 없을 때 */}
            {isEmpty[activeTab] && (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-2xl mb-2">✏️</p>
                <p className="text-xs text-gray-400">
                  {activeTab === "segments"  && "설명 세그먼트를 추가하면\n여기에 미리보기가 표시됩니다."}
                  {activeTab === "drills"    && "드릴 문제를 추가하면\n여기에 미리보기가 표시됩니다."}
                  {activeTab === "stylistic" && "Stylistic 문제를 추가하면\n여기에 미리보기가 표시됩니다."}
                </p>
              </div>
            )}

            {/* 실제 학생 컴포넌트 렌더링 */}
            {!isEmpty[activeTab] && !previewDone && (
              <div key={previewKey}>
                {activeTab === "segments" && (
                  <ExplanationPlayer
                    segments={segments}
                    onDone={() => setPreviewDone(true)}
                  />
                )}
                {activeTab === "drills" && drills.filter((d) => d.sentence).length > 0 && (
                  <DrillRunner
                    drills={drills.filter((d) => d.sentence)}
                    onDone={() => setPreviewDone(true)}
                  />
                )}
                {activeTab === "stylistic" && stylisticItems.filter((it) => it.options.some((o) => o.text)).length > 0 && (
                  <StylisticQuiz
                    items={stylisticItems.filter((it) => it.options.some((o) => o.text))}
                    onDone={() => setPreviewDone(true)}
                  />
                )}
              </div>
            )}

            {/* 완료 상태 */}
            {previewDone && (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-2xl mb-2">✅</p>
                <p className="text-xs text-gray-500 mb-3">미리보기 완료</p>
                <button
                  onClick={resetPreview}
                  className="text-xs text-indigo-500 hover:text-indigo-700 underline"
                >
                  처음부터 다시보기
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 안내 메시지 */}
        <p className="text-center text-[11px] text-gray-300 pb-6">
          좌측 편집 내용이 실시간으로 반영됩니다
        </p>
      </div>
    </div>
  );
}
