// apps/web/app/(protected)/admin/vocab/Tracks/_client/TrackAssignClient.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { StudentLite, TrackLite, AssignmentLite, StudentPlanLite, StudentBreakLite } from "../actions";
import {
  createStudentVocabPlanAction,
  getStudentPlanAndQueueAction,
  ensureCockedQueueAdminAction,
  assignNextSetNowAction,
  cancelStudentVocabAssignmentAction,
  linkSetsToTrackAction,
} from "../actions";

const WEEKDAY_LABELS = ["", "월", "화", "수", "목", "금", "토", "일"];
const STATUS_COLOR: Record<string, string> = {
  ASSIGNED: "text-blue-700 bg-blue-50",
  COMPLETED: "text-emerald-700 bg-emerald-50",
  SKIPPED: "text-slate-500 bg-slate-100",
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function WeekBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-9 w-10 rounded-full border text-sm font-extrabold transition-colors",
        active ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 hover:border-slate-400",
      ].join(" ")}
    >
      {WEEKDAY_LABELS[n]}
    </button>
  );
}

function PlanCard({ plan }: { plan: StudentPlanLite }) {
  const days = (plan.weekdays ?? []).map((d) => WEEKDAY_LABELS[d] ?? d).join(" · ");
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm md:grid-cols-3">
      <div>
        <div className="text-xs text-slate-500">시작일</div>
        <div className="font-semibold">{plan.start_date}</div>
      </div>
      <div>
        <div className="text-xs text-slate-500">요일</div>
        <div className="font-semibold">{days || "—"}</div>
      </div>
      <div>
        <div className="text-xs text-slate-500">활성 캡</div>
        <div className="font-semibold">{plan.max_active_sets ?? 2}</div>
      </div>
      <div>
        <div className="text-xs text-slate-500">시작 Day</div>
        <div className="font-semibold">{plan.start_day_index ?? 1}</div>
      </div>
      <div>
        <div className="text-xs text-slate-500">현재 커서</div>
        <div className="font-semibold">{plan.cursor_day_index ?? "—"}</div>
      </div>
      <div>
        <div className="text-xs text-slate-500">상태</div>
        <div className={`font-semibold ${plan.is_paused ? "text-amber-600" : "text-emerald-600"}`}>
          {plan.is_paused ? `일시정지${plan.paused_reason ? ` · ${plan.paused_reason}` : ""}` : "진행중"}
        </div>
      </div>
    </div>
  );
}

export default function TrackAssignClient({
  initialStudents,
  initialTracks,
  selectedTrackId,
  selectedSetIds = [],
}: {
  initialStudents: StudentLite[];
  initialTracks: TrackLite[];
  selectedTrackId?: string;
  selectedSetIds?: string[];
}) {
  const [q, setQ] = useState("");
  const [linkingBusy, setLinkingBusy] = useState(false);
  const [linkMsg, setLinkMsg] = useState("");
  const students = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return initialStudents;
    return initialStudents.filter((s) => {
      return (
        String(s.full_name ?? "").toLowerCase().includes(k) ||
        String(s.login_id ?? "").toLowerCase().includes(k) ||
        String(s.id ?? "").toLowerCase().includes(k) ||
        String((s as any).grade ?? "").toLowerCase().includes(k)
      );
    });
  }, [q, initialStudents]);

  const [studentId, setStudentId] = useState<string>(initialStudents?.[0]?.id ?? "");
  const [trackId, setTrackId] = useState<string>(selectedTrackId ?? initialTracks?.[0]?.id ?? "");

  useEffect(() => {
    if (!studentId && initialStudents?.[0]?.id) setStudentId(initialStudents[0].id);
    if (!trackId && initialTracks?.[0]?.id) setTrackId(initialTracks[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStudents, initialTracks]);

  const [startDateISO, setStartDateISO] = useState<string>(todayISO());
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [maxActiveSets, setMaxActiveSets] = useState<number>(2);
  const [startDayIndex, setStartDayIndex] = useState<number>(1);
  const [cursorDayIndex, setCursorDayIndex] = useState<number | "">("");
  const [queueSize, setQueueSize] = useState<number>(3);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pausedReason, setPausedReason] = useState<string>("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [plan, setPlan] = useState<StudentPlanLite | null>(null);
  const [breaks, setBreaks] = useState<StudentBreakLite[]>([]);
  const [queue, setQueue] = useState<AssignmentLite[]>([]);
  const [stats, setStats] = useState<{ todayISO?: string; unlocked?: number; total?: number; maxActive?: number }>({});

  function toggleWeekday(n: number) {
    setWeekdays((prev) => {
      const next = prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n];
      return next.sort((a, b) => a - b);
    });
  }

  async function loadPlan() {
    setMsg("");
    if (!studentId || !trackId) return;
    setBusy(true);
    try {
      const res = await getStudentPlanAndQueueAction({ studentId, trackId });
      if ("error" in res) { setMsg(`❌ ${res.error}`); return; }
      setPlan(res.plan);
      setBreaks(res.breaks ?? []);
      setQueue(res.queue ?? []);
      setStats({ todayISO: res.todayISO, unlocked: res.unlockedCount, total: res.queueCount, maxActive: res.maxActive });
      if (res.plan) {
        setStartDateISO(res.plan.start_date ?? todayISO());
        setWeekdays(res.plan.weekdays ?? [1, 2, 3, 4, 5]);
        setMaxActiveSets(res.plan.max_active_sets ?? 2);
        setStartDayIndex(res.plan.start_day_index ?? 1);
        setCursorDayIndex(res.plan.cursor_day_index ?? "");
        setIsPaused(res.plan.is_paused ?? false);
        setPausedReason(res.plan.paused_reason ?? "");
      }
      setMsg("✅ 로드 완료");
    } finally {
      setBusy(false);
    }
  }

  async function savePlan() {
    setMsg("");
    if (!studentId || !trackId) return;
    if (weekdays.length === 0) { setMsg("❌ 요일을 최소 1개 선택하세요"); return; }
    setBusy(true);
    try {
      await createStudentVocabPlanAction({
        studentId, trackId, startDateISO, weekdays, maxActiveSets, startDayIndex,
        cursorDayIndex: cursorDayIndex === "" ? undefined : Number(cursorDayIndex),
        isPaused, pausedReason: pausedReason || null, queueSize,
      } as any);
      setMsg("✅ 플랜 저장 완료 (큐 자동 생성)");
      await loadPlan();
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "failed"}`);
    } finally {
      setBusy(false);
    }
  }

  async function recockQueue() {
    setMsg("");
    if (!studentId || !trackId) return;
    setBusy(true);
    try {
      await ensureCockedQueueAdminAction({ studentId, trackId, queueSize });
      setMsg("✅ 큐 정렬 완료");
      await loadPlan();
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "failed"}`);
    } finally {
      setBusy(false);
    }
  }

  async function assignNow() {
    setMsg("");
    if (!studentId || !trackId) return;
    setBusy(true);
    try {
      await assignNextSetNowAction({ studentId, trackId });
      setMsg("✅ 오늘 세트 1개 즉시 배정");
      await loadPlan();
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "failed"}`);
    } finally {
      setBusy(false);
    }
  }

  async function cancelAssignment(assignmentId: string, force = false) {
    if (force && !window.confirm("이미 시작/완료된 할당입니다. 강제로 삭제할까요?")) return;
    setMsg("");
    setBusy(true);
    try {
      await cancelStudentVocabAssignmentAction({ assignmentId, queueSize, force });
      setMsg(force ? "✅ 강제 삭제됨" : "✅ 취소됨");
      await loadPlan();
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "failed"}`);
    } finally {
      setBusy(false);
    }
  }

  const selectedStudent = initialStudents.find((s) => s.id === studentId);
  const selectedTrack = initialTracks.find((t) => t.id === trackId);

  async function handleLinkSetsToTrack() {
    if (!trackId || selectedSetIds.length === 0) {
      setLinkMsg("❌ 트랙과 세트를 선택하세요");
      return;
    }

    setLinkMsg("");
    setLinkingBusy(true);
    try {
      const res = await linkSetsToTrackAction(selectedSetIds, trackId);
      if (res.ok) {
        setLinkMsg("✅ 선택된 세트들이 트랙과 연결되었습니다");
      } else {
        setLinkMsg(`❌ ${res.error}`);
      }
    } finally {
      setLinkingBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* ── 학생 + 트랙 선택 ── */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-base font-extrabold text-slate-900">학생 · 트랙 선택</div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-1">학생 검색</div>
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="이름 / 아이디 / 학년"
            />
            <select
              className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
              value={studentId}
              onChange={(e) => { setStudentId(e.target.value); setPlan(null); setQueue([]); setMsg(""); }}
              size={Math.min(6, students.length + 1)}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {`${s.full_name ?? "(이름없음)"}${(s as any).grade ? ` · ${(s as any).grade}` : ""} · ${s.login_id ?? ""}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-500 mb-1">트랙</div>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={trackId}
              onChange={(e) => { setTrackId(e.target.value); setPlan(null); setQueue([]); setMsg(""); }}
              size={Math.min(6, initialTracks.length + 1)}
            >
              {initialTracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {`${t.title ?? t.slug ?? t.id} (${t.total_days ?? "?"}일)`}
                </option>
              ))}
            </select>

            {selectedStudent && selectedTrack && (
              <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <span className="font-extrabold text-slate-800">{selectedStudent.full_name}</span>
                {(selectedStudent as any).grade && (
                  <span className="ml-2 text-slate-500">{(selectedStudent as any).grade}</span>
                )}
                <span className="mx-2 text-slate-300">→</span>
                <span className="font-semibold text-slate-700">{selectedTrack.title ?? selectedTrack.slug}</span>
                <span className="ml-2 text-slate-400 text-xs">({selectedTrack.total_days}일)</span>
              </div>
            )}
          </div>
        </div>

        {/* 선택된 세트 연결 섹션 */}
        {selectedSetIds.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <div className="text-sm font-bold text-slate-600 mb-3">선택된 세트 ({selectedSetIds.length}개)</div>
            <button
              onClick={handleLinkSetsToTrack}
              disabled={linkingBusy || !trackId}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {linkingBusy ? "연결 중..." : "이 트랙과 연결"}
            </button>
            {linkMsg && (
              <div className={`mt-2 text-sm font-semibold ${linkMsg.startsWith("✅") ? "text-emerald-700" : "text-rose-700"}`}>
                {linkMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 플랜 설정 ── */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-base font-extrabold text-slate-900">플랜 설정</div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* 왼쪽: 시작일 + 요일 */}
          <div className="space-y-4">
            <div>
              <div className="text-xs font-bold text-slate-500 mb-1">시작일</div>
              <input
                type="date"
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={startDateISO}
                onChange={(e) => setStartDateISO(e.target.value)}
              />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500 mb-2">학습 요일</div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <WeekBtn key={d} n={d} active={weekdays.includes(d)} onClick={() => toggleWeekday(d)} />
                ))}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                선택됨: {weekdays.map((d) => WEEKDAY_LABELS[d]).join(", ") || "없음"}
              </div>
            </div>
          </div>

          {/* 오른쪽: 세부 옵션 */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1">큐 크기</div>
                <input type="number" min={1} max={20} className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={queueSize} onChange={(e) => setQueueSize(Number(e.target.value))} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1">동시 활성</div>
                <input type="number" min={1} max={20} className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={maxActiveSets} onChange={(e) => setMaxActiveSets(Number(e.target.value))} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1">시작 Day</div>
                <input type="number" min={1} className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={startDayIndex} onChange={(e) => setStartDayIndex(Number(e.target.value))} />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 mb-1">커서 Day</div>
                <input type="number" min={1} className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={cursorDayIndex} placeholder="자동"
                  onChange={(e) => setCursorDayIndex(e.target.value === "" ? "" : Number(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input id="pause" type="checkbox" checked={isPaused} onChange={(e) => setIsPaused(e.target.checked)} className="h-4 w-4" />
              <label htmlFor="pause" className="text-sm font-bold text-slate-700">일시정지</label>
              {isPaused && (
                <input className="flex-1 rounded-xl border px-3 py-1.5 text-sm"
                  value={pausedReason} onChange={(e) => setPausedReason(e.target.value)}
                  placeholder="정지 사유 (선택)" />
              )}
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <button type="button" onClick={loadPlan} disabled={busy || !studentId || !trackId}
            className="h-10 px-5 rounded-2xl border font-extrabold text-sm disabled:opacity-40">
            현황 불러오기
          </button>
          <button type="button" onClick={savePlan} disabled={busy || !studentId || !trackId}
            className="h-10 px-5 rounded-2xl bg-emerald-700 text-white font-extrabold text-sm disabled:opacity-40">
            플랜 저장
          </button>
          <button type="button" onClick={recockQueue} disabled={busy || !studentId || !trackId}
            className="h-10 px-5 rounded-2xl bg-slate-900 text-white font-extrabold text-sm disabled:opacity-40">
            큐 정렬
          </button>
          <button type="button" onClick={assignNow} disabled={busy || !studentId || !trackId}
            className="h-10 px-5 rounded-2xl border font-extrabold text-sm disabled:opacity-40">
            오늘 1개 즉시 배정
          </button>
        </div>

        {msg && (
          <div className={`mt-3 rounded-xl px-4 py-2 text-sm font-bold ${msg.startsWith("✅") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
            {msg}
          </div>
        )}
      </div>

      {/* ── 현재 플랜 ── */}
      {plan && (
        <div className="rounded-2xl border bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-base font-extrabold text-slate-900">현재 플랜</div>
            {stats.todayISO && (
              <div className="text-xs text-slate-500">
                오늘 {stats.todayISO} · 열린 {stats.unlocked}/{stats.total} · 캡 {stats.maxActive}
              </div>
            )}
          </div>
          <PlanCard plan={plan} />
        </div>
      )}

      {/* ── 방학/휴식 ── */}
      {breaks.length > 0 && (
        <div className="rounded-2xl border bg-amber-50 p-5">
          <div className="text-sm font-extrabold text-amber-900 mb-2">방학 / 휴식 기간</div>
          <div className="space-y-1">
            {breaks.map((b) => (
              <div key={b.id} className="flex gap-3 text-sm text-amber-800">
                <span className="font-mono">{b.start_date} ~ {b.end_date}</span>
                <span className="font-semibold">{b.mode}</span>
                {b.note && <span className="text-amber-600">{b.note}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 큐 테이블 ── */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-base font-extrabold text-slate-900 mb-3">
          배정 큐 {queue.length > 0 ? `(${queue.length}개)` : ""}
        </div>
        {queue.length === 0 ? (
          <div className="text-sm text-slate-500">배정된 항목이 없습니다. 플랜을 저장하거나 큐 정렬을 실행하세요.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b">
                  <th className="py-2 pr-4">Day</th>
                  <th className="py-2 pr-4">오픈일</th>
                  <th className="py-2 pr-4">상태</th>
                  <th className="py-2 pr-4">시작</th>
                  <th className="py-2 pr-4">완료</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {queue.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-2 pr-4 font-bold">Day {r.day_index}</td>
                    <td className="py-2 pr-4 font-mono text-xs">{r.available_at}</td>
                    <td className="py-2 pr-4">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_COLOR[r.status] ?? "text-slate-700"}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-slate-500">{r.started_at ? r.started_at.slice(0, 10) : "—"}</td>
                    <td className="py-2 pr-4 text-xs text-emerald-700">{r.completed_at ? r.completed_at.slice(0, 10) : "—"}</td>
                    <td className="py-2 flex gap-1.5">
                      <button
                        type="button"
                        disabled={busy || Boolean(r.started_at) || Boolean(r.completed_at)}
                        onClick={() => cancelAssignment(r.id)}
                        className="rounded-lg border px-3 py-1 text-xs font-bold disabled:opacity-30 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700"
                      >
                        취소
                      </button>
                      {(Boolean(r.started_at) || Boolean(r.completed_at)) && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => cancelAssignment(r.id, true)}
                          className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-30"
                        >
                          강제삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
