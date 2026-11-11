'use client';

import { useState } from 'react';
import { savePlanAction } from '../actions';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const LEVEL_LABEL: Record<string, string> = { all: '전체', ms: '중등', hs: '고등', toefl: 'TOEFL' };

export type PlanFormInitial = {
  studentId: string;
  startDate: string;
  weekdays: number[];
  unitsPerSession: number;
  level: string;
  startUnitId: string | null;
};

// 학생을 고르고 페이스(시작일 · 요일 · 회당 챕터 수 · 레벨 · 시작 챕터)를 정한다.
// 이미 플랜이 있는 학생이면 설정을 바꾸고 오늘부터 일정을 다시 잡는다.
export default function PlanForm({
  students,
  units,
  today,
  initial,
  onDone,
}: {
  students: { id: string; name: string }[];
  units: { id: string; label: string }[];
  today: string;
  initial?: PlanFormInitial;
  onDone?: () => void;
}) {
  const [studentId, setStudentId] = useState(initial?.studentId ?? '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? [1, 4]);
  const [perSession, setPerSession] = useState(initial?.unitsPerSession ?? 1);
  const [level, setLevel] = useState(initial?.level ?? 'all');
  const [startUnit, setStartUnit] = useState(initial?.startUnitId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const toggle = (d: number) => setWeekdays((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d].sort()));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    const res = await savePlanAction({ studentId, startDate, weekdays, unitsPerSession: perSession, level, startUnitId: startUnit || null });
    setSaving(false);
    if ('error' in res) return setError(res.error);
    setMessage(`저장했습니다 — 챕터 ${res.created}개를 일정에 배치했습니다.`);
    if (!initial) setStudentId('');
    onDone?.();
  }

  const input = 'w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400';

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
      {!initial && <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">학생 스케줄 만들기 / 바꾸기</h2>}

      {!initial && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-600">학생 (TOEFL·GAP)</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={input}>
            <option value="">선택하세요</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="space-y-1.5 text-xs font-semibold text-neutral-600">
          하루 챕터 수
          <input type="number" min={1} max={10} value={perSession} onChange={(e) => setPerSession(Math.max(1, Number(e.target.value) || 1))} className={input} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-neutral-600">
          시작일
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={input} />
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-neutral-600">
          레벨
          <select value={level} onChange={(e) => setLevel(e.target.value)} className={input}>
            {Object.entries(LEVEL_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-semibold text-neutral-600">
          시작 챕터
          <select value={startUnit} onChange={(e) => setStartUnit(e.target.value)} className={input}>
            <option value="">처음부터</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-[11px] text-neutral-400">
        저장하면 오늘부터 순서대로 날짜에 챕터를 배치합니다(이미 끝낸 챕터는 건너뜀). 시작일이 과거여도 지난 날짜에는 배치하지 않습니다. 내용이 아직 없는 챕터도 일정에는 들어가며, 아래 "곧 내용이 필요한 챕터"에서 확인할 수 있습니다.
      </p>

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
