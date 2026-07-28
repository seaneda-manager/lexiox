'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  trackId: string;
  totalDays: number;
  currentStartDay?: number;
  onClose?: () => void;
};

export default function VocabDaySelector({
  trackId,
  totalDays,
  currentStartDay = 1,
  onClose,
}: Props) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState(currentStartDay);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/student/vocab/set-start-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track_id: trackId,
          start_day_index: selectedDay,
        }),
      });

      if (!res.ok) throw new Error('Failed to update start day');

      router.refresh();
      onClose?.();
    } catch (error) {
      alert('오류가 발생했습니다: ' + (error instanceof Error ? error.message : ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-2">어느 Day부터 시작하시겠어요?</h2>
        <p className="text-sm text-gray-500 mb-6">
          선택한 Day 이전의 단어들은 자동으로 건너뜁니다.
        </p>

        {/* Day 선택 슬라이더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <label className="text-lg font-semibold text-gray-700">Day {selectedDay}</label>
            <span className="text-sm text-gray-500">{selectedDay} / {totalDays}</span>
          </div>

          <input
            type="range"
            min="1"
            max={totalDays}
            value={selectedDay}
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            disabled={loading}
          />

          {/* Day 빠른 선택 */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {[1, 5, 10, 20, 30, Math.ceil(totalDays / 2), totalDays].map((day) => {
              if (day > totalDays) return null;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    selectedDay === day
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Day {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '저장 중...' : '확인'}
          </button>
        </div>
      </div>
    </div>
  );
}
