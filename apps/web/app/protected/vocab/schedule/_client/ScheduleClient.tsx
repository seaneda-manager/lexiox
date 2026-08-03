"use client";

import React, { useEffect, useState } from "react";
import {
  createScheduleEventAction,
  getStudentScheduleEventsAction,
  deleteScheduleEventAction,
  ScheduleEvent,
} from "../actions";

type FormState = {
  event_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  description: string;
};

export default function ScheduleClient() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<FormState>({
    event_type: "exam",
    start_date: "",
    end_date: "",
    reason: "",
    description: "",
  });

  const eventTypes = [
    { value: "exam", label: "시험" },
    { value: "vacation", label: "휴가" },
    { value: "absence", label: "결석" },
    { value: "other", label: "기타" },
  ];

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    const res = await getStudentScheduleEventsAction();
    if (res.ok) {
      setEvents(res.events);
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.start_date || !form.end_date) {
      setMsg("❌ 날짜를 모두 입력하세요");
      return;
    }

    if (form.start_date > form.end_date) {
      setMsg("❌ 시작일이 종료일보다 클 수 없습니다");
      return;
    }

    setSubmitting(true);
    const res = await createScheduleEventAction({
      event_type: form.event_type,
      start_date: form.start_date,
      end_date: form.end_date,
      reason: form.reason || undefined,
      description: form.description || undefined,
    });

    if (res.ok) {
      setMsg(
        `✅ 일정 등록 완료! ${res.shiftResult.shifted_count}개 과제가 자동으로 조정되었습니다.`
      );
      setForm({
        event_type: "exam",
        start_date: "",
        end_date: "",
        reason: "",
        description: "",
      });
      loadEvents();
    } else {
      setMsg(`❌ ${res.error}`);
    }
    setSubmitting(false);
  }

  async function handleDelete(eventId: string) {
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;

    const res = await deleteScheduleEventAction({ eventId });
    if (res.ok) {
      setMsg("✅ 삭제되었습니다");
      loadEvents();
    } else {
      setMsg(`❌ ${res.error}`);
    }
  }

  if (loading) return <div className="p-6 text-center">로딩 중...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">학습 일정 관리</h1>

      {/* Registration Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">일정 등록</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">일정 유형</label>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                {eventTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">사유</label>
              <input
                type="text"
                placeholder="예: 중간고사, 여름방학"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2">시작일</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold mb-2">종료일</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">설명 (선택사항)</label>
            <textarea
              placeholder="상세 내용..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 h-20"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg disabled:opacity-50"
          >
            {submitting ? "등록 중..." : "일정 등록 (자동 조정 적용)"}
          </button>
        </form>

        {msg && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              msg.startsWith("✅")
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {msg}
          </div>
        )}

        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <span className="font-bold">💡 팁:</span> 일정을 등록하면 그 기간의 모든 미완료 과제가
            자동으로 뒤로 미뤄집니다. 예를 들어, 3일 시험이 있으면 시험 다음날부터 과제가 시작됩니다.
          </p>
        </div>
      </div>

      {/* Events List */}
      {events.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">등록된 일정</h2>
          <div className="space-y-3">
            {events.map((event) => {
              const duration =
                new Date(event.end_date).getTime() -
                new Date(event.start_date).getTime();
              const days = Math.ceil(duration / (1000 * 60 * 60 * 24)) + 1;

              const typeLabel = eventTypes.find(
                (t) => t.value === event.event_type
              )?.label;

              return (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">
                        {typeLabel} {event.reason ? `- ${event.reason}` : ""}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {event.start_date} ~ {event.end_date} ({days}일)
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-700 mt-1">
                          {event.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 items-start">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          event.is_applied
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {event.is_applied ? "✓ 적용됨" : "대기 중"}
                      </span>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs font-bold"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {events.length === 0 && !loading && (
        <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-600">
          <p>등록된 일정이 없습니다.</p>
          <p className="text-sm mt-2">위의 폼에서 시험, 휴가 등을 등록하면 자동으로 학습 일정이 조정됩니다!</p>
        </div>
      )}
    </div>
  );
}
