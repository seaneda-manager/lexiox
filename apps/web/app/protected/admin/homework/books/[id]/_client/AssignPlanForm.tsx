'use client';

import { useState } from 'react';
import { createPlanAction } from '../actions';

const WEEKDAYS = [
  { value: 0, label: '일' },
  { value: 1, label: '월' },
  { value: 2, label: '화' },
  { value: 3, label: '수' },
  { value: 4, label: '목' },
  { value: 5, label: '금' },
  { value: 6, label: '토' },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AssignPlanForm({
  bookId,
  students,
}: {
  bookId: string;
  students: { id: string; name: string }[];
}) {
  const [studentId, setStudentId] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>([1, 4]); // 기본 월/목
  const [unitsPerSession, setUnitsPerSession] = useState(1);
  const [startDate, setStartDate] = useState(todayStr());
  const [targetRepeatCount, setTargetRepeatCount] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const toggleWeekday = (v: number) =>
    setWeekdays((prev) => (prev.includes(v) ? prev.filter((w) => w !== v) : [...prev, v].sort()));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);

    const result = await createPlanAction(bookId, studentId, weekdays, unitsPerSession, startDate, targetRepeatCount);
    setSaving(false);
    if ('error' in result) { setError(result.error); return; }
    setMessage(`배정 완료 — 숙제 ${result.created}개 자동 생성됨`);
    setStudentId('');
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">학생 배정</h2>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-neutral-600">학생</label>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
        >
          <option value="">선택하세요</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-neutral-600">숙제 요일</label>
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => toggleWeekday(w.value)}
              className={[
                'rounded-full border w-9 h-9 text-xs font-medium transition',
                weekdays.includes(w.value)
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-400',
              ].join(' ')}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-600">회당 유닛 수</label>
          <input
            type="number"
            min={1}
            value={unitsPerSession}
            onChange={(e) => setUnitsPerSession(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-600">시작일</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-600">목표 회독 수</label>
          <input
            type="number"
            min={1}
            value={targetRepeatCount}
            onChange={(e) => setTargetRepeatCount(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm outline-none focus:border-neutral-400"
          />
        </div>
      </div>

      <p className="text-[11px] text-neutral-400">
        한 번만 설정하면 이후 유닛이 추가될 때마다 이 학생에게 자동으로 이어서 배정됩니다. 목표 회독 수를 2 이상으로 두면 1회독이 끝났을 때 자동으로 2회독을 이어서 생성합니다.
      </p>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>
      )}

      <button
        type="submit"
        disabled={saving || !studentId}
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {saving ? '배정 중…' : '배정하기'}
      </button>
    </form>
  );
}
