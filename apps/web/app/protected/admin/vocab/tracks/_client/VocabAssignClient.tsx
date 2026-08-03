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
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [editingId, setEditingId] = useState("");
  const [editingDay, setEditingDay] = useState(0);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [notices, setNotices] = useState<Notice[]>([]);

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
    setLoading(true);
    const res = await assignStudentAction({ studentId: selectedStudent, trackId: selectedTrack });
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
      loadQueue();
      loadNotices();
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

        <div className="grid grid-cols-3 gap-4 mb-4">
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
              disabled={loading || !selectedStudent || !selectedTrack}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg disabled:opacity-50"
            >
              배정
            </button>
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
                      {editingId === item.id ? (
                        <input
                          type="number"
                          min="1"
                          value={editingDay}
                          onChange={(e) => setEditingDay(Number(e.target.value))}
                          className="w-16 border rounded px-2 py-1"
                        />
                      ) : (
                        `Day ${item.day_index}`
                      )}
                    </td>
                    <td className="py-2 px-4 text-xs text-gray-600">{item.available_at}</td>
                    <td className="py-2 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        item.status === "ASSIGNED" ? "bg-blue-100 text-blue-700" :
                        item.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2 px-4 space-x-2">
                      {editingId === item.id ? (
                        <>
                          <button
                            onClick={updateDay}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                          >
                            저장
                          </button>
                          <button
                            onClick={() => setEditingId("")}
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
