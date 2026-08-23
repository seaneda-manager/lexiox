'use client';

import { useState, useTransition } from 'react';
import { addCalendarEventAction, deleteCalendarEventAction, type CalendarEventType } from '../actions';

type EventRow = {
  id: string;
  event_type: CalendarEventType;
  title: string;
  event_date: string;
  replaces_date: string | null;
  note: string | null;
};

const TYPE_OPTIONS: { value: CalendarEventType; label: string }[] = [
  { value: 'exam', label: '📝 시험' },
  { value: 'makeup', label: '🔁 메이크업 수업' },
  { value: 'vacation', label: '🏖️ 휴가' },
  { value: 'absence', label: '🚫 결석' },
  { value: 'other', label: '📌 기타' },
];

const TYPE_LABEL: Record<CalendarEventType, string> = {
  exam: '시험', makeup: '메이크업', vacation: '휴가', absence: '결석', other: '기타',
};

const TYPE_COLOR: Record<CalendarEventType, string> = {
  exam: 'bg-sky-50 text-sky-700 border-sky-200',
  makeup: 'bg-violet-50 text-violet-700 border-violet-200',
  vacation: 'bg-amber-50 text-amber-700 border-amber-200',
  absence: 'bg-rose-50 text-rose-700 border-rose-200',
  other: 'bg-neutral-50 text-neutral-600 border-neutral-200',
};

export default function CalendarEventManager({
  studentId,
  initialEvents,
}: {
  studentId: string;
  initialEvents: EventRow[];
}) {
  const [events, setEvents] = useState<EventRow[]>(initialEvents);
  const [eventType, setEventType] = useState<CalendarEventType>('exam');
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [replacesDate, setReplacesDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    const result = await addCalendarEventAction(studentId, {
      eventType,
      title,
      eventDate,
      replacesDate: replacesDate || null,
      note: note || null,
    });
    setSaving(false);
    if ('error' in result) { setError(result.error); return; }

    setEvents((prev) =>
      [...prev, { id: crypto.randomUUID(), event_type: eventType, title: title.trim(), event_date: eventDate, replaces_date: eventType === 'makeup' ? (replacesDate || null) : null, note: note || null }]
        .sort((a, b) => a.event_date.localeCompare(b.event_date))
    );
    setTitle(''); setEventDate(''); setReplacesDate(''); setNote('');
  };

  const handleDelete = (id: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    startTransition(() => { void deleteCalendarEventAction(studentId, id); });
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map((e) => {
            const isPast = e.event_date < today;
            return (
              <div
                key={e.id}
                className={`flex items-start justify-between gap-3 rounded-2xl border p-4 ${isPast ? 'opacity-50 border-neutral-100 bg-neutral-50' : 'border-neutral-200 bg-white'}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${TYPE_COLOR[e.event_type]}`}>
                      {TYPE_LABEL[e.event_type]}
                    </span>
                    <span className="text-sm font-semibold text-neutral-800">{e.title}</span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-1">
                    {new Date(e.event_date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                    {e.replaces_date && ` · 대체: ${new Date(e.replaces_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 수업`}
                  </p>
                  {e.note && <p className="text-[11px] text-neutral-400 mt-0.5">{e.note}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(e.id)}
                  className="shrink-0 text-neutral-300 hover:text-red-400 text-sm"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-neutral-400">
          아직 등록된 이벤트가 없습니다.
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-400">이벤트 추가</h2>

        <div className="flex flex-wrap gap-1.5">
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setEventType(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                eventType === opt.value ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 text-neutral-600 hover:border-neutral-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-neutral-600">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={eventType === 'exam' ? 'TOEFL 모의고사' : eventType === 'makeup' ? '보충 수업' : '제목'}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-neutral-600">날짜 *</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
          {eventType === 'makeup' && (
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <label className="text-xs font-semibold text-neutral-600">대체하는 원래 수업일</label>
              <input
                type="date"
                value={replacesDate}
                onChange={(e) => setReplacesDate(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
            </div>
          )}
          <div className="space-y-1 col-span-2 sm:col-span-1">
            <label className="text-xs font-semibold text-neutral-600">메모 (선택)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !title.trim() || !eventDate}
          className="w-full rounded-xl bg-neutral-900 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
        >
          {saving ? '저장 중…' : '+ 이벤트 추가'}
        </button>
      </div>
    </div>
  );
}
