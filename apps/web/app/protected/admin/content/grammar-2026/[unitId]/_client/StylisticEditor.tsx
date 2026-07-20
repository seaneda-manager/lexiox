"use client";

import { useState } from "react";
import type { GrammarStylisticItem, StylisticSkill, StylisticOption } from "@/models/grammar/types";

type Props = {
  unitId: string;
  items: GrammarStylisticItem[];
  onChange: (items: GrammarStylisticItem[]) => void;
};

const SKILLS: { value: StylisticSkill; label: string; desc: string }[] = [
  { value: "concision",   label: "간결성",    desc: "불필요한 단어 제거" },
  { value: "parallelism", label: "병렬 구조", desc: "리스트 형태 통일" },
  { value: "transition",  label: "연결어",    desc: "논리적 흐름" },
  { value: "modifier",    label: "수식어",    desc: "Dangling modifier" },
  { value: "redundancy",  label: "중복 표현", desc: "the reason is because 등" },
  { value: "tone",        label: "어조",      desc: "격식/비격식" },
  { value: "cohesion",    label: "응집성",    desc: "문단 연결" },
];

export default function StylisticEditor({ unitId, items, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const update = (next: GrammarStylisticItem[]) => onChange(next);

  const handleAdd = () => {
    const id = `sty-${Date.now()}`;
    const newItem: GrammarStylisticItem = {
      id, unit_id: unitId, order_index: items.length + 1,
      skill: "concision",
      prompt: "다음 중 더 자연스럽고 효과적인 문장은?",
      options: [
        { id: `${id}-a`, text: "", is_correct: false },
        { id: `${id}-b`, text: "", is_correct: true  },
      ],
      explanation: "",
    };
    update([...items, newItem]);
    setEditingId(id);
  };

  const handleUpdate = (id: string, partial: Partial<GrammarStylisticItem>) =>
    update(items.map((it) => it.id === id ? { ...it, ...partial } : it));

  const handleOptionUpdate = (itemId: string, optIdx: number, partial: Partial<StylisticOption>) =>
    update(items.map((it) => {
      if (it.id !== itemId) return it;
      return { ...it, options: it.options.map((o, i) => i === optIdx ? { ...o, ...partial } : o) };
    }));

  const setCorrect = (itemId: string, optIdx: number) =>
    update(items.map((it) => {
      if (it.id !== itemId) return it;
      return { ...it, options: it.options.map((o, i) => ({ ...o, is_correct: i === optIdx })) };
    }));

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-400">챕터당 최대 2개 권장.</p>

      {items.map((item, i) => (
        <div key={item.id} className="border rounded-xl bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
              {SKILLS.find((s) => s.value === item.skill)?.label ?? item.skill}
            </span>
            <p className="flex-1 text-xs text-gray-500 truncate min-w-0">{item.prompt}</p>
            <button onClick={() => setEditingId(editingId === item.id ? null : item.id)}
              className="px-2 py-1 text-[11px] text-indigo-500 hover:text-indigo-700 shrink-0">
              {editingId === item.id ? "접기" : "편집"}
            </button>
            <button onClick={() => update(items.filter((it) => it.id !== item.id))}
              className="px-2 py-1 text-[11px] text-red-400 hover:text-red-600 shrink-0">삭제</button>
          </div>

          {editingId === item.id && (
            <div className="px-3 py-3 space-y-3">
              {/* Skill 선택 */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5">Stylistic 포인트</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKILLS.map((s) => (
                    <button key={s.value} onClick={() => handleUpdate(item.id, { skill: s.value })}
                      title={s.desc}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition
                        ${item.skill === s.value
                          ? "border-purple-400 bg-purple-50 text-purple-700 font-medium"
                          : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 문제 지문 */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1">문제 지문</p>
                <input value={item.prompt}
                  onChange={(e) => handleUpdate(item.id, { prompt: e.target.value })}
                  placeholder="다음 중 더 자연스럽고 효과적인 문장은?"
                  className="w-full text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400" />
              </div>

              {/* 선택지 */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1.5">선택지 — 원 클릭으로 정답 지정</p>
                <div className="space-y-1.5">
                  {item.options.map((opt, oi) => (
                    <div key={opt.id} className={`flex items-center gap-2 p-2 rounded-lg border
                      ${opt.is_correct ? "border-green-200 bg-green-50" : "border-gray-100"}`}>
                      <button onClick={() => setCorrect(item.id, oi)}
                        className={`shrink-0 w-5 h-5 rounded-full text-[10px] font-bold border-2 transition
                          ${opt.is_correct ? "bg-green-500 border-green-500 text-white" : "border-gray-300 text-gray-400 hover:border-green-400"}`}>
                        {opt.is_correct ? "✓" : String.fromCharCode(65 + oi)}
                      </button>
                      <input value={opt.text}
                        onChange={(e) => handleOptionUpdate(item.id, oi, { text: e.target.value })}
                        placeholder={`선택지 ${String.fromCharCode(65 + oi)}`}
                        className="flex-1 text-sm bg-transparent border-0 focus:outline-none min-w-0" />
                    </div>
                  ))}
                  {item.options.length < 4 && (
                    <button onClick={() => handleUpdate(item.id, {
                      options: [...item.options, { id: `${item.id}-${Date.now()}`, text: "", is_correct: false }]
                    })} className="text-xs text-gray-400 hover:text-purple-500 pl-1">
                      + 선택지 추가
                    </button>
                  )}
                </div>
              </div>

              {/* 해설 */}
              <div>
                <p className="text-[10px] text-gray-400 mb-1">해설</p>
                <textarea value={item.explanation}
                  onChange={(e) => handleUpdate(item.id, { explanation: e.target.value })}
                  rows={2} placeholder="왜 이 선택지가 더 나은지..."
                  className="w-full text-sm border rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-purple-400 resize-none" />
              </div>
            </div>
          )}
        </div>
      ))}

      {items.length < 2 && (
        <button onClick={handleAdd}
          className="w-full py-2.5 border-2 border-dashed border-gray-200 text-xs text-gray-400 rounded-xl hover:border-purple-300 hover:text-purple-500 transition">
          + Stylistic 추가 (최대 2개)
        </button>
      )}
    </div>
  );
}
