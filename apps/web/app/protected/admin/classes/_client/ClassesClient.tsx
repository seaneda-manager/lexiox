"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMeetingAction,
  createClassAction,
  deleteClassAction,
  deleteMeetingAction,
  enrollStudentAction,
  generateUpcomingSessionsAction,
  listClassesAction,
  listStudentOptionsAction,
  listTeacherOptionsAction,
  unenrollStudentAction,
  updateClassAction,
  type ClassRow,
  type PersonOption,
} from "../actions";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function hhmm(t: string): string {
  return t.slice(0, 5);
}

export default function ClassesClient() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [teachers, setTeachers] = useState<PersonOption[]>([]);
  const [students, setStudents] = useState<PersonOption[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newTeacher, setNewTeacher] = useState("");

  const load = useCallback(async () => {
    const [c, t, s] = await Promise.all([listClassesAction(), listTeacherOptionsAction(), listStudentOptionsAction()]);
    if (c.ok) setClasses(c.classes ?? []);
    else setMsg(`❌ ${c.error}`);
    if (t.ok) setTeachers(t.teachers ?? []);
    if (s.ok) setStudents(s.students ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    setBusy(true);
    const res = await fn();
    if (res.ok) {
      if (okMsg) setMsg(`✅ ${okMsg}`);
      await load();
    } else {
      setMsg(`❌ ${res.error ?? "실패"}`);
    }
    setBusy(false);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    const res = await createClassAction({ name: newName, teacherId: newTeacher || null });
    if (res.ok) {
      setMsg("✅ 반을 만들었습니다");
      setNewName("");
      setNewTeacher("");
      setOpenId(res.id ?? null);
      await load();
    } else {
      setMsg(`❌ ${res.error}`);
    }
    setBusy(false);
  }

  async function handleGenerate() {
    setBusy(true);
    const res = await generateUpcomingSessionsAction({ days: 14 });
    if (res.ok) {
      const created = res.created ?? 0;
      setMsg(
        created > 0
          ? `✅ 활성 반 ${res.classes ?? 0}개의 앞으로 2주 수업 ${created}회를 만들었습니다`
          : "이미 앞으로 2주 수업이 모두 만들어져 있습니다 (새로 만들 것이 없음)"
      );
    } else {
      setMsg(`❌ ${res.error}`);
    }
    setBusy(false);
  }

  const activeCount = useMemo(() => classes.filter((c) => c.is_active).length, [classes]);

  return (
    <div className="space-y-5">
      {msg && (
        <div
          className={`rounded-lg p-3 text-sm ${
            msg.startsWith("✅") ? "bg-green-100 text-green-800" : msg.startsWith("❌") ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"
          }`}
        >
          {msg}
        </div>
      )}

      {/* 새 반 */}
      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-bold">새 반 만들기</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-500">반 이름</span>
            <input
              className="w-56 rounded border px-3 py-2"
              placeholder="예: 월수 4시 TOEFL반"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-gray-500">담당 교사 (선택)</span>
            <select className="w-44 rounded border px-3 py-2" value={newTeacher} onChange={(e) => setNewTeacher(e.target.value)}>
              <option value="">미정</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={busy || !newName.trim()}
            onClick={handleCreate}
          >
            만들기
          </button>
        </div>
      </div>

      {/* 회차 생성 */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-blue-50 p-4">
        <div className="text-sm text-blue-900">
          <b>수업 회차 만들기</b> — 활성 반 {activeCount}개의 주간 시간표로 앞으로 2주치 수업을 만듭니다. 여러 번 눌러도 중복 생성되지 않습니다.
        </div>
        <button
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={busy || activeCount === 0}
          onClick={handleGenerate}
        >
          앞으로 2주 수업 만들기
        </button>
      </div>

      {/* 반 목록 */}
      {classes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-gray-400">
          아직 반이 없습니다. 위에서 첫 반을 만들어 보세요.
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((c) => {
            const open = openId === c.id;
            const memberIds = new Set(c.members.map((m) => m.student_id));
            const addable = students.filter((s) => !memberIds.has(s.id));
            return (
              <div key={c.id} className={`rounded-xl border bg-white ${c.is_active ? "" : "opacity-60"}`}>
                <button
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                  onClick={() => setOpenId(open ? null : c.id)}
                >
                  <div>
                    <div className="font-bold">
                      {c.name}
                      {!c.is_active && <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs">비활성</span>}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      담당 {c.teacher_name ?? "미정"} · 학생 {c.members.length}명 ·{" "}
                      {c.meetings.length === 0
                        ? "시간표 없음"
                        : c.meetings.map((m) => `${WEEKDAYS[m.weekday]} ${hhmm(m.start_time)}`).join(", ")}
                    </div>
                  </div>
                  <span className="text-gray-400">{open ? "▲" : "▼"}</span>
                </button>

                {open && (
                  <div className="space-y-5 border-t p-4">
                    {/* 기본 정보 */}
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="text-sm">
                        <span className="mb-1 block text-xs text-gray-500">담당 교사</span>
                        <select
                          className="w-44 rounded border px-3 py-2"
                          value={c.teacher_id ?? ""}
                          disabled={busy}
                          onChange={(e) => run(() => updateClassAction({ id: c.id, teacherId: e.target.value || null }), "담당 교사를 바꿨습니다")}
                        >
                          <option value="">미정</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        className="rounded border px-3 py-2 text-sm disabled:opacity-50"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => updateClassAction({ id: c.id, isActive: !c.is_active }),
                            c.is_active ? "비활성으로 바꿨습니다 (새 수업이 생성되지 않음)" : "다시 활성화했습니다"
                          )
                        }
                      >
                        {c.is_active ? "비활성으로" : "다시 활성화"}
                      </button>
                      <button
                        className="rounded border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => {
                          if (!confirm(`"${c.name}" 반을 삭제할까요?\n(수업 기록이 있는 반은 삭제되지 않습니다)`)) return;
                          run(() => deleteClassAction({ id: c.id }), "삭제했습니다");
                        }}
                      >
                        삭제
                      </button>
                      <span className="text-xs text-gray-400">수업 기록 {c.session_count}회</span>
                    </div>

                    {/* 시간표 */}
                    <MeetingsEditor
                      classRow={c}
                      busy={busy}
                      onAdd={(weekday, startTime, durationMin) =>
                        run(() => addMeetingAction({ classId: c.id, weekday, startTime, durationMin }), "시간표를 추가했습니다")
                      }
                      onDelete={(id) => {
                        if (!confirm("이 시간표를 지울까요? (이미 만든 수업 회차는 그대로 남습니다)")) return;
                        run(() => deleteMeetingAction({ id }), "시간표를 지웠습니다");
                      }}
                    />

                    {/* 학생 */}
                    <div>
                      <h3 className="mb-2 text-sm font-bold">학생 ({c.members.length}명)</h3>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {c.members.length === 0 && <span className="text-xs text-gray-400">아직 배정된 학생이 없습니다</span>}
                        {c.members.map((m) => (
                          <span key={m.student_id} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm">
                            {m.name}
                            <button
                              className="text-gray-400 hover:text-red-600"
                              title="반에서 빼기"
                              disabled={busy}
                              onClick={() => run(() => unenrollStudentAction({ classId: c.id, studentId: m.student_id }), `${m.name}을(를) 반에서 뺐습니다`)}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <select
                        className="w-60 rounded border px-3 py-2 text-sm"
                        value=""
                        disabled={busy || addable.length === 0}
                        onChange={(e) => {
                          const id = e.target.value;
                          if (id) run(() => enrollStudentAction({ classId: c.id, studentId: id }), "학생을 배정했습니다");
                        }}
                      >
                        <option value="">{addable.length === 0 ? "추가할 학생 없음" : "+ 학생 추가…"}</option>
                        {addable.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MeetingsEditor(props: {
  classRow: ClassRow;
  busy: boolean;
  onAdd: (weekday: number, startTime: string, durationMin: number) => void;
  onDelete: (id: string) => void;
}) {
  const [weekday, setWeekday] = useState(1);
  const [time, setTime] = useState("16:00");
  const [duration, setDuration] = useState(90);

  return (
    <div>
      <h3 className="mb-2 text-sm font-bold">주간 시간표</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {props.classRow.meetings.length === 0 && <span className="text-xs text-gray-400">시간표가 없으면 수업 회차가 만들어지지 않습니다</span>}
        {props.classRow.meetings.map((m) => (
          <span key={m.id} className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1 text-sm text-blue-900">
            {WEEKDAYS[m.weekday]} {hhmm(m.start_time)} ({m.duration_min}분)
            <button
              className="text-blue-300 hover:text-red-600"
              title="시간표 지우기"
              disabled={props.busy}
              onClick={() => props.onDelete(m.id)}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-gray-500">요일</span>
          <select className="rounded border px-3 py-2" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
            {WEEKDAYS.map((w, i) => (
              <option key={w} value={i}>
                {w}요일
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-gray-500">시작 시간</span>
          <input type="time" className="rounded border px-3 py-2" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-gray-500">수업 시간(분)</span>
          <input
            type="number"
            min={10}
            max={600}
            step={5}
            className="w-24 rounded border px-3 py-2"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </label>
        <button
          className="rounded bg-gray-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={props.busy || !time || !(duration > 0)}
          onClick={() => props.onAdd(weekday, time, duration)}
        >
          시간표 추가
        </button>
      </div>
    </div>
  );
}
