"use client";

import { useEffect, useState } from "react";
import {
  listStudentsAction,
  listTracksAction,
  assignStudentAction,
  getStudentQueueAction,
  updateAssignmentDayAction,
  getStudentNoticesAction,
  markNoticeReadAction,
  dismissNoticeAction,
  updateAssignmentAvailableDateAction,
  markAssignmentCompletedAction,
} from "../actions";

type Student = { id: string; full_name: string | null; login_id: string | null; grade: string | null };
type Track = { id: string; title: string | null; slug: string | null; total_days: number | null };
type QueueItem = { id: string; day_index: number; status: string; available_at: string; started_at: string | null; completed_at: string | null };
type Notice = { id: string; student_id: string; assignment_id: string; track_id: string; day_index: number; notice_type: string; status: string; created_at: string };

export default function VocabAssignClient() {
  const [students, setStudents] = useState<Student[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedTrack, setSelectedTrack] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 3]); // 월, 수
  const [weekdayPreset, setWeekdayPreset] = useState("mon-wed"); // 기본값
  const [startDay, setStartDay] = useState(1); // Start Day (1~20)
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [editingId, setEditingId] = useState("");
  const [editingDay, setEditingDay] = useState(0);
  const [editingAvailableDate, setEditingAvailableDate] = useState("");
  const [editMode, setEditMode] = useState<"day" | "date" | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);

  const weekdayPresets: Record<string, { label: string; days: number[] }> = {
    "mon-wed": { label: "월, 수 (주 2회)", days: [1, 3] },
    "tue-thu": { label: "화, 목 (주 2회)", days: [2, 4] },
    "mon-thu": { label: "월, 목 (주 2회)", days: [1, 4] },
    "tue-fri": { label: "화, 금 (주 2회)", days: [2, 5] },
    "custom": { label: "커스텀", days: [] },
  };

  const weekdayNames = ["월", "화", "수", "목", "금", "토", "일"];

  function handlePresetChange(preset: string) {
    setWeekdayPreset(preset);
    if (preset !== "custom") {
      setSelectedWeekdays(weekdayPresets[preset].days);
    }
  }

  function toggleWeekday(day: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
    setWeekdayPreset("custom");
  }

  useEffect(() => {
    async function load() {
      const [sRes, tRes] = await Promise.all([listStudentsAction(), listTracksAction()]);
      if (sRes.ok) setStudents(sRes.students);
      if (tRes.ok) setTracks(tRes.tracks);
    }
    load();
  }, []);

  async function loadNotices() {
    if (!selectedStudent) return;
    const res = await getStudentNoticesAction({ studentId: selectedStudent });
    if (res.ok) setNotices(res.notices);
  }

  useEffect(() => {
    loadNotices();
  }, [selectedStudent]);

  async function handleAssign() {
    if (!selectedStudent || !selectedTrack) {
      setMsg("❌ 학생과 트랙을 선택하세요");
      return;
    }
    if (selectedWeekdays.length === 0) {
      setMsg("❌ 최소 1개 이상의 요일을 선택하세요");
      return;
    }
    setLoading(true);
    const res = await assignStudentAction({
      studentId: selectedStudent,
      trackId: selectedTrack,
      weekdays: selectedWeekdays,
      startDay: startDay,
    });
    if (res.ok) {
      setMsg("✅ 배정 완료");
      loadQueue();
      loadNotices();
    } else {
      setMsg(`❌ ${res.error}`);
    }
    setLoading(false);
  }

  async function loadQueue() {
    if (!selectedStudent || !selectedTrack) return;
    const res = await getStudentQueueAction({ studentId: selectedStudent, trackId: selectedTrack });
    if (res.ok) setQueue(res.queue);
  }

  async function updateDay() {
    if (!editingId || editingDay < 1) return;
    const res = await updateAssignmentDayAction({ assignmentId: editingId, newDayIndex: editingDay });
    if (res.ok) {
      setMsg("✅ Day 변경 완료");
      setEditingId("");
      setEditMode(null);
      loadQueue();
      loadNotices();
    } else {
      setMsg(`❌ ${res.error}`);
    }
  }

  async function updateAvailableDate() {
    if (!editingId || !editingAvailableDate) return;
    const res = await updateAssignmentAvailableDateAction({
      assignmentId: editingId,
      newAvailableAt: editingAvailableDate,
    });
    if (res.ok) {
      setMsg("✅ 오픈일 변경 완료");
      setEditingId("");
      setEditingAvailableDate("");
      setEditMode(null);
      loadQueue();
    } else {
      setMsg(`❌ ${res.error}`);
    }
  }

  async function handleMarkNoticeRead(noticeId: string) {
    const res = await markNoticeReadAction({ noticeId });
    if (res.ok) {
      loadNotices();
    }
  }

  async function handleDismissNotice(noticeId: string) {
    const res = await dismissNoticeAction({ noticeId });
    if (res.ok) {
      loadNotices();
    }
  }

  async function handleMarkCompleted(assignmentId: string) {
    const res = await markAssignmentCompletedAction({ assignmentId });
    if (res.ok) {
      setMsg("✅ 완료됨");
      loadQueue();
    } else {
      setMsg(`❌ ${res.error}`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {notices.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-bold text-red-900 mb-3">미완료 알림 ({notices.length}개)</h3>
          <div className="space-y-2">
            {notices.map((notice) => (
              <div key={notice.id} className="bg-white rounded p-3 flex justify-between items-center">
                <div>
                  <p className="font-bold text-sm">Day {notice.day_index}</p>
                  <p className="text-xs text-gray-500">{new Date(notice.created_at).toLocaleString()}</p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleMarkNoticeRead(notice.id)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
                  >
                    확인
                  </button>
                  <button
                    onClick={() => handleDismissNotice(notice.id)}
                    className="bg-gray-400 text-white px-3 py-1 rounded text-xs hover:bg-gray-500"
                  >
                    무시
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">단어 학습 배정</h1>

        <div className="space-y-4 mb-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">학생</label>
              <select
                value={selectedStudent}
                onChange={(e) => {
                  setSelectedStudent(e.target.value);
                  setQueue([]);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">선택하세요</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.login_id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">트랙</label>
              <select
                value={selectedTrack}
                onChange={(e) => {
                  setSelectedTrack(e.target.value);
                  setQueue([]);
                }}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">선택하세요</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.total_days}일)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleAssign}
                disabled={loading || !selectedStudent || !selectedTrack || selectedWeekdays.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg disabled:opacity-50"
              >
                배정
              </button>
            </div>
          </div>

          {/* Weekday Selection */}
          <div className="border-t pt-4">
            <label className="block text-sm font-bold mb-3">수업 요일 선택</label>

            {/* Presets */}
            <div className="flex gap-2 mb-3 flex-wrap">
              {Object.entries(weekdayPresets).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => handlePresetChange(key)}
                  className={`px-3 py-1 rounded text-xs font-bold transition ${
                    weekdayPreset === key
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom Weekday Selection */}
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <button
                  key={day}
                  onClick={() => toggleWeekday(day)}
                  className={`w-10 h-10 rounded font-bold transition ${
                    selectedWeekdays.includes(day)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  title={["월", "화", "수", "목", "금", "토", "일"][day - 1]}
                >
                  {weekdayNames[day - 1]}
                </button>
              ))}
            </div>

            {/* Start Day Selection */}
            <div className="border-t pt-4 mt-4">
              <label className="block text-sm font-bold mb-2">시작 Day (1~20)</label>
              <input
                type="number"
                min="1"
                max="20"
                value={startDay}
                onChange={(e) => setStartDay(Math.max(1, Math.min(20, Number(e.target.value))))}
                className="w-full border rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-600 mt-1">Day {startDay}부터 시작합니다</p>
            </div>
          </div>
        </div>

        {msg && (
          <div className={`p-3 rounded-lg mb-4 ${msg.startsWith("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {msg}
          </div>
        )}
      </div>

      {queue.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">배정 큐 ({queue.length}개)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-4">Day</th>
                  <th className="text-left py-2 px-4">오픈일</th>
                  <th className="text-left py-2 px-4">상태</th>
                  <th className="text-left py-2 px-4">동작</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4 font-bold">
                      {editingId === item.id && editMode === "day" ? (
                        <input
                          type="number"
                          min="1"
                          value={editingDay}
                          onChange={(e) => setEditingDay(Number(e.target.value))}
                          className="w-16 border rounded px-2 py-1"
                          autoFocus
                        />
                      ) : (
                        `Day ${item.day_index}`
                      )}
                    </td>
                    <td className="py-2 px-4 text-xs text-gray-600 cursor-pointer hover:bg-blue-50 rounded">
                      {editingId === item.id && editMode === "date" ? (
                        <input
                          type="date"
                          value={editingAvailableDate}
                          onChange={(e) => setEditingAvailableDate(e.target.value)}
                          className="border rounded px-2 py-1"
                          autoFocus
                        />
                      ) : (
                        <span onClick={() => {
                          setEditingId(item.id);
                          setEditMode("date");
                          setEditingAvailableDate(item.available_at);
                        }}>
                          {item.available_at}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4">
                      <button
                        onClick={() => {
                          if (item.status !== "COMPLETED") {
                            handleMarkCompleted(item.id);
                          }
                        }}
                        disabled={item.status === "COMPLETED"}
                        className={`px-2 py-1 rounded text-xs font-bold cursor-pointer transition ${
                          item.status === "COMPLETED" ? "bg-green-100 text-green-700 opacity-50 cursor-not-allowed" :
                          item.status === "ASSIGNED" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                          "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        title={item.status === "COMPLETED" ? "완료됨" : "클릭하여 완료 표시"}
                      >
                        {item.status}
                      </button>
                    </td>
                    <td className="py-2 px-4 space-x-2">
                      {editingId === item.id ? (
                        <>
                          <button
                            onClick={editMode === "day" ? updateDay : updateAvailableDate}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => {
                              setEditingId("");
                              setEditMode(null);
                            }}
                            className="bg-gray-400 text-white px-3 py-1 rounded text-xs hover:bg-gray-500"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(item.id);
                            setEditingDay(item.day_index);
                            setEditMode("day");
                          }}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                        >
                          Day 변경
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
