"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  confirmRemainingPresentAction,
  setAttendanceAction,
  setSessionCancelledAction,
  toggleStepAction,
  type BoardStudent,
  type SessionBoard,
} from "../../actions";
import ParentNoticePanel from "./ParentNoticePanel";
import { formatKoreanDate, timeRange } from "@/lib/classes/dates";
import {
  ATTENDANCE_LABEL,
  checkState,
  havrutaQueue,
  stepsDoneCount,
  summarizeAttendance,
  type AttendanceStatus,
} from "@/lib/classes/sessionBoard";

const STATUS_ORDER: AttendanceStatus[] = ["present", "late", "absent", "excused"];

const STATUS_STYLE: Record<AttendanceStatus, { on: string; label: string }> = {
  present: { on: "bg-green-600 text-white border-green-600", label: "출석" },
  late: { on: "bg-amber-500 text-white border-amber-500", label: "지각" },
  absent: { on: "bg-red-600 text-white border-red-600", label: "결석" },
  excused: { on: "bg-slate-600 text-white border-slate-600", label: "사유" },
};

// 이 두 단계 키가 흐름에 있으면 하브루타 대기열을 보여준다 (학원이 단계를 바꾸면 자동으로 숨는다)
const PREP_KEY = "havruta_prep";
const ONE_ON_ONE_KEY = "havruta_1on1";

function hhmm(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });
}

export default function BoardClient({ initial }: { initial: SessionBoard }) {
  const { session, flow } = initial;
  const [students, setStudents] = useState<BoardStudent[]>(initial.students);
  const [status, setStatus] = useState(session.status);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [noticeTick, setNoticeTick] = useState(0);

  const cancelled = status === "cancelled";
  const stepKeys = useMemo(() => flow.map((f) => f.step_key), [flow]);

  const summary = useMemo(
    () =>
      summarizeAttendance(
        students.map((s) => s.student_id),
        students.filter((s) => s.attendance).map((s) => ({ student_id: s.student_id, status: s.attendance as AttendanceStatus }))
      ),
    [students]
  );
  const state = checkState(summary);

  const queue = useMemo(() => {
    if (!stepKeys.includes(PREP_KEY) || !stepKeys.includes(ONE_ON_ONE_KEY)) return null;
    return havrutaQueue({
      studentIds: students.map((s) => s.student_id),
      steps: new Map(students.map((s) => [s.student_id, s.steps])),
      attendance: new Map(students.filter((s) => s.attendance).map((s) => [s.student_id, s.attendance as AttendanceStatus])),
      prepKey: PREP_KEY,
      oneOnOneKey: ONE_ON_ONE_KEY,
    });
  }, [students, stepKeys]);

  const nameOf = (id: string) => students.find((s) => s.student_id === id)?.name ?? "";

  function patch(studentId: string, fn: (s: BoardStudent) => BoardStudent) {
    setStudents((prev) => prev.map((s) => (s.student_id === studentId ? fn(s) : s)));
  }

  async function setAttendance(studentId: string, next: AttendanceStatus) {
    const before = students.find((s) => s.student_id === studentId);
    if (!before || before.attendance === next) return;
    patch(studentId, (s) => ({ ...s, attendance: next }));
    if (status === "scheduled") setStatus("held");
    const res = await setAttendanceAction({ sessionId: session.id, studentId, status: next });
    if (!res.ok) {
      patch(studentId, (s) => ({ ...s, attendance: before.attendance }));
      setMsg(`❌ ${res.error}`);
    } else {
      setMsg("");
      setNoticeTick((t) => t + 1); // 서버 저장 완료 → 학부모 안내 목록 새로고침
    }
  }

  async function toggleStep(studentId: string, stepKey: string) {
    const before = students.find((s) => s.student_id === studentId);
    if (!before) return;
    const wasDone = !!before.steps[stepKey]?.done_at;
    const optimistic = new Date().toISOString();
    patch(studentId, (s) => ({ ...s, steps: { ...s.steps, [stepKey]: { done_at: wasDone ? null : optimistic } } }));
    const res = await toggleStepAction({ sessionId: session.id, studentId, stepKey, done: !wasDone });
    if (!res.ok) {
      patch(studentId, (s) => ({ ...s, steps: { ...s.steps, [stepKey]: before.steps[stepKey] } }));
      setMsg(`❌ ${res.error}`);
    } else {
      const at = res.done_at ?? null;
      patch(studentId, (s) => ({ ...s, steps: { ...s.steps, [stepKey]: { done_at: at } } }));
      setMsg("");
    }
  }

  async function confirmAll() {
    setBusy(true);
    const res = await confirmRemainingPresentAction({ sessionId: session.id });
    if (res.ok) {
      setStudents((prev) => prev.map((s) => (s.attendance ? s : { ...s, attendance: "present" })));
      if (status === "scheduled") setStatus("held");
      setMsg(`✅ 기록 없던 학생 ${res.created ?? 0}명을 출석으로 확정했습니다`);
      setNoticeTick((t) => t + 1);
    } else setMsg(`❌ ${res.error}`);
    setBusy(false);
  }

  async function cancelSession() {
    const reason = prompt("휴강 사유를 입력하세요 (선택)", "");
    if (reason === null) return;
    setBusy(true);
    const res = await setSessionCancelledAction({ sessionId: session.id, cancelled: true, reason });
    if (res.ok) {
      setStatus("cancelled");
      setMsg("휴강 처리했습니다");
    } else setMsg(`❌ ${res.error}`);
    setBusy(false);
  }

  async function restoreSession() {
    setBusy(true);
    const res = await setSessionCancelledAction({ sessionId: session.id, cancelled: false });
    if (res.ok) {
      setStatus("scheduled");
      setMsg("휴강을 취소했습니다");
    } else setMsg(`❌ ${res.error}`);
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-5xl px-3 py-5">
      <Link className="text-sm text-blue-600 underline" href={`/teacher/session?date=${session.session_date}`}>
        ← 수업 목록
      </Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{session.class_name}</h1>
          <div className="mt-1 text-sm text-gray-600">
            {formatKoreanDate(session.session_date)} · {timeRange(session.start_time, session.duration_min)}
            {session.kind !== "regular" && <span className="ml-2 rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">{session.kind === "makeup" ? "보강" : "임시"}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cancelled ? (
            <button className="rounded border bg-white px-3 py-2 text-sm" disabled={busy} onClick={restoreSession}>
              휴강 취소
            </button>
          ) : (
            <>
              <button
                className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={busy || summary.unchecked === 0}
                onClick={confirmAll}
                title="아직 기록이 없는 학생을 모두 출석으로 저장합니다. 이미 지각/결석으로 정한 학생은 그대로 둡니다."
              >
                {summary.unchecked === 0 ? "출석 체크 완료" : `나머지 ${summary.unchecked}명 출석 확정`}
              </button>
              <button className="rounded border bg-white px-3 py-2 text-sm text-gray-600" disabled={busy} onClick={cancelSession}>
                휴강 처리
              </button>
            </>
          )}
        </div>
      </div>

      {msg && (
        <div className={`mt-3 rounded-lg p-3 text-sm ${msg.startsWith("✅") ? "bg-green-100 text-green-800" : msg.startsWith("❌") ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-700"}`}>
          {msg}
        </div>
      )}

      {cancelled ? (
        <div className="mt-5 rounded-xl border border-dashed bg-white p-8 text-center text-gray-500">
          휴강된 수업입니다{session.cancel_reason ? ` (${session.cancel_reason})` : ""}.
        </div>
      ) : (
        <>
          {/* 상단 요약 */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 text-sm">
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                state === "unchecked" ? "bg-red-100 text-red-700" : state === "partial" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-700"
              }`}
            >
              {state === "unchecked" ? "미체크" : state === "partial" ? "일부 체크" : "체크 완료"}
            </span>
            <span>출석 {summary.present}</span>
            <span>지각 {summary.late}</span>
            <span>결석 {summary.absent}</span>
            <span>사유결석 {summary.excused}</span>
            {summary.unchecked > 0 && <span className="text-red-600">미체크 {summary.unchecked}</span>}
          </div>

          {/* 하브루타 대기열 */}
          {queue && (
            <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <div className="text-xs font-semibold text-indigo-900">하브루타 1:1 대기 ({queue.length}명) — 준비를 먼저 끝낸 순서</div>
              {queue.length === 0 ? (
                <div className="mt-1 text-xs text-indigo-700">대기 중인 학생이 없습니다.</div>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {queue.map((id, i) => (
                    <span key={id} className="rounded-full bg-white px-3 py-1 text-sm shadow-sm">
                      <b className="mr-1 text-indigo-600">{i + 1}</b>
                      {nameOf(id)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 보드 */}
          {students.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed bg-white p-8 text-center text-sm text-gray-500">
              이 수업에 배정된 학생이 없습니다. 반 관리에서 학생을 배정하세요.
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-gray-600">
                  <tr>
                    <th className="sticky left-0 bg-slate-50 px-3 py-2">학생</th>
                    <th className="px-3 py-2">출석</th>
                    {flow.map((f) => (
                      <th key={f.step_key} className="px-3 py-2 text-center">
                        {f.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center">진행</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => {
                    const absentLike = s.attendance === "absent" || s.attendance === "excused";
                    const done = stepsDoneCount(s.steps, stepKeys);
                    return (
                      <tr key={s.student_id} className={`border-t ${absentLike ? "bg-slate-50 text-gray-400" : ""}`}>
                        <td className="sticky left-0 whitespace-nowrap bg-inherit px-3 py-2 font-medium">{s.name}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {STATUS_ORDER.map((st) => {
                              const active = s.attendance === st;
                              return (
                                <button
                                  key={st}
                                  className={`rounded border px-2 py-1 text-xs ${active ? STATUS_STYLE[st].on : "bg-white text-gray-600 hover:bg-gray-50"}`}
                                  onClick={() => setAttendance(s.student_id, st)}
                                  title={ATTENDANCE_LABEL[st]}
                                >
                                  {STATUS_STYLE[st].label}
                                </button>
                              );
                            })}
                            {!s.attendance && <span className="ml-1 self-center text-xs text-red-500">미체크</span>}
                          </div>
                        </td>
                        {flow.map((f) => {
                          const at = s.steps[f.step_key]?.done_at;
                          return (
                            <td key={f.step_key} className="px-3 py-2 text-center">
                              <button
                                disabled={absentLike}
                                onClick={() => toggleStep(s.student_id, f.step_key)}
                                className={`h-9 w-14 rounded-lg border text-xs ${
                                  at ? "border-blue-600 bg-blue-600 font-medium text-white" : "bg-white text-gray-400 hover:bg-gray-50"
                                } disabled:opacity-40`}
                                title={at ? `${hhmm(at)} 완료 — 누르면 취소` : "완료로 표시"}
                              >
                                {at ? hhmm(at) : "—"}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center text-xs text-gray-500">
                          {done}/{flow.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 출석이 서버에 저장된 뒤(noticeTick 증가)에만 안내 목록을 다시 읽는다 — 저장 전 상태를 읽는 경쟁을 피함 */}
          <ParentNoticePanel sessionId={session.id} attendanceKey={String(noticeTick)} />

          <p className="mt-3 text-xs text-gray-400">
            출석은 직접 눌러서 정합니다(지각 기준 5분은 선생님 판단). 아무도 안 눌렀을 때는 &quot;나머지 출석 확정&quot;으로 한 번에 저장하세요. 단계는 눌러서 완료 표시하고, 다시 누르면 취소됩니다.
          </p>
        </>
      )}
    </div>
  );
}
