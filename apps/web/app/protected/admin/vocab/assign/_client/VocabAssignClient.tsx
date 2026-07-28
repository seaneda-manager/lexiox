'use client';

import { useState } from 'react';

type Student = {
  id: string;
  user_id: string;
  full_name: string | null;
};

type VocabTrack = {
  id: string;
  title: string;
  day_count: number;
};

type Plan = {
  id: string;
  student_id: string;
  track_id: string;
  start_day_index: number;
  vocab_tracks: VocabTrack;
};

type Props = {
  students: Student[];
  plans: Plan[];
};

export default function VocabAssignClient({ students, plans }: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('');
  const [newDay, setNewDay] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const studentPlans = selectedStudent
    ? plans.filter((p) => p.student_id === selectedStudentId)
    : [];
  const selectedPlan = studentPlans.find((p) => p.track_id === selectedTrackId);
  const maxDay = selectedPlan?.vocab_tracks.day_count || 60;

  const handleSave = async () => {
    if (!selectedStudentId || !selectedTrackId) {
      setMessage({ type: 'error', text: '학생과 과정을 선택하세요' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/student/vocab/set-start-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_student_id: selectedStudentId,
          track_id: selectedTrackId,
          start_day_index: newDay,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update');
      }

      setMessage({ type: 'success', text: '저장되었습니다!' });
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : '오류가 발생했습니다',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6">
      {/* 학생 선택 */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">1. 학생 선택</h2>
        <select
          value={selectedStudentId}
          onChange={(e) => {
            setSelectedStudentId(e.target.value);
            setSelectedTrackId('');
            setNewDay(1);
          }}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">학생을 선택하세요</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.full_name || '이름 없음'}
            </option>
          ))}
        </select>
      </div>

      {/* 과정/Track 선택 */}
      {selectedStudent && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">2. 과정 선택</h2>
          {studentPlans.length === 0 ? (
            <p className="text-gray-500">이 학생에게 할당된 vocab 과정이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {studentPlans.map((plan) => (
                <label
                  key={plan.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50"
                >
                  <input
                    type="radio"
                    value={plan.track_id}
                    checked={selectedTrackId === plan.track_id}
                    onChange={(e) => {
                      setSelectedTrackId(e.target.value);
                      setNewDay(plan.start_day_index);
                    }}
                    className="mr-3"
                  />
                  <div>
                    <div className="font-medium">{plan.vocab_tracks.title}</div>
                    <div className="text-sm text-gray-500">
                      현재: Day {plan.start_day_index} / {plan.vocab_tracks.day_count}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Day 조정 */}
      {selectedPlan && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">3. Day 조정</h2>
          <div className="space-y-6">
            {/* 슬라이더 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">시작 Day</label>
                <span className="text-2xl font-bold text-blue-600">Day {newDay}</span>
              </div>
              <input
                type="range"
                min="1"
                max={maxDay}
                value={newDay}
                onChange={(e) => setNewDay(Number(e.target.value))}
                disabled={loading}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Day 1</span>
                <span>Day {maxDay}</span>
              </div>
            </div>

            {/* 빠른 선택 */}
            <div>
              <label className="text-sm font-medium block mb-2">빠른 선택</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 5, 10, 15, 20, 30, 45, maxDay].map((day) => {
                  if (day > maxDay) return null;
                  return (
                    <button
                      key={day}
                      onClick={() => setNewDay(day)}
                      disabled={loading}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        newDay === day
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

            {/* 직접 입력 */}
            <div>
              <label className="text-sm font-medium block mb-2">직접 입력</label>
              <input
                type="number"
                min="1"
                max={maxDay}
                value={newDay}
                onChange={(e) => setNewDay(Math.max(1, Math.min(maxDay, Number(e.target.value))))}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* 메시지 */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 저장 버튼 */}
      {selectedPlan && (
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '저장 중...' : '저장'}
        </button>
      )}
    </div>
  );
}
