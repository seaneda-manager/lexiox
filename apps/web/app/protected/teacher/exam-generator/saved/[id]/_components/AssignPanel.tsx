'use client';

import { useState, useTransition, useMemo } from 'react';
import { assignExamToStudents, removeExamAssignment } from '../_actions/assign';

type Student = { id: string; name: string; school: string; grade: string };

type Props = {
  examId: string;
  students: Student[];
  assignedStudentIds: string[];
};

const GRADE_LABEL: Record<string, string> = {
  H1: '고1', H2: '고2', H3: '고3',
  M1: '중1', M2: '중2', M3: '중3',
};

export default function AssignPanel({ examId, students, assignedStudentIds: initial }: Props) {
  const [assigned, setAssigned] = useState<Set<string>>(new Set(initial));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const filtered = useMemo(() =>
    students.filter((s) =>
      s.name.includes(search) || s.school.includes(search) || s.grade.includes(search)
    ), [students, search]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleAssign() {
    const targets = [...selected].filter((id) => !assigned.has(id));
    if (targets.length === 0) return;
    startTransition(async () => {
      const result = await assignExamToStudents(examId, targets, dueDate || undefined);
      if (result.error) { setMessage('오류: ' + result.error); return; }
      setAssigned((prev) => new Set([...prev, ...targets]));
      setSelected(new Set());
      setMessage(`${targets.length}명에게 배정했습니다.`);
    });
  }

  function handleRemove(studentId: string) {
    startTransition(async () => {
      const result = await removeExamAssignment(examId, studentId);
      if (result.error) { setMessage('오류: ' + result.error); return; }
      setAssigned((prev) => { const next = new Set(prev); next.delete(studentId); return next; });
      setMessage('배정을 취소했습니다.');
    });
  }

  const assignedStudents = students.filter((s) => assigned.has(s.id));
  const newSelected = [...selected].filter((id) => !assigned.has(id));

  return (
    <div className="print:hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-5">
      <h2 className="text-base font-bold text-neutral-900">👩‍🎓 학생 배정</h2>

      {/* 배정된 학생 */}
      {assignedStudents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">배정됨 ({assignedStudents.length}명)</p>
          <div className="flex flex-wrap gap-2">
            {assignedStudents.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-sm text-indigo-700">
                {s.name}
                <button onClick={() => handleRemove(s.id)} disabled={isPending}
                  className="text-indigo-400 hover:text-red-500 transition text-xs font-bold">✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 학생 검색 + 선택 */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">학생 선택</p>
        <input
          type="text"
          placeholder="이름, 학교, 학년 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <div className="max-h-52 overflow-y-auto rounded-lg border border-neutral-100 divide-y divide-neutral-100">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-neutral-400 text-center">학생이 없습니다.</p>
          ) : filtered.map((s) => {
            const isAssigned = assigned.has(s.id);
            const isSelected = selected.has(s.id);
            return (
              <label key={s.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition ${isAssigned ? 'bg-indigo-50' : isSelected ? 'bg-amber-50' : 'hover:bg-neutral-50'}`}>
                <input
                  type="checkbox"
                  checked={isSelected || isAssigned}
                  disabled={isAssigned}
                  onChange={() => toggleSelect(s.id)}
                  className="rounded"
                />
                <span className="flex-1 text-sm text-neutral-800">{s.name}</span>
                <span className="text-xs text-neutral-400">{s.school} · {GRADE_LABEL[s.grade] ?? s.grade}</span>
                {isAssigned && <span className="text-xs text-indigo-500 font-medium">배정됨</span>}
              </label>
            );
          })}
        </div>
      </div>

      {/* 마감일 + 배정 버튼 */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">마감일 (선택)</label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <button
          onClick={handleAssign}
          disabled={isPending || newSelected.length === 0}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 transition"
        >
          {isPending ? '처리 중...' : `${newSelected.length}명 배정`}
        </button>
      </div>

      {message && (
        <p className="text-sm text-indigo-600 font-medium">{message}</p>
      )}
    </div>
  );
}
