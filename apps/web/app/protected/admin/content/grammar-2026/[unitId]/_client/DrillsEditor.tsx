"use client";

import { useState } from "react";
import type { GrammarDrill, GrammarLabel, DrillType } from "@/models/grammar/types";

type Props = {
  unitId: string;
  drills: GrammarDrill[];
  onChange: (drills: GrammarDrill[]) => void;
};

// DrillRunner가 제대로 렌더하는 유형만. correction/reorder는 정답이 통째로 보기에 노출돼서 제외.
const DRILL_TYPES: { value: DrillType; label: string }[] = [
  { value: "fill",         label: "빈칸 선택" },
  { value: "judgment",     label: "정오 판단" },
];

const EMPTY_LABELS: GrammarLabel[] = [
  { id: "lbl-a", label_ko: "", label_en: "", is_correct: true  },
  { id: "lbl-b", label_ko: "", label_en: "", is_correct: false },
  { id: "lbl-c", label_ko: "", label_en: "", is_correct: false },
  { id: "lbl-d", label_ko: "", label_en: "", is_correct: false },
];

export default function DrillsEditor({ unitId, drills, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seed, setSeed] = useState("");
  const [seedCount, setSeedCount] = useState(4);
  const [genning, setGenning] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const update = (next: GrammarDrill[]) => onChange(next);

  const toRow = (d: any, i: number): GrammarDrill => {
    const id = `drill-${Date.now()}-${i}`;
    return {
      id, unit_id: unitId, order_index: drills.length + i + 1,
      type: d.type ?? "fill", sentence: d.sentence ?? "", answer: d.answer ?? "",
      distractors: (d.distractors ?? ["", "", ""]).slice(0, 3),
      grammar_labels: (d.grammar_labels ?? EMPTY_LABELS).map((l: any, li: number) => ({
        id: `${id}-${li}`, label_ko: l.label_ko ?? "", label_en: l.label_en ?? "", is_correct: !!l.is_correct,
      })),
      source: "ai",
    };
  };

  const handleGenerate = async () => {
    if (!seed.trim()) { setGenMsg("문장/포인트/유형을 입력하세요."); return; }
    setGenning(true); setGenMsg(null);
    try {
      const res = await fetch(`/api/admin/grammar-2026/${unitId}/generate-drills`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: seed.trim(), count: seedCount }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "생성 실패");
      const rows = (data.drills ?? []).map((d: any, i: number) => toRow(d, i));
      update([...drills, ...rows]);
      setGenMsg(`✅ 드릴 ${rows.length}개 생성`);
      setSeed("");
    } catch (e: any) {
      setGenMsg("❌ " + (e?.message ?? "오류"));
    } finally { setGenning(false); }
  };

  const handleComplete = async (drill: GrammarDrill) => {
    if (!drill.sentence.trim()) { alert("문장을 먼저 입력하세요."); return; }
    setCompletingId(drill.id);
    try {
      const res = await fetch(`/api/admin/grammar-2026/${unitId}/generate-drills`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partial: { type: drill.type, sentence: drill.sentence, answer: drill.answer } }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.drills?.[0]) throw new Error(data.error || "완성 실패");
      const g = data.drills[0];
      update(drills.map((d) => d.id !== drill.id ? d : {
        ...d,
        answer: g.answer ?? d.answer,
        distractors: (g.distractors ?? d.distractors).slice(0, 3),
        grammar_labels: (g.grammar_labels ?? d.grammar_labels).map((l: any, li: number) => ({
          id: `${d.id}-${li}`, label_ko: l.label_ko ?? "", label_en: l.label_en ?? "", is_correct: !!l.is_correct,
        })),
        source: "ai",
      }));
    } catch (e: any) {
      alert("AI 완성 실패: " + (e?.message ?? e));
    } finally { setCompletingId(null); }
  };

  const handleAdd = () => {
    const id = `drill-${Date.now()}`;
    const newDrill: GrammarDrill = {
      id, unit_id: unitId, order_index: drills.length + 1,
      type: "fill", sentence: "", answer: "",
      distractors: ["", "", ""],
      grammar_labels: EMPTY_LABELS.map((l) => ({ ...l, id: `${id}-${l.id}` })),
      source: "manual",
    };
    update([...drills, newDrill]);
    setEditingId(id);
  };

  const handleUpdate = (id: string, partial: Partial<GrammarDrill>) =>
    update(drills.map((d) => d.id === id ? { ...d, ...partial } : d));

  const handleLabelUpdate = (drillId: string, lIdx: number, partial: Partial<GrammarLabel>) =>
    update(drills.map((d) => {
      if (d.id !== drillId) return d;
      return { ...d, grammar_labels: d.grammar_labels.map((l, i) => i === lIdx ? { ...l, ...partial } : l) };
    }));

  return (
    <div className="space-y-3">
      {/* AI 드릴 생성 (admin 씨드) */}
      <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 space-y-2">
        <p className="text-[11px] font-semibold text-violet-800">🪄 AI 드릴 생성 — 재료를 정하면 AI가 문제화</p>
        <textarea
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          rows={3}
          placeholder={"문장 목록 / 문법 포인트 / 원하는 유형을 적으세요.\n예:\nThe book (that) I borrowed was interesting.\nThe man whom you met is my uncle.\n→ fill 유형, 목적격 관계대명사 that/whom 생략"}
          className="w-full rounded border px-2 py-1.5 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-gray-500">개수</label>
          <input type="number" min={1} max={12} value={seedCount}
            onChange={(e) => setSeedCount(Number(e.target.value))}
            className="w-14 rounded border px-2 py-1 text-xs" />
          <button
            onClick={handleGenerate}
            disabled={genning}
            className="ml-auto rounded bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-40"
          >
            {genning ? "생성 중…" : "드릴 생성"}
          </button>
        </div>
        {genMsg && <p className="text-[11px] text-gray-700">{genMsg}</p>}
      </div>

      <p className="text-[11px] text-gray-400">
        각 드릴에 정답 레이블 1개 + 오답 레이블 3개를 설정하세요. 문장·유형만 넣고 "AI 완성"으로 나머지를 채울 수 있습니다.
      </p>

      {drills.map((drill, i) => (
        <div key={drill.id} className="border rounded-xl bg-white overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b">
            <span className="text-[11px] text-gray-300 font-mono w-4">{i + 1}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
              {DRILL_TYPES.find((t) => t.value === drill.type)?.label ?? drill.type}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${drill.source === "manual" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"}`}>
              {drill.source === "manual" ? "관리자" : "AI"}
            </span>
            <p className="flex-1 text-xs text-gray-500 truncate min-w-0">
              {drill.sentence || <span className="text-gray-300 italic">문장 없음</span>}
            </p>
            <button onClick={() => handleComplete(drill)} disabled={completingId === drill.id}
              className="px-2 py-1 text-[11px] text-violet-500 hover:text-violet-700 shrink-0 disabled:opacity-40">
              {completingId === drill.id ? "완성 중…" : "AI 완성"}
            </button>
            <button onClick={() => setEditingId(editingId === drill.id ? null : drill.id)}
              className="px-2 py-1 text-[11px] text-indigo-500 hover:text-indigo-700 shrink-0">
              {editingId === drill.id ? "접기" : "편집"}
            </button>
            <button onClick={() => update(drills.filter((d) => d.id !== drill.id))}
              className="px-2 py-1 text-[11px] text-red-400 hover:text-red-600 shrink-0">삭제</button>
          </div>

          {editingId === drill.id && (
            <div className="px-3 py-3 space-y-3">
              {/* 유형 */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5">드릴 유형</p>
                <div className="flex flex-wrap gap-1.5">
                  {DRILL_TYPES.map((t) => (
                    <button key={t.value} onClick={() => handleUpdate(drill.id, { type: t.value })}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition
                        ${drill.type === t.value
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 문장 */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1">문장 (빈칸 = ___)</p>
                <textarea
                  value={drill.sentence}
                  onChange={(e) => handleUpdate(drill.id, { sentence: e.target.value })}
                  rows={2}
                  placeholder="Each of the boys must bring ___ own lunch."
                  className="w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                />
              </div>

              {/* 정답 + 오답 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">정답</p>
                  <input value={drill.answer}
                    onChange={(e) => handleUpdate(drill.id, { answer: e.target.value })}
                    placeholder="his"
                    className="w-full text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 mb-1">오답 3개</p>
                <div className="space-y-1.5">
                  {[0, 1, 2].map((idx) => (
                    <input key={idx} value={drill.distractors[idx] ?? ""}
                      onChange={(e) => {
                        const d = [...drill.distractors];
                        d[idx] = e.target.value;
                        handleUpdate(drill.id, { distractors: d });
                      }}
                      placeholder={`오답 ${idx + 1}`}
                      className="w-full text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                  ))}
                </div>
              </div>

              {/* 레이블 */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5">문법 개념 레이블</p>
                <div className="space-y-1.5">
                  {drill.grammar_labels.map((lbl, li) => (
                    <div key={lbl.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border
                      ${lbl.is_correct ? "border-green-200 bg-green-50" : "border-gray-100 bg-gray-50"}`}>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0
                        ${lbl.is_correct ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                        {lbl.is_correct ? "정답" : `오${li}`}
                      </span>
                      <input value={lbl.label_ko}
                        onChange={(e) => handleLabelUpdate(drill.id, li, { label_ko: e.target.value })}
                        placeholder={lbl.is_correct ? "명사-대명사 수일치" : "오답 레이블"}
                        className="flex-1 text-xs bg-transparent border-0 focus:outline-none min-w-0" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}

      <button onClick={handleAdd}
        className="w-full py-2.5 border-2 border-dashed border-gray-200 text-xs text-gray-400 rounded-xl hover:border-indigo-300 hover:text-indigo-500 transition">
        + 드릴 추가
      </button>
    </div>
  );
}
