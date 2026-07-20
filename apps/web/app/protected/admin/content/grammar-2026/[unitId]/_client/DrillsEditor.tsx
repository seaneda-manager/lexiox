"use client";

import { useState } from "react";
import type { GrammarDrill, GrammarLabel, DrillType } from "@/models/grammar/types";

type Props = {
  unitId: string;
  drills: GrammarDrill[];
  onChange: (drills: GrammarDrill[]) => void;
};

const DRILL_TYPES: { value: DrillType; label: string }[] = [
  { value: "fill",         label: "빈칸 선택" },
  { value: "judgment",     label: "정오 판단" },
  { value: "correction",   label: "오류 교정" },
  { value: "reorder",      label: "어순 배열" },
  { value: "listen_judge", label: "듣기 판단" },
];

const EMPTY_LABELS: GrammarLabel[] = [
  { id: "lbl-a", label_ko: "", label_en: "", is_correct: true  },
  { id: "lbl-b", label_ko: "", label_en: "", is_correct: false },
  { id: "lbl-c", label_ko: "", label_en: "", is_correct: false },
  { id: "lbl-d", label_ko: "", label_en: "", is_correct: false },
];

export default function DrillsEditor({ unitId, drills, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const update = (next: GrammarDrill[]) => onChange(next);

  const handleAdd = () => {
    const id = `drill-${Date.now()}`;
    const newDrill: GrammarDrill = {
      id, unit_id: unitId, order_index: drills.length + 1,
      type: "fill", sentence: "", answer: "",
      distractors: ["", "", ""],
      grammar_labels: EMPTY_LABELS.map((l) => ({ ...l, id: `${id}-${l.id}` })),
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
      <p className="text-[11px] text-gray-400">
        각 드릴에 정답 레이블 1개 + 오답 레이블 3개를 설정하세요.
      </p>

      {drills.map((drill, i) => (
        <div key={drill.id} className="border rounded-xl bg-white overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b">
            <span className="text-[11px] text-gray-300 font-mono w-4">{i + 1}</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
              {DRILL_TYPES.find((t) => t.value === drill.type)?.label ?? drill.type}
            </span>
            <p className="flex-1 text-xs text-gray-500 truncate min-w-0">
              {drill.sentence || <span className="text-gray-300 italic">문장 없음</span>}
            </p>
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
