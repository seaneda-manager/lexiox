"use client";

import { useState, useCallback } from "react";
import type {
  GrammarUnitFull,
  ExplanationSegment,
  GrammarDrill,
  GrammarStylisticItem,
} from "@/models/grammar/types";
import SegmentsEditor from "./SegmentsEditor";
import DrillsEditor from "./DrillsEditor";
import StylisticEditor from "./StylisticEditor";
import GrammarPreviewPanel from "./GrammarPreviewPanel";

type Tab = "segments" | "drills" | "stylistic";

const TABS: { key: Tab; label: string }[] = [
  { key: "segments",  label: "설명 세그먼트" },
  { key: "drills",    label: "드릴 문제" },
  { key: "stylistic", label: "Stylistic" },
];

export default function GrammarUnitEditorClient({ data }: { data: GrammarUnitFull }) {
  const [tab, setTab] = useState<Tab>("segments");

  // 통합 state — 에디터 변경사항이 실시간으로 미리보기에 반영됨
  const [segments,  setSegments]  = useState<ExplanationSegment[]>(data.segments);
  const [drills,    setDrills]    = useState<GrammarDrill[]>(data.drills);
  const [stylistic, setStylistic] = useState<GrammarStylisticItem[]>(data.stylistic_items);
  const [saving,    setSaving]    = useState(false);
  const [status,    setStatus]    = useState(data.unit.status);
  const [toggling,  setToggling]  = useState(false);

  const handleToggleStatus = async () => {
    const next = status === "published" ? "draft" : "published";
    setToggling(true);
    try {
      await fetch(`/api/grammar-2026/unit/${data.unit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      setStatus(next);
    } finally {
      setToggling(false);
    }
  };

  // 전체 저장
  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    try {
      await Promise.all([
        fetch(`/api/grammar-2026/unit/${data.unit.id}/segments`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ segments }),
        }),
        fetch(`/api/grammar-2026/unit/${data.unit.id}/drills`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drills }),
        }),
        fetch(`/api/grammar-2026/unit/${data.unit.id}/stylistic`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: stylistic }),
        }),
      ]);
      alert("저장 완료");
    } catch (e: any) {
      alert("저장 실패: " + e.message);
    } finally {
      setSaving(false);
    }
  }, [data.unit.id, segments, drills, stylistic]);

  return (
    <div className="flex gap-0 h-[calc(100vh-140px)] min-h-[600px]">

      {/* ── 좌: 에디터 패널 ──────────────────────────────── */}
      <div className="flex flex-col w-[480px] shrink-0 border-r border-gray-200">

        {/* 탭 + 저장 버튼 */}
        <div className="flex items-center gap-1 border-b px-3 pt-2 bg-white shrink-0">
          <div className="flex gap-1 flex-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-xs font-medium rounded-t-lg border-b-2 -mb-px transition
                  ${tab === t.key
                    ? "border-indigo-500 text-indigo-700 bg-indigo-50"
                    : "border-transparent text-gray-400 hover:text-gray-600"}`}
              >
                {t.label}
                <span className="ml-1 text-[10px] text-gray-300">
                  {t.key === "segments" && segments.length}
                  {t.key === "drills" && drills.length}
                  {t.key === "stylistic" && stylistic.length}
                </span>
              </button>
            ))}
          </div>
          <button
            onClick={handleToggleStatus}
            disabled={toggling}
            className={`mb-1 px-3 py-1.5 text-xs font-medium rounded-lg transition shrink-0 disabled:opacity-40
              ${status === "published"
                ? "bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"}`}
          >
            {toggling ? "..." : status === "published" ? "✓ Published" : "Draft"}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="mb-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition shrink-0"
          >
            {saving ? "저장 중..." : "전체 저장"}
          </button>
        </div>

        {/* 에디터 본문 (스크롤) */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "segments" && (
            <SegmentsEditor
              unitId={data.unit.id}
              segments={segments}
              onChange={setSegments}
            />
          )}
          {tab === "drills" && (
            <DrillsEditor
              unitId={data.unit.id}
              drills={drills}
              onChange={setDrills}
            />
          )}
          {tab === "stylistic" && (
            <StylisticEditor
              unitId={data.unit.id}
              items={stylistic}
              onChange={setStylistic}
            />
          )}
        </div>
      </div>

      {/* ── 우: 미리보기 패널 ─────────────────────────────── */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        <GrammarPreviewPanel
          activeTab={tab}
          segments={segments}
          drills={drills}
          stylisticItems={stylistic}
          unit={data.unit}
        />
      </div>
    </div>
  );
}
