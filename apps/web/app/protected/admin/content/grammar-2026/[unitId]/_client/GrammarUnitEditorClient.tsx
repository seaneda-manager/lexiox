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

  // 유닛 메타 (slug 제외 전부 수정 가능)
  const [meta, setMeta] = useState({
    label_ko: data.unit.label_ko ?? "",
    label_en: data.unit.label_en ?? "",
    description: data.unit.description ?? "",
    level: data.unit.level,
    order_index: data.unit.order_index ?? 1,
  });
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);

  const handleSaveMeta = async () => {
    setMetaSaving(true);
    try {
      const res = await fetch(`/api/grammar-2026/unit/${data.unit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label_ko: meta.label_ko,
          label_en: meta.label_en,
          description: meta.description,
          level: meta.level,
          order_index: Number(meta.order_index) || 1,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      alert("유닛 정보 저장 완료");
    } catch (e: any) {
      alert("저장 실패: " + (e?.message ?? e));
    } finally {
      setMetaSaving(false);
    }
  };

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

        {/* 유닛 정보 (slug 제외 수정 가능) */}
        <div className="border-b bg-white px-3 py-2 shrink-0">
          <button
            onClick={() => setMetaOpen((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-medium text-gray-500 hover:text-gray-700"
          >
            <span>
              유닛 정보 · <span className="font-mono text-gray-400">{data.unit.id}</span> · 순서 {meta.order_index}
            </span>
            <span>{metaOpen ? "▲" : "▼ 편집"}</span>
          </button>
          {metaOpen && (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={meta.label_ko}
                  onChange={(e) => setMeta({ ...meta, label_ko: e.target.value })}
                  placeholder="한국어 이름"
                  className="rounded border px-2 py-1 text-xs"
                />
                <input
                  value={meta.label_en}
                  onChange={(e) => setMeta({ ...meta, label_en: e.target.value })}
                  placeholder="영어 이름"
                  className="rounded border px-2 py-1 text-xs"
                />
              </div>
              <input
                value={meta.description}
                onChange={(e) => setMeta({ ...meta, description: e.target.value })}
                placeholder="설명 (교재 매핑 메모 등)"
                className="w-full rounded border px-2 py-1 text-xs"
              />
              <div className="flex items-center gap-2">
                <select
                  value={meta.level}
                  onChange={(e) => setMeta({ ...meta, level: e.target.value as typeof meta.level })}
                  className="rounded border px-2 py-1 text-xs"
                >
                  <option value="all">전체</option>
                  <option value="ms">중등</option>
                  <option value="hs">고등</option>
                  <option value="toefl">TOEFL</option>
                </select>
                <label className="text-[11px] text-gray-500">순서</label>
                <input
                  type="number"
                  min={1}
                  value={meta.order_index}
                  onChange={(e) => setMeta({ ...meta, order_index: Number(e.target.value) })}
                  className="w-16 rounded border px-2 py-1 text-xs"
                />
                <button
                  onClick={handleSaveMeta}
                  disabled={metaSaving}
                  className="ml-auto rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40"
                >
                  {metaSaving ? "저장 중…" : "정보 저장"}
                </button>
              </div>
              <p className="text-[10px] text-gray-400">슬러그(ID)는 변경 불가. 순서는 목록 정렬 순서입니다.</p>
            </div>
          )}
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
