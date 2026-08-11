'use client';

import { useState } from 'react';
import { bulkAddUnitsAction } from '../actions';

export default function BulkUnitsForm({ bookId, nextUnitIndex }: { bookId: string; nextUnitIndex: number }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const lineCount = text.split('\n').map((l) => l.trim()).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const titles = text.split('\n');
    setSaving(true);
    setError(null);
    setMessage(null);
    const result = await bulkAddUnitsAction(bookId, titles);
    setSaving(false);
    if ('error' in result) { setError(result.error); return; }
    setMessage(`${result.created}개 등록됨 — 정답은 아래 목록에서 나중에 채워 넣으세요.`);
    setText('');
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50/50 py-4 text-sm font-medium text-sky-600 hover:border-sky-400"
      >
        📋 커리큘럼 구조 한 번에 등록하기 (챕터/유닛/서브유닛 제목만)
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-sky-200 bg-sky-50/40 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-sky-700">커리큘럼 구조 일괄 등록</h2>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-neutral-400 hover:text-neutral-700">취소</button>
      </div>
      <p className="text-[11px] text-neutral-500">
        한 줄에 챕터/유닛/서브챕터/서브유닛 제목 하나씩 입력하세요. 정답은 비워둔 채로 만들어지고,
        나중에 목록에서 하나씩 눌러 채워 넣을 수 있습니다. 순서대로 Unit {nextUnitIndex}부터 번호가 매겨집니다.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        placeholder={'Chapter 1\nChapter 1 - Sub 1\nChapter 1 - Sub 2\nChapter 2\n...'}
        className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400 font-mono"
      />
      <p className="text-[11px] text-neutral-400">{lineCount}줄</p>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      )}

      <button
        type="submit"
        disabled={saving || lineCount === 0}
        className="w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
      >
        {saving ? '등록 중…' : `${lineCount || ''}개 등록하기`}
      </button>
    </form>
  );
}
