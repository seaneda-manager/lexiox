'use client';

import { useState } from 'react';
import { saveConceptPlanAction } from '../actions';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export type BookOption = { id: string; title: string; units: { id: string; label: string }[] };
export type ConceptPlanInitial = {
  studentId: string;
  bookId: string | null;
  currentUnitId: string | null;
  level: number;
  startDate: string;
  weekdays: number[];
  perSession: number;
};

const input = 'w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400 disabled:bg-neutral-50';

// 학생 · 교재 · 지금 나가는 단원 · 레벨(1~5) · 페이스를 정한다. 이미 플랜이 있는 학생이면 바꾸고 오늘부터 다시 잡는다.
export default function ConceptPlanForm({
  students,
  books,
  today,
  initial,
  onDone,
}: {
  students: { id: string; name: string }[];
  books: BookOption[];
  today: string;
  initial?: ConceptPlanInitial;
  onDone?: () => void;
}) {
  const [studentId, setStudentId] = useState(initial?.studentId ?? '');
  const [bookId, setBookId] = useState(initial?.bookId ?? '');
  const [unitId, setUnitId] = useState(initial?.currentUnitId ?? '');
  const [level, setLevel] = useState(initial?.level ?? 1);
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [1, 4]);
  const [perSession, setPerSession] = useState(initial?.perSession ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const book = books.find((b) => b.id === bookId);
  const toggle = (d: number) => setWeekdays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    const res = await saveConceptPlanAction({ studentId, bookId: bookId || null, currentUnitId: unitId || null, level, startDate, weekdays, perSession });
    setSaving(false);
    if ('error' in res) return setError(res.error);
    setMessage(`저장했습니다 — 개념 ${res.created}개를 일정에 배치했습니다.`);
    if (!initial) setStudentId('');
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
      {!initial && <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">학생 스케줄 만들기 / 바꾸기</h2>}

      {!initial && (
        <label className="block space-y-1.5 text-xs font-semibold text-neutral-600">
          학생
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={input}>
            <option value="">선택하세요</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs font-semibold text-neutral-600">
          학생이 보는 교재
          <select
            value={bookId}
            onChange={(e) => {
              setBookId(e.target.value);
              setUnitId('');
            }}
            className={input}
          >
            <option value="">교재 없음 — 개념 난이도순</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-neutral-600">
          지금 나가는 단원
          <select value={unitId} onChange={(e) => setUnitId(e.target.value)} disabled={!book} className={input}>
            <option value="">{book ? '처음부터' : '교재를 먼저 고르세요'}</option>
            {book?.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[11px] text-neutral-500 sm:col-span-2">
          그 단원부터 교재 순서대로, 단원에 연결된 개념을 배정합니다. 같은 개념이 여러 단원에 걸려 있으면 한 번만 배정하고, 현재 단원 앞에서 이미 다룬 개념은 건너뜁니다.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-neutral-600">수업(문법) 요일</label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((label, d) => (
            <button
              key={d}
              type="button"
              onClick={() => toggle(d)}
              className={`h-9 w-9 rounded-full border text-xs font-medium transition ${
                weekdays.includes(d) ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="space-y-1.5 text-xs font-semibold text-neutral-600">
          학생 레벨 (1~5)
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))} className={input}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                L{n}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-neutral-600">
          하루 개념 수
          <input type="number" min={1} max={10} value={perSession} onChange={(e) => setPerSession(Math.max(1, Number(e.target.value) || 1))} className={input} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-neutral-600">
          시작일
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} />
        </label>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{message}</div>}

      <button
        type="submit"
        disabled={saving || (!initial && !studentId)}
        className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? '저장 중…' : initial ? '바꾸고 일정 다시 잡기' : '스케줄 만들기'}
      </button>
    </form>
  );
}
