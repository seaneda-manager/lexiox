"use client";

import { useState } from "react";
import type { GrammarUnitFull, GrammarStudentResponse } from "@/models/grammar/types";
import ExplanationPlayer from "./ExplanationPlayer";
import DrillRunner from "./DrillRunner";
import StylisticQuiz from "./StylisticQuiz";
import ChapterSummary from "./ChapterSummary";

type Phase = "explanation" | "drill" | "stylistic" | "summary";

export default function GrammarUnitClient({ data }: { data: GrammarUnitFull }) {
  const [phase, setPhase] = useState<Phase>("explanation");
  const [responses, setResponses] = useState<GrammarStudentResponse[]>([]);

  const handleExplanationDone = () => setPhase("drill");
  const markComplete = () => {
    fetch("/api/grammar-2026/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unit_id: data.unit.id }),
    }).catch(() => {});
  };

  const handleDrillDone = (rs: GrammarStudentResponse[]) => {
    setResponses(rs);
    if (data.stylistic_items.length > 0) setPhase("stylistic");
    else { markComplete(); setPhase("summary"); }
  };
  const handleStylisticDone = () => { markComplete(); setPhase("summary"); };

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <p className="text-xs text-blue-500 font-medium uppercase tracking-wide mb-1">
          LEXiOX-Gram
        </p>
        <h1 className="text-xl font-bold">{data.unit.label_ko}</h1>
        <p className="text-sm text-gray-400">{data.unit.label_en}</p>
      </div>

      {/* 진행 단계 표시 */}
      {(() => {
        const PHASES: { key: Phase; label: string }[] = [
          { key: "explanation", label: "설명" },
          { key: "drill",       label: "드릴" },
          { key: "stylistic",   label: "Stylistic" },
          { key: "summary",     label: "요약" },
        ];
        const currentIdx = PHASES.findIndex((p) => p.key === phase);
        return (
          <div className="flex gap-3 mb-8">
            {PHASES.map((p, i) => (
              <div key={p.key} className="flex-1 flex flex-col gap-1">
                <div className={`h-1 rounded-full transition-colors ${
                  i < currentIdx ? "bg-blue-300" : i === currentIdx ? "bg-blue-500" : "bg-gray-100"
                }`} />
                <p className={`text-[10px] text-center transition-colors ${
                  i === currentIdx ? "text-blue-500 font-semibold" : "text-gray-300"
                }`}>
                  {p.label}
                </p>
              </div>
            ))}
          </div>
        );
      })()}

      {phase === "explanation" && (
        <ExplanationPlayer
          segments={data.segments}
          onDone={handleExplanationDone}
        />
      )}
      {phase === "drill" && (
        <DrillRunner
          drills={data.drills}
          onDone={handleDrillDone}
        />
      )}
      {phase === "stylistic" && (
        <StylisticQuiz
          items={data.stylistic_items}
          onDone={handleStylisticDone}
        />
      )}
      {phase === "summary" && (
        <ChapterSummary
          unit={data.unit}
          segments={data.segments}
          responses={responses}
        />
      )}
    </div>
  );
}
