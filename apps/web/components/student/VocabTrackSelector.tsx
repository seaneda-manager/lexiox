'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

type VocabAssignment = {
  id: string;
  set_id: string;
  day_index: number;
  completed_at: string | null;
};

interface VocabTrackSelectorProps {
  assignments: VocabAssignment[];
  totalDayCount: number;
  vocabProgress: number;
  nextIncompleteDay?: VocabAssignment | null;
}

export default function VocabTrackSelector({
  assignments,
  totalDayCount,
  vocabProgress,
  nextIncompleteDay,
}: VocabTrackSelectorProps) {
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [selectedDayIndices, setSelectedDayIndices] = useState<Set<number>>(new Set());

  const incompleteDays = useMemo(
    () => assignments.filter((a) => !a.completed_at).sort((a, b) => a.day_index - b.day_index),
    [assignments]
  );

  const handleSelectDay = (dayIndex: number) => {
    setSelectedDayIndices((prev) => {
      const next = new Set(prev);
      if (next.has(dayIndex)) {
        next.delete(dayIndex);
      } else {
        next.add(dayIndex);
      }
      return next;
    });
  };

  const handleSelectConsecutive = (count: number) => {
    const selected = new Set<number>();
    for (let i = 0; i < Math.min(count, incompleteDays.length); i++) {
      selected.add(incompleteDays[i].day_index);
    }
    setSelectedDayIndices(selected);
  };

  const selectedSetIds = useMemo(() => {
    const setIds: string[] = [];
    for (const assignment of assignments) {
      if (selectedDayIndices.has(assignment.day_index)) {
        setIds.push(assignment.set_id);
      }
    }
    return setIds;
  }, [assignments, selectedDayIndices]);

  const selectedSetIdsStr = selectedSetIds.join(',');

  if (totalDayCount === 0 || !nextIncompleteDay) {
    return (
      <Link href="/vocab/hub" className="flex items-start justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100">
        <div>
          <p className="text-sm font-semibold text-blue-900">📚 Vocabulary Track</p>
          <p className="mt-1 text-xs text-blue-700">완료됨</p>
        </div>
        <span className="text-sm font-semibold text-blue-600">100%</span>
      </Link>
    );
  }

  // Single Day 모드
  if (mode === 'single') {
    return (
      <div className="space-y-2">
        <Link
          href={`/vocab/session?setId=${nextIncompleteDay.set_id}&dayIndex=${nextIncompleteDay.day_index}`}
          className="flex items-start justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 hover:bg-blue-100"
        >
          <div>
            <p className="text-sm font-semibold text-blue-900">📚 Vocabulary Track</p>
            <p className="mt-1 text-xs text-blue-700">
              Day {nextIncompleteDay.day_index + 1}/{totalDayCount}
            </p>
          </div>
          <span className="text-sm font-semibold text-blue-600">{vocabProgress}%</span>
        </Link>

        {incompleteDays.length > 1 && (
          <button
            onClick={() => setMode('multiple')}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            여러 Day 한번에 학습 ({incompleteDays.length}개)
          </button>
        )}
      </div>
    );
  }

  // Multiple Days 모드
  return (
    <div className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-blue-900">📚 여러 Day 선택</p>
        <button
          onClick={() => {
            setMode('single');
            setSelectedDayIndices(new Set());
          }}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          닫기
        </button>
      </div>

      {/* 빠른 선택 버튼 */}
      <div className="flex gap-2">
        {[2, 3, 4].map((count) => (
          count <= incompleteDays.length && (
            <button
              key={count}
              onClick={() => handleSelectConsecutive(count)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                selectedDayIndices.size === count
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
              }`}
            >
              {count}일
            </button>
          )
        ))}
      </div>

      {/* Day 선택 체크박스 */}
      <div className="max-h-48 space-y-2 overflow-y-auto rounded bg-white p-3">
        {incompleteDays.map((day) => (
          <label key={day.id} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedDayIndices.has(day.day_index)}
              onChange={() => handleSelectDay(day.day_index)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-slate-700">
              Day {day.day_index + 1}
            </span>
          </label>
        ))}
      </div>

      {/* 선택 정보 */}
      <div className="text-xs text-slate-600">
        {selectedDayIndices.size > 0 ? (
          <p>선택됨: {selectedDayIndices.size}개 Day</p>
        ) : (
          <p className="text-slate-500">Day를 선택해주세요</p>
        )}
      </div>

      {/* 시작 버튼 */}
      {selectedDayIndices.size > 0 && selectedSetIdsStr && (
        <Link
          href={`/vocab/session?setIds=${selectedSetIdsStr}`}
          className="block w-full rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
        >
          {selectedDayIndices.size}개 Day 시작
        </Link>
      )}
    </div>
  );
}
