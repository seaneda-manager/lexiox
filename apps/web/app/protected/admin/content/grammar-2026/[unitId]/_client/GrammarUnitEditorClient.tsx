"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("segments");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteUnit = async () => {
    if (!confirm(`유닛 "${data.unit.label_ko}"을(를) 삭제합니다.\n설명·드릴·Stylistic·학생 진행기록까지 전부 삭제되고 되돌릴 수 없습니다.\n계속할까요?`)) return;
    if (!confirm("정말 삭제합니까? (마지막 확인)")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/grammar-2026/unit/${data.unit.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      router.push("/admin/content/grammar-2026");
    } catch (e: any) {
      alert("삭제 실패: " + (e?.message ?? e));
      setDeleting(false);
    }
  };

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
    admin_note: data.unit.admin_note ?? "",
    level: data.unit.level,
    order_index: data.unit.order_index ?? 1,
  });
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaSaving, setMetaSaving] = useState(false);

  // AI 감수
  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState<
    | { issues: { target: string; severity: string; note: string }[]; revised: { segments?: any[]; drills?: any[] } }
    | null
  >(null);

  const handleReview = async () => {
    setReviewing(true);
    setReview(null);
    try {
      const res = await fetch(`/api/admin/grammar-2026/${data.unit.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments, drills }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error || "감수 실패");
      setReview({ issues: d.issues ?? [], revised: d.revised ?? {} });
    } catch (e: any) {
      alert("AI 감수 실패: " + (e?.message ?? e));
    } finally {
      setReviewing(false);
    }
  };

  const applyRevised = () => {
    if (!review) return;
    if (review.revised.segments) {
      // manual 세그먼트는 유지, revised(ai)를 뒤에
      const manual = segments.filter((s) => s.source === "manual");
      const revised = review.revised.segments.map((s: any, i: number) => ({
        id: `seg-${Date.now()}-${i}`,
        unit_id: data.unit.id,
        order_index: manual.length + i,
        type: s.type,
        content: s.content,
        narration: s.narration ?? null,
        audio_url: null,
        source: "ai" as const,
      }));
      setSegments([
        ...manual.map((s, i) => ({ ...s, order_index: i })),
        ...(revised as ExplanationSegment[]),
      ]);
    }
    if (review.revised.drills) {
      setDrills(
        review.revised.drills.map((d: any, i: number) => ({
          id: `drill-${Date.now()}-${i}`,
          unit_id: data.unit.id,
          order_index: i,
          type: d.type,
          sentence: d.sentence,
          answer: d.answer,
          distractors: d.distractors,
          grammar_labels: (d.grammar_labels ?? []).map((l: any, li: number) => ({
            id: `drill-${Date.now()}-${i}-${li}`,
            label_ko: l.label_ko ?? "",
            label_en: l.label_en ?? "",
            is_correct: !!l.is_correct,
          })),
          source: "ai" as const,
        })) as GrammarDrill[],
      );
    }
    setReview(null);
    alert("반영됨. '전체 저장'을 눌러 확정하세요.");
  };

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
          admin_note: meta.admin_note,
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
            onClick={handleReview}
            disabled={reviewing}
            className="mb-1 px-3 py-1.5 text-xs font-medium rounded-lg transition shrink-0 disabled:opacity-40 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
          >
            {reviewing ? "감수 중…" : "🔍 AI 감수"}
          </button>
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

        {/* AI 감수 리포트 */}
        {review && (
          <div className="border-b bg-amber-50/60 px-3 py-2 shrink-0 max-h-52 overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-amber-800">AI 감수 결과 · 문제점 {review.issues.length}개</p>
              <button onClick={() => setReview(null)} className="text-[11px] text-gray-400 hover:text-gray-600">닫기</button>
            </div>
            {review.issues.length === 0 ? (
              <p className="mt-1 text-[11px] text-emerald-700">지적사항 없음 ✓</p>
            ) : (
              <ul className="mt-1 space-y-1">
                {review.issues.map((it, i) => (
                  <li key={i} className="text-[11px] text-gray-700">
                    <span className={`mr-1 font-bold ${it.severity === "high" ? "text-red-600" : it.severity === "med" ? "text-amber-600" : "text-gray-400"}`}>
                      [{it.target}]
                    </span>
                    {it.note}
                  </li>
                ))}
              </ul>
            )}
            {(review.revised.segments || review.revised.drills) && (
              <button
                onClick={applyRevised}
                className="mt-2 rounded bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
              >
                수정본 이대로 반영 ({review.revised.segments ? "설명" : ""}{review.revised.segments && review.revised.drills ? "+" : ""}{review.revised.drills ? "드릴" : ""})
              </button>
            )}
          </div>
        )}

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
                placeholder="설명 (짧게)"
                className="w-full rounded border px-2 py-1 text-xs"
              />
              <div>
                <label className="text-[10px] font-medium text-gray-500">
                  관리자 메모 (교재 매핑·강조점 등. AI가 안 건드림 · 강의 끝에 표시)
                </label>
                <textarea
                  value={meta.admin_note}
                  onChange={(e) => setMeta({ ...meta, admin_note: e.target.value })}
                  rows={2}
                  placeholder="예: 동아(윤정미) 중2-1 5과. 목적격 관계대명사 that 생략 꼭 강조."
                  className="w-full rounded border px-2 py-1 text-xs resize-none"
                />
              </div>
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

              <div className="mt-2 border-t pt-2">
                <button
                  onClick={handleDeleteUnit}
                  disabled={deleting}
                  className="rounded border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 disabled:opacity-40"
                >
                  {deleting ? "삭제 중…" : "🗑 유닛 삭제 (published 포함)"}
                </button>
              </div>
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
