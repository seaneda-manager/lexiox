// apps/web/app/(protected)/admin/vocab/progress/_client/ProgressClient.tsx
"use client";

import React, { useState, useMemo } from "react";
import type { TrackSummary, StudentProgress, DayDetail } from "../actions";
import {
  listStudentProgressForTrackAction,
  getStudentVocabDetailAction,
  setStudentVocabSpeedModeAction,
} from "../actions";
import { skipVocabDaysAction } from "../skip-day-action";

type SortKey = "name" | "grade" | "completed" | "cursor" | "last";

const STAGE_LABEL: Record<string, string> = {
  know: "뜻",
  spelling: "스펠링",
  speed: "스피드",
};

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function pct(v: number | null) {
  if (v === null || v === undefined) return null;
  // accuracy는 0~1로 저장된다. 과거 데이터에 0~100이 섞여 있어도 읽히게 둔다.
  return Math.round(v <= 1 ? v * 100 : v);
}

/** 학생 한 명의 Day별 상세 — 단계별 정확도와 틀린 단어 */
function StudentDetail({ days, loading, error }: { days: DayDetail[]; loading: boolean; error: string | null }) {
  if (loading) return <div className="px-4 py-3 text-xs text-slate-500">상세 불러오는 중…</div>;
  if (error) return <div className="px-4 py-3 text-xs text-rose-600">{error}</div>;
  if (days.length === 0) return <div className="px-4 py-3 text-xs text-slate-400">배정된 Day가 없습니다.</div>;

  const withActivity = days.filter((d) => d.stages.length > 0 || d.startedAt || d.completedAt);
  if (withActivity.length === 0) {
    return <div className="px-4 py-3 text-xs text-slate-400">아직 학습 기록이 없습니다.</div>;
  }

  return (
    <div className="space-y-1.5 px-4 py-3">
      {withActivity.map((d) => (
        <div key={d.setId} className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="font-bold text-slate-800">Day {d.dayIndex}</span>
            <span className="text-slate-400">
              시작 {fmtTime(d.startedAt)} · 완료 {fmtTime(d.completedAt)}
            </span>
            {!d.completedAt && d.startedAt && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-700">진행 중</span>
            )}
          </div>

          {d.stages.length === 0 ? (
            <p className="mt-2 text-[11px] text-slate-400">단계 기록 없음</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {d.stages.map((s, i) => {
                const acc = pct(s.accuracy);
                return (
                  <div key={`${s.stage}-${i}`} className="flex flex-wrap items-start gap-2 text-[11px]">
                    <span className="w-14 shrink-0 font-semibold text-slate-600">
                      {STAGE_LABEL[s.stage] ?? s.stage}
                    </span>
                    <span
                      className={`w-12 shrink-0 font-mono ${
                        acc === null ? "text-slate-300" : acc >= 70 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {acc === null ? "—" : `${acc}%`}
                    </span>
                    {s.passed === false && (
                      <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700">불합격</span>
                    )}
                    <span className="w-20 shrink-0 text-slate-400">{fmtTime(s.attemptedAt)}</span>
                    {s.wrongWords.length > 0 && (
                      <span className="flex flex-wrap gap-1">
                        {s.wrongWords.map((w, wi) => (
                          <span key={`${w}-${wi}`} className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                            {w}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

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
  const [trackSpeedMode, setTrackSpeedMode] = useState<"full" | "simple">("full");
  const [savingSpeedId, setSavingSpeedId] = useState<string | null>(null);

  // 학생별 상세 (한 번 불러온 건 캐시해서 다시 펼칠 때 재요청하지 않는다)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<string, DayDetail[]>>({});
  const [detailLoading, setDetailLoading] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<Record<string, string>>({});

  async function toggleDetail(studentId: string) {
    if (expandedId === studentId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(studentId);
    if (detailMap[studentId] || !trackId) return;

    setDetailLoading(studentId);
    try {
      const res = await getStudentVocabDetailAction({ studentId, trackId });
      // 이 저장소의 tsconfig에서는 res.ok로 유니온이 좁혀지지 않는다.
      // 기존 코드(progress/page.tsx)와 같은 "error" in res 관용구를 쓴다.
      if ("error" in res) {
        const message = res.error;
        setDetailError((prev) => ({ ...prev, [studentId]: message }));
      } else {
        const days = res.days;
        setDetailMap((prev) => ({ ...prev, [studentId]: days }));
      }
    } catch (e: any) {
      setDetailError((prev) => ({ ...prev, [studentId]: e?.message ?? "불러오기 실패" }));
    } finally {
      setDetailLoading(null);
    }
  }

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

  async function handleSetSpeedMode(studentId: string, mode: "full" | "simple" | null) {
    if (!trackId) return;
    setSavingSpeedId(studentId);
    try {
      const res = await setStudentVocabSpeedModeAction({ studentId, trackId, mode });
      if ("error" in res) {
        alert("오류: " + res.error);
        return;
      }
      setRows((prev) =>
        prev.map((r) => (r.studentId === studentId ? { ...r, speedMode: mode } : r)),
      );
    } catch (e) {
      alert("오류 발생");
    } finally {
      setSavingSpeedId(null);
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
      setTrackSpeedMode(res.trackSpeedMode ?? "full");
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
                    <th className="py-2 pr-4 text-left text-xs font-bold text-slate-500">
                      Speed <span className="font-normal text-slate-400">(자동={trackSpeedMode === "simple" ? "간략" : "정식"})</span>
                    </th>
                    <th className="py-2 text-left text-xs font-bold text-slate-500">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <React.Fragment key={r.studentId}>
                    <tr className="border-b last:border-0 hover:bg-slate-50">
                      <td className="py-2.5 pr-4">
                        <button
                          type="button"
                          onClick={() => toggleDetail(r.studentId)}
                          className="text-left"
                          title="Day별 상세 보기"
                        >
                          <div className="font-semibold text-slate-800 hover:text-blue-700">
                            <span className="mr-1 inline-block text-[10px] text-slate-400">
                              {expandedId === r.studentId ? "▼" : "▶"}
                            </span>
                            {r.name}
                          </div>
                          {r.loginId && <div className="text-xs text-slate-400 font-mono">{r.loginId}</div>}
                        </button>
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
                              {Array.from(
                                { length: r.totalDays - r.startDayIndex + 1 },
                                (_, i) => r.startDayIndex + i,
                              ).map((day) => (
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
                      <td className="py-2.5 pr-4">
                        <div className="flex gap-1">
                          {([
                            { val: null, label: "자동" },
                            { val: "full" as const, label: "정식" },
                            { val: "simple" as const, label: "간략" },
                          ]).map(({ val, label }) => {
                            const active = r.speedMode === val;
                            return (
                              <button
                                key={label}
                                disabled={savingSpeedId === r.studentId}
                                onClick={() => handleSetSpeedMode(r.studentId, val)}
                                className={[
                                  "rounded px-2 py-1 text-xs font-semibold transition-colors disabled:opacity-40",
                                  active
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                                ].join(" ")}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
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

                    {expandedId === r.studentId && (
                      <tr className="border-b bg-slate-50/60">
                        <td colSpan={10} className="p-0">
                          <StudentDetail
                            days={detailMap[r.studentId] ?? []}
                            loading={detailLoading === r.studentId}
                            error={detailError[r.studentId] ?? null}
                          />
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
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
