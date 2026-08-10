'use client';

import { useState } from 'react';
import { addUnitAction, type AnswerItem } from '../actions';

type Row = { id: number; answer: string; hint: string };

let nextId = 1;
function makeRow(): Row {
  return { id: nextId++, answer: '', hint: '' };
}

export default function AddUnitForm({ bookId, nextUnitIndex }: { bookId: string; nextUnitIndex: number }) {
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 10 }, makeRow));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const updateRow = (id: number, field: 'answer' | 'hint', val: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)));

  const addRows = (n: number) => setRows((prev) => [...prev, ...Array.from({ length: n }, makeRow)]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items: AnswerItem[] = rows
      .filter((r) => r.answer.trim())
      .map((r, idx) => ({ number: idx + 1, answer: r.answer.trim(), hint: r.hint.trim() || null }));

    if (items.length === 0) { setError('정답을 1개 이상 입력해 주세요.'); return; }

    setSaving(true);
    setError(null);
    const result = await addUnitAction(bookId, title, items);
    setSaving(false);
    if ('error' in result) { setError(result.error); return; }

    setTitle('');
    setRows(Array.from({ length: 10 }, makeRow));
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed border-neutral-200 py-4 text-sm font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
      >
        + Unit {nextUnitIndex} 추가
      </button>
    );
  }

  const filledCount = rows.filter((r) => r.answer.trim()).length;

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">Unit {nextUnitIndex} 추가</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-400 hover:text-neutral-700">취소</button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="유닛 제목 (예: Chapter 3, p.12-15) — 선택"
        className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
      />

      <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 px-1">
        <span className="text-[11px] text-neutral-400 text-center">번호</span>
        <span className="text-[11px] text-neutral-400">정답 *</span>
        <span className="text-[11px] text-neutral-400">힌트 (선택)</span>
      </div>

      <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
        {rows.map((row, idx) => (
          <div key={row.id} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center">
            <span className="text-xs text-neutral-400 text-center font-mono">{idx + 1}</span>
            <input
              type="text"
              value={row.answer}
              onChange={(e) => updateRow(row.id, 'answer', e.target.value)}
              placeholder="정답"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
            <input
              type="text"
              value={row.hint}
              onChange={(e) => updateRow(row.id, 'hint', e.target.value)}
              placeholder="오답 시 힌트"
              className="rounded-lg border border-neutral-200 px-3 py-2 text-xs text-neutral-500 outline-none focus:border-neutral-400"
            />
          </div>
        ))}
      </div>

      <button type="button" onClick={() => addRows(5)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50">
        + 5줄 추가
      </button>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-neutral-900 py-3 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {saving ? '저장 중…' : `Unit ${nextUnitIndex} 저장 (${filledCount}문항)`}
      </button>
    </form>
  );
}
