'use client';

import { useState, useTransition } from 'react';
import {
  createTextbookAction,
  deleteTextbookAction,
  addTextbookUnitsAction,
  deleteTextbookUnitAction,
  setTextbookUnitChaptersAction,
} from '../actions';

const LEVEL_LABEL: Record<string, string> = { all: '전체', ms: '중등', hs: '고등', toefl: 'TOEFL' };

type Chapter = { id: string; label: string; level: string; published: boolean };
type TbUnit = { id: string; no: number; title: string; chapterIds: string[] };
export type BookData = { id: string; name: string; level: string; units: TbUnit[] };

const btn = 'rounded-lg border px-2.5 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50';
const input = 'w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400';

export default function TextbookEditor({ books, chapters }: { books: BookData[]; chapters: Chapter[] }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState('all');

  const run = (fn: () => Promise<{ ok: true } | { error: string }>, after?: () => void) =>
    start(async () => {
      setMsg('');
      const r = await fn();
      if ('error' in r) setMsg(`오류: ${r.error}`);
      else after?.();
    });

  return (
    <div className="space-y-5">
      {msg && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{msg}</div>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createTextbookAction(name, level), () => setName(''));
        }}
        className="flex flex-wrap items-end gap-2 rounded-2xl border border-neutral-200 bg-white p-4"
      >
        <label className="min-w-[200px] flex-1 space-y-1 text-xs font-semibold text-neutral-600">
          새 교재 이름
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 쎄듀 문법 Level 2" className={input} />
        </label>
        <label className="space-y-1 text-xs font-semibold text-neutral-600">
          레벨
          <select value={level} onChange={(e) => setLevel(e.target.value)} className={input}>
            {Object.entries(LEVEL_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button disabled={pending || !name.trim()} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          교재 추가
        </button>
      </form>

      {books.length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-gray-400">아직 등록된 교재가 없습니다.</p>}

      {books.map((b) => (
        <BookCard key={b.id} book={b} chapters={chapters} pending={pending} run={run} />
      ))}
    </div>
  );
}

function BookCard({
  book,
  chapters,
  pending,
  run,
}: {
  book: BookData;
  chapters: Chapter[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: true } | { error: string }>, after?: () => void) => void;
}) {
  const [bulk, setBulk] = useState('');
  const mapped = book.units.filter((u) => u.chapterIds.length > 0).length;

  return (
    <section className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">{book.name}</h2>
          <p className="text-xs text-neutral-500">
            {LEVEL_LABEL[book.level] ?? book.level} · 단원 {book.units.length}개 · 챕터 연결됨 {mapped}개
          </p>
        </div>
        <button
          disabled={pending}
          onClick={() => confirm(`"${book.name}" 교재와 목차, 연결을 삭제합니다. (이 교재를 쓰던 학생 플랜은 교재 없음으로 바뀝니다) 계속할까요?`) && run(() => deleteTextbookAction(book.id))}
          className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          교재 삭제
        </button>
      </div>

      <ul className="divide-y rounded-lg border text-sm">
        {book.units.map((u) => (
          <UnitRow key={u.id} unit={u} chapters={chapters} pending={pending} run={run} />
        ))}
        {book.units.length === 0 && <li className="px-3 py-3 text-xs text-neutral-400">목차가 비어 있습니다. 아래에 붙여넣으세요.</li>}
      </ul>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-neutral-600">목차 붙여넣기 (한 줄에 단원 하나: "3. 수동태" · 번호를 생략하면 이어서 번호 부여)</label>
        <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={4} className={input} placeholder={'1. 문장의 형식\n2. 시제\n3. 수동태'} />
        <button disabled={pending || !bulk.trim()} onClick={() => run(() => addTextbookUnitsAction(book.id, bulk), () => setBulk(''))} className={btn}>
          단원 추가
        </button>
      </div>
    </section>
  );
}

function UnitRow({
  unit,
  chapters,
  pending,
  run,
}: {
  unit: TbUnit;
  chapters: Chapter[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: true } | { error: string }>, after?: () => void) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState<string[]>(unit.chapterIds);
  const labelOf = (id: string) => chapters.find((c) => c.id === id)?.label ?? id;
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <li className="px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="text-neutral-500">{unit.no}.</span> <span className="font-medium text-neutral-900">{unit.title}</span>
          <div className="mt-0.5 flex flex-wrap gap-1">
            {unit.chapterIds.length === 0 ? (
              <span className="rounded bg-amber-50 px-1.5 text-[11px] text-amber-700">챕터 미연결</span>
            ) : (
              unit.chapterIds.map((id) => (
                <span key={id} className="rounded bg-indigo-50 px-1.5 text-[11px] text-indigo-700">
                  {labelOf(id)}
                </span>
              ))
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setOpen((v) => !v)} className={btn}>
            {open ? '닫기' : '챕터 연결'}
          </button>
          <button
            disabled={pending}
            onClick={() => confirm(`${unit.no}. ${unit.title} 단원을 삭제할까요?`) && run(() => deleteTextbookUnitAction(unit.id))}
            className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            삭제
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-2 space-y-2 rounded-lg bg-neutral-50 p-3">
          <p className="text-[11px] text-neutral-500">체크한 순서대로 이 단원 안에서 배정됩니다.</p>
          <div className="grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
            {chapters.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-xs text-neutral-700">
                <input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} />
                <span className="truncate">{c.label}</span>
                {!c.published && <span className="rounded bg-neutral-200 px-1 text-[10px] text-neutral-600">draft</span>}
              </label>
            ))}
          </div>
          <button disabled={pending} onClick={() => run(() => setTextbookUnitChaptersAction(unit.id, sel), () => setOpen(false))} className={btn}>
            저장
          </button>
        </div>
      )}
    </li>
  );
}
