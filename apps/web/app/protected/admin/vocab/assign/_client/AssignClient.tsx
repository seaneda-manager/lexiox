// apps/web/app/(protected)/admin/vocab/assign/_client/AssignClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { StudentRow, TrackReadiness, CourseAssignResult } from "../actions";
import { assignCoursesAction } from "../actions";

const WEEKDAY_LABELS = ["", "월", "화", "수", "목", "금", "토", "일"];

const REASON_KO: Record<string, string> = {
  BEFORE_START_DATE:
    "시작일이 아직 오지 않았습니다. 시작일을 오늘이나 과거 날짜로 바꾸면 바로 열립니다.",
  NO_DAYS: "이 과정에는 세트가 없습니다.",
  EMPTY_SET: "세트에 단어가 없습니다.",
  PAUSED: "플랜이 일시정지 상태입니다.",
  PLAN_DISABLED: "플랜이 비활성화되어 있습니다.",
  BREAK_HALT: "방학/휴식 기간이라 배정이 멈춰 있습니다.",
  BREAK_SWITCH_NO_EXAM_TRACK: "시험 전환 기간인데 시험 과정이 지정되지 않았습니다.",
  INSERT_FAILED: "DB 저장에 실패했습니다.",
  GUARD_BREAK: "배정 루프 안전장치가 작동했습니다. 과정 구성을 확인하세요.",
  NO_PLAN: "플랜을 찾지 못했습니다.",
  UNKNOWN: "알 수 없는 이유로 배정되지 않았습니다.",
};

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function isoWeekday(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(y, m - 1, d).getDay();
  return wd === 0 ? 7 : wd;
}

function fmtDateKo(iso: string): string {
  if (!iso) return "-";
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}(${WEEKDAY_LABELS[isoWeekday(iso)]})`;
}

export default function AssignClient({
  students,
  tracks,
}: {
  students: StudentRow[];
  tracks: TrackReadiness[];
}) {
  const [q, setQ] = useState("");
  const [studentId, setStudentId] = useState<string>(students[0]?.id ?? "");
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState<string>(todayISO());
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [setsPerDay, setSetsPerDay] = useState<number>(1);
  const [showEmpty, setShowEmpty] = useState(false);

  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<CourseAssignResult[] | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  // 세트가 하나라도 있으면 선택 가능. 완전 비어있는(세트 0개) 과정만 숨긴다.
  const readyCourses = useMemo(() => tracks.filter((t) => t.mappedDays > 0), [tracks]);
  const emptyCourses = useMemo(() => tracks.filter((t) => t.mappedDays === 0), [tracks]);

  const filteredStudents = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return students;
    return students.filter(
      (s) =>
        String(s.full_name ?? "").toLowerCase().includes(k) ||
        String(s.login_id ?? "").toLowerCase().includes(k) ||
        String(s.grade ?? "").toLowerCase().includes(k),
    );
  }, [q, students]);

  const selectedStudent = students.find((s) => s.id === studentId) ?? null;
  const today = todayISO();
  const startsInFuture = startDate > today;
  const selectedCount = selectedTrackIds.size;

  function toggleTrack(id: string) {
    setResults(null);
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleWeekday(n: number) {
    setWeekdays((prev) =>
      (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]).sort((a, b) => a - b),
    );
  }

  async function handleAssign() {
    if (!studentId || selectedCount === 0) return;
    setBusy(true);
    setResults(null);
    setTopError(null);
    try {
      const courses = readyCourses
        .filter((t) => selectedTrackIds.has(t.id))
        .map((t) => ({ trackId: t.id, title: t.title ?? t.slug ?? t.id }));
      const res = await assignCoursesAction({
        studentId,
        courses,
        startDateISO: startDate,
        weekdays,
        setsPerDay,
      });
      if (res.error) setTopError(res.error);
      setResults(res.results);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* STEP 1: 학생 */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <StepDot n={1} />
          <h2 className="text-base font-bold text-neutral-900">학생 선택</h2>
          {selectedStudent && (
            <span className="ml-auto text-sm text-neutral-500">
              {selectedStudent.full_name ?? "(이름없음)"}
              {selectedStudent.grade ? ` · ${selectedStudent.grade}` : ""}
            </span>
          )}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 / 아이디 / 학년 검색"
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-neutral-400"
        />
        <select
          className="mt-2 w-full rounded-xl border px-3 py-2 text-sm"
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setResults(null);
          }}
          size={Math.min(6, filteredStudents.length + 1)}
        >
          {filteredStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {`${s.full_name ?? "(이름없음)"}${s.grade ? ` · ${s.grade}` : ""} · ${s.login_id ?? ""}`}
            </option>
          ))}
        </select>
      </section>

      {/* STEP 2: 과정 (다중) */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <StepDot n={2} />
          <h2 className="text-base font-bold text-neutral-900">과정 선택</h2>
          <span className="ml-auto text-xs text-neutral-400">
            여러 개 고를 수 있어요 {selectedCount > 0 ? `· ${selectedCount}개 선택됨` : ""}
          </span>
        </div>

        {readyCourses.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            배정 가능한 과정이 없습니다. (모든 과정이 비어있거나 세트에 단어가 없습니다.)
          </div>
        ) : (
          <div className="max-h-72 space-y-1.5 overflow-auto pr-1">
            {readyCourses.map((t) => {
              const checked = selectedTrackIds.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTrack(t.id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    checked
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-neutral-200 hover:border-neutral-300",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-xs font-bold",
                      checked
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-neutral-300 text-transparent",
                    ].join(" ")}
                  >
                    ✓
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-neutral-900">
                      {t.title ?? t.slug ?? t.id}
                    </div>
                    {t.emptyDays.length === 0 ? (
                      <div className="text-xs text-emerald-600">{t.readyDays}개 세트 · 준비됨</div>
                    ) : (
                      <div className="text-xs text-amber-600">
                        {t.readyDays}/{t.mappedDays}개 준비 · 빈 Day{" "}
                        {t.emptyDays.slice(0, 5).join(", ")}
                        {t.emptyDays.length > 5 ? "…" : ""}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 비어있는 과정 (접힘) */}
        {emptyCourses.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <button
              type="button"
              onClick={() => setShowEmpty((v) => !v)}
              className="text-xs font-semibold text-neutral-400 hover:text-neutral-600"
            >
              {showEmpty ? "▾ " : "▸ "}⚠ 비어있는 과정 {emptyCourses.length}개 (배정 불가)
            </button>
            {showEmpty && (
              <div className="mt-2 space-y-1">
                {emptyCourses.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-left opacity-70"
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-400" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-neutral-500">
                        {t.title ?? t.slug ?? t.id}
                      </div>
                      <div className="text-xs text-rose-500">
                        {t.mappedDays === 0
                          ? "세트 없음"
                          : `빈 세트 Day ${t.emptyDays.slice(0, 6).join(", ")}${
                              t.emptyDays.length > 6 ? "…" : ""
                            }`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* STEP 3: 규칙 */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <StepDot n={3} />
          <h2 className="text-base font-bold text-neutral-900">배정 규칙</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <div className="mb-1 text-xs font-bold text-neutral-500">시작일</div>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
              />
              {startsInFuture && (
                <button
                  type="button"
                  onClick={() => setStartDate(today)}
                  className="whitespace-nowrap rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-700 hover:bg-amber-100"
                >
                  오늘로
                </button>
              )}
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs font-bold text-neutral-500">하루 세트 수</div>
            <input
              type="number"
              min={1}
              max={20}
              value={setsPerDay}
              onChange={(e) => setSetsPerDay(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-xl border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <div className="mb-1 text-xs font-bold text-neutral-500">학습 요일</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleWeekday(d)}
                  className={[
                    "h-8 w-8 rounded-full border text-xs font-bold transition-colors",
                    weekdays.includes(d)
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-400",
                  ].join(" ")}
                >
                  {WEEKDAY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {startsInFuture && (
          <div className="mt-3 text-xs font-semibold text-amber-600">
            ⚠ 시작일이 미래({fmtDateKo(startDate)})라서 지금 배정해도 아직 열리지 않습니다.
          </div>
        )}

        <div className="mt-4 border-t pt-4">
          <button
            type="button"
            onClick={handleAssign}
            disabled={busy || !studentId || selectedCount === 0}
            className="h-11 w-full rounded-2xl bg-emerald-700 text-sm font-extrabold text-white hover:bg-emerald-800 disabled:opacity-40"
          >
            {busy
              ? "처리 중…"
              : selectedCount === 0
                ? "과정을 선택하세요"
                : `${selectedStudent?.full_name ?? "학생"}에게 ${selectedCount}개 과정 배정하기`}
          </button>
        </div>
      </section>

      {topError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {topError}
        </div>
      )}

      {results && results.length > 0 && (
        <section className="space-y-3">
          {results.map((r) => (
            <CourseResultCard key={r.trackId} result={r} />
          ))}
        </section>
      )}
    </div>
  );
}

function CourseResultCard({ result }: { result: CourseAssignResult }) {
  const { outcome, title } = result;
  const failed = outcome.reason !== null || !!outcome.error;

  return (
    <div
      className={[
        "rounded-2xl border p-5",
        failed ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className={`text-sm font-extrabold ${failed ? "text-amber-800" : "text-emerald-800"}`}>
          {failed ? "⚠" : "✅"} {title}
        </span>
        <span className="ml-auto text-xs text-neutral-500">
          {failed
            ? "배정 안 됨"
            : `${outcome.assignedCount}개 세트 열림 · 기준일 ${outcome.todayISO}`}
        </span>
      </div>

      {outcome.error && (
        <div className="mt-2 text-sm text-rose-700">{outcome.error}</div>
      )}
      {outcome.reason && (
        <div className="mt-2 text-sm font-semibold text-amber-800">
          {REASON_KO[outcome.reason] ?? outcome.reason}
          {outcome.note && (
            <div className="mt-1 rounded-lg bg-white/60 px-3 py-2 font-mono text-xs text-amber-700">
              {outcome.note}
            </div>
          )}
        </div>
      )}

      {outcome.queue.length > 0 && (
        <div className="mt-3 overflow-auto rounded-lg bg-white">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-neutral-500">
                <th className="px-3 py-2">세트</th>
                <th className="px-3 py-2">오픈일</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">열림?</th>
              </tr>
            </thead>
            <tbody>
              {outcome.queue.map((r) => {
                const open = String(r.available_at) <= outcome.todayISO;
                return (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-bold">#{r.day_index}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmtDateKo(r.available_at)}</td>
                    <td className="px-3 py-2 text-xs">{r.status}</td>
                    <td className="px-3 py-2">
                      {open ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">
                          열림
                        </span>
                      ) : (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-500">
                          대기
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StepDot({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
      {n}
    </span>
  );
}
