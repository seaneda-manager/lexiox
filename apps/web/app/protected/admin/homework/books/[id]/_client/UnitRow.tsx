'use client';

import { useState } from 'react';
import { updateUnitAction, type AnswerItem } from '../actions';

type Row = { id: number; answer: string; hint: string };
let nextRowId = 1;
function makeRow(answer = '', hint = ''): Row {
  return { id: nextRowId++, answer, hint };
}

export default function UnitRow({
  bookId,
  unit,
}: {
  bookId: string;
  unit: { id: string; unit_index: number; title: string | null; answer_key_data: { items?: AnswerItem[] } | null };
}) {
  const initialItems = unit.answer_key_data?.items ?? [];
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(unit.title ?? '');
  const [rows, setRows] = useState<Row[]>(() =>
    initialItems.length > 0
      ? initialItems.map((it) => makeRow(it.answer, it.hint ?? ''))
      : Array.from({ length: 10 }, () => makeRow()),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemCount = initialItems.length;

  const updateRow = (id: number, field: 'answer' | 'hint', val: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));
  const addRows = (n: number) => setRows((prev) => [...prev, ...Array.from({ length: n }, () => makeRow())]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const items: AnswerItem[] = rows
      .filter((r) => r.answer.trim())
      .map((r, idx) => ({ number: idx + 1, answer: r.answer.trim(), hint: r.hint.trim() || null }));

    setSaving(true);
    setError(null);
    const result = await updateUnitAction(unit.id, bookId, title, items);
    setSaving(false);
    if ('error' in result) { setError(result.error); return; }
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2">
        <span className="text-sm text-neutral-800">
          Unit {unit.unit_index}{unit.title ? ` · ${unit.title}` : ''}
        </span>
        <div className="flex items-center gap-2">
          {itemCount === 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">정답 미입력</span>
          ) : (
            <span className="text-[11px] text-neutral-400">{itemCount}문항</span>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-500 hover:bg-neutral-50"
          >
            {itemCount === 0 ? '정답 채우기' : '편집'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-500">Unit {unit.unit_index} 편집</span>
        <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-400 hover:text-neutral-700">닫기</button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="유닛 제목"
        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
      />

      <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-1">
        <span className="text-[11px] text-neutral-400 text-center">번호</span>
        <span className="text-[11px] text-neutral-400">정답</span>
        <span className="text-[11px] text-neutral-400">힌트 (선택)</span>
      </div>
      <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
        {rows.map((row, idx) => (
          <div key={row.id} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center">
            <span className="text-xs text-neutral-400 text-center font-mono">{idx + 1}</span>
            <input
              type="text"
              value={row.answer}
              onChange={(e) => updateRow(row.id, 'answer', e.target.value)}
              placeholder="정답"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
            <input
              type="text"
              value={row.hint}
              onChange={(e) => updateRow(row.id, 'hint', e.target.value)}
              placeholder="오답 시 힌트"
              className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-500 outline-none focus:border-neutral-400"
            />
          </div>
        ))}
      </div>
      <button type="button" onClick={() => addRows(5)} className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100">
        + 5줄 추가
      </button>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {saving ? '저장 중…' : '저장'}
      </button>
    </form>
  );
}
