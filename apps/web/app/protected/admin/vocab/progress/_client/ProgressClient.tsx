// apps/web/app/(protected)/admin/vocab/progress/_client/ProgressClient.tsx
"use client";

import React, { useState, useMemo } from "react";
import type { TrackSummary, StudentProgress } from "../actions";
import { listStudentProgressForTrackAction } from "../actions";
import { skipVocabDaysAction } from "../skip-day-action";

type SortKey = "name" | "grade" | "completed" | "cursor" | "last";

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : pct > 50 ? "bg-blue-500" : "bg-slate-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function ProgressClient({ tracks }: { tracks: TrackSummary[] }) {
  const [trackId, setTrackId] = useState<string>(tracks[0]?.id ?? "");
  const [rows, setRows] = useState<StudentProgress[]>([]);
  const [todayISO, setTodayISO] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("grade");
  const [sortAsc, setSortAsc] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [skippingStudentId, setSkippingStudentId] = useState<string | null>(null);
  const [skipDay, setSkipDay] = useState<number>(1);

  async function handleSkipDay(studentId: string) {
    if (!trackId) return;
    try {
      const result = await skipVocabDaysAction(studentId, trackId, skipDay);
      if (result.ok) {
        alert(result.message);
        loadProgress();
        setSkippingStudentId(null);
      } else {
        alert("오류: " + result.error);
      }
    } catch (e) {
      alert("오류 발생");
    }
  }

  async function loadProgress() {
    if (!trackId) return;
    setLoading(true);
    setError(null);
    setLoaded(false);
    try {
      const res = await listStudentProgressForTrackAction({ trackId });
      if ("error" in res) { setError(res.error); return; }
      setRows(res.rows);
      setTodayISO(res.todayISO);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  const grades = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.grade) set.add(r.grade);
    return Array.from(set).sort();
  }, [rows]);

  const sorted = useMemo(() => {
    let list = rows;
    if (gradeFilter) list = list.filter((r) => r.grade === gradeFilter);
    if (nameFilter.trim()) {
      const k = nameFilter.trim().toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(k) || r.loginId?.toLowerCase().includes(k));
    }
    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "grade") cmp = String(a.grade ?? "").localeCompare(String(b.grade ?? "")) || a.name.localeCompare(b.name);
      else if (sortKey === "completed") cmp = b.completedDays - a.completedDays;
      else if (sortKey === "cursor") cmp = b.cursorDay - a.cursorDay;
      else if (sortKey === "last") cmp = String(b.lastCompletedDate ?? "").localeCompare(String(a.lastCompletedDate ?? ""));
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, sortKey, sortAsc, gradeFilter, nameFilter]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(key === "grade" || key === "name"); }
  }

  function SortTh({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k;
    return (
      <th
        className="cursor-pointer select-none py-2 pr-4 text-left text-xs font-bold text-slate-500 hover:text-slate-800"
        onClick={() => toggleSort(k)}
      >
        {label} {active ? (sortAsc ? "↑" : "↓") : ""}
      </th>
    );
  }

  const selectedTrack = tracks.find((t) => t.id === trackId);
  const completedAll = rows.filter((r) => r.completedDays >= r.totalDays && r.totalDays > 0).length;
  const avgPct = rows.length > 0
    ? Math.round(rows.reduce((s, r) => s + (r.totalDays > 0 ? r.completedDays / r.totalDays : 0), 0) / rows.length * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* ── 트랙 선택 ── */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-48">
            <div className="text-xs font-bold text-slate-500 mb-1">트랙 선택</div>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={trackId}
              onChange={(e) => { setTrackId(e.target.value); setRows([]); setLoaded(false); }}
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {`${t.title ?? t.slug ?? t.id} (${t.total_days ?? "?"}일)`}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={loadProgress}
            disabled={loading || !trackId}
            className="h-10 px-6 rounded-2xl bg-slate-900 text-white font-extrabold text-sm disabled:opacity-40"
          >
            {loading ? "로딩..." : "현황 조회"}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-rose-700 font-semibold">❌ {error}</div>}
      </div>

      {/* ── 요약 카드 ── */}
      {loaded && rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "전체 학생", value: `${rows.length}명` },
            { label: "평균 진도", value: `${avgPct}%` },
            { label: "완주 학생", value: `${completedAll}명` },
            { label: "트랙 총 Days", value: `${selectedTrack?.total_days ?? "?"}일` },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-slate-500">{c.label}</div>
              <div className="text-2xl font-extrabold text-slate-900 mt-1">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── 테이블 ── */}
      {loaded && (
        <div className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="text-base font-extrabold text-slate-900">
              학생별 진도 {todayISO && <span className="text-sm font-normal text-slate-500 ml-2">기준일 {todayISO}</span>}
            </div>
            <div className="flex gap-2 ml-auto">
              <select
                className="rounded-xl border px-3 py-1.5 text-sm"
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
              >
                <option value="">전체 학년</option>
                {grades.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <input
                className="rounded-xl border px-3 py-1.5 text-sm w-36"
                placeholder="이름 검색"
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="text-sm text-slate-500">조건에 맞는 학생이 없습니다.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <SortTh k="name" label="이름" />
                    <SortTh k="grade" label="학년" />
                    <th className="py-2 pr-4 text-left text-xs font-bold text-slate-500">시작일</th>
                    <SortTh k="completed" label="완료 Days" />
                    <SortTh k="cursor" label="현재 커서" />
                    <th className="py-2 pr-4 text-left text-xs font-bold text-slate-500">진도율</th>
                    <SortTh k="last" label="마지막 완료" />
                    <th className="py-2 pr-4 text-left text-xs font-bold text-slate-500">Skip</th>
                    <th className="py-2 text-left text-xs font-bold text-slate-500">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.studentId} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2.5 pr-4">
                        <div className="font-semibold text-slate-800">{r.name}</div>
                        {r.loginId && <div className="text-xs text-slate-400 font-mono">{r.loginId}</div>}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">{r.grade || "—"}</td>
                      <td className="py-2.5 pr-4 text-xs font-mono text-slate-500">{r.startDate}</td>
                      <td className="py-2.5 pr-4">
                        <span className="font-bold text-slate-800">{r.completedDays}</span>
                        <span className="text-slate-400"> / {r.totalDays}</span>
                        {r.inProgressDays > 0 && (
                          <span className="ml-1 text-xs text-blue-600">(+{r.inProgressDays})</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">
                        Day {r.cursorDay}
                      </td>
                      <td className="py-2.5 pr-4">
                        <ProgressBar value={r.completedDays} total={r.totalDays} />
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-500">
                        {r.lastCompletedDate ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        {skippingStudentId === r.studentId ? (
                          <div className="flex gap-1">
                            <select
                              value={skipDay}
                              onChange={(e) => setSkipDay(parseInt(e.target.value))}
                              className="rounded px-2 py-1 text-xs border"
                            >
                              {Array.from({ length: r.totalDays }, (_, i) => i + 1).map((day) => (
                                <option key={day} value={day}>Day {day}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleSkipDay(r.studentId)}
                              className="rounded px-2 py-1 text-xs bg-blue-500 text-white font-semibold"
                            >
                              저장
                            </button>
                            <button
                              onClick={() => setSkippingStudentId(null)}
                              className="rounded px-2 py-1 text-xs bg-slate-300"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setSkippingStudentId(r.studentId); setSkipDay(r.cursorDay); }}
                            className="rounded px-2 py-1 text-xs bg-amber-50 text-amber-700 font-semibold hover:bg-amber-100"
                          >
                            ⏭️ Skip
                          </button>
                        )}
                      </td>
                      <td className="py-2.5">
                        {r.isPaused ? (
                          <span className="rounded-full px-2 py-0.5 text-xs font-bold bg-amber-50 text-amber-700">정지</span>
                        ) : r.completedDays >= r.totalDays && r.totalDays > 0 ? (
                          <span className="rounded-full px-2 py-0.5 text-xs font-bold bg-emerald-50 text-emerald-700">완주</span>
                        ) : r.nextAvailableDate && r.nextAvailableDate <= (todayISO || "9999") ? (
                          <span className="rounded-full px-2 py-0.5 text-xs font-bold bg-blue-50 text-blue-700">학습가능</span>
                        ) : (
                          <span className="rounded-full px-2 py-0.5 text-xs font-bold bg-slate-100 text-slate-500">대기</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {loaded && rows.length === 0 && (
        <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">
          이 트랙에 배정된 학생이 없습니다.
        </div>
      )}
    </div>
  );
}
