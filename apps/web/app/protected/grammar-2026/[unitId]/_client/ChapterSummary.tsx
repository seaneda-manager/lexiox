"use client";

import Link from "next/link";
import type { GrammarUnit, ExplanationSegment, GrammarStudentResponse } from "@/models/grammar/types";
import { classifyDrillResult } from "@/models/grammar/types";

type Props = {
  unit: GrammarUnit;
  segments: ExplanationSegment[];
  responses: GrammarStudentResponse[];
};

export default function ChapterSummary({ unit, segments, responses }: Props) {
  const totalDrills = responses.length;
  const fullCount = responses.filter(
    (r) => r.label_correct !== null && classifyDrillResult({ answer_correct: r.answer_correct, label_correct: r.label_correct }) === "full"
  ).length;

  const textSegments = segments.filter((s) => s.type === "text" || s.type === "blank");

  return (
    <div className="space-y-6">
      {/* 결과 요약 */}
      <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100">
        <p className="text-sm font-semibold text-blue-700 mb-1">챕터 완료!</p>
        <p className="text-xs text-blue-500">
          드릴 {totalDrills}개 중 완전 이해: {fullCount}개
        </p>
      </div>

      {/* 핵심 정리 (설명 세그먼트 다시 보여주기) */}
      <div>
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
          핵심 정리 — {unit.label_ko}
        </p>
        <div className="space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
          {textSegments.map((s) => {
            if (s.type === "text") {
              const c = s.content as { text: string };
              return (
                <p key={s.id} className="text-sm text-gray-700 leading-relaxed">
                  {c.text}
                </p>
              );
            }
            if (s.type === "blank") {
              const c = s.content as { prompt: string; answer: string };
              const parts = c.prompt.split("___");
              return (
                <p key={s.id} className="text-sm text-gray-700 leading-relaxed">
                  {parts[0]}
                  <span className="font-bold text-blue-600 underline">{c.answer}</span>
                  {parts[1]}
                </p>
              );
            }
            return null;
          })}
        </div>

        {/* TTS 버튼 placeholder */}
        <button
          disabled
          className="mt-3 flex items-center gap-2 text-xs text-gray-400 bg-gray-100 px-3 py-2 rounded-lg cursor-not-allowed"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3.536-9.536a5 5 0 000 7.072" />
          </svg>
          읽어주기 (TTS 준비중)
        </button>
      </div>

      {/* 취약 항목 */}
      {responses.some((r) => !r.answer_correct || r.label_correct === false) && (
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
          <p className="text-xs font-medium text-orange-600 mb-2">재확인 필요</p>
          <ul className="space-y-1">
            {responses
              .filter((r) => !r.answer_correct || r.label_correct === false)
              .map((r, i) => (
                <li key={i} className="text-xs text-orange-500">
                  드릴 {i + 1} —{" "}
                  {!r.answer_correct ? "정답 오류" : "개념 미확인"}
                </li>
              ))}
          </ul>
        </div>
      )}

      <Link
        href="/grammar-2026"
        className="block w-full py-3 text-center bg-gray-800 text-white text-sm rounded-xl hover:bg-gray-700 transition"
      >
        챕터 목록으로
      </Link>
    </div>
  );
}
