// apps/web/app/(protected)/admin/vocab/Tracks/_client/GroupAssignClient.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { StudentLite, TrackLite, BulkPlanResult } from "../actions";
import { bulkCreateStudentVocabPlansAction } from "../actions";

const WEEKDAY_LABELS = ["", "월", "화", "수", "목", "금", "토", "일"];

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

export default function GroupAssignClient({
  initialStudents,
  initialTracks,
  selectedTrackId,
}: {
  initialStudents: StudentLite[];
  initialTracks: TrackLite[];
  selectedTrackId?: string;
}) {
  const grades = useMemo(() => {
    const set = new Set<string>();
    for (const s of initialStudents) {
      if (s.grade) set.add(s.grade);
      if (s.school) set.add(`학교:${s.school}`);
    }
    return Array.from(set).sort();
  }, [initialStudents]);

  const [gradeFilter, setGradeFilter] = useState<string>("");
  const [nameFilter, setNameFilter] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [trackId, setTrackId] = useState<string>(selectedTrackId ?? initialTracks?.[0]?.id ?? "");
  const [startDateISO, setStartDateISO] = useState<string>(todayISO());
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [maxActiveSets, setMaxActiveSets] = useState(1);
  const [startDayIndex, setStartDayIndex] = useState(1);
  const [queueSize, setQueueSize] = useState(3);

  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkPlanResult | null>(null);
  const [msg, setMsg] = useState("");

  const filteredStudents = useMemo(() => {
    let list = initialStudents;
    if (gradeFilter) {
      if (gradeFilter.startsWith("학교:")) {
        const school = gradeFilter.slice(3);
        list = list.filter((s) => s.school === school);
      } else {
        list = list.filter((s) => s.grade === gradeFilter);
      }
    }
    if (nameFilter.trim()) {
      const k = nameFilter.trim().toLowerCase();
      list = list.filter(
        (s) =>
          String(s.full_name ?? "").toLowerCase().includes(k) ||
          String(s.login_id ?? "").toLowerCase().includes(k),
      );
    }
    return list;
  }, [initialStudents, gradeFilter, nameFilter]);

  function toggleWeekday(n: number) {
    setWeekdays((prev) => {
      const next = prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n];
      return next.sort((a, b) => a - b);
    });
  }

  function toggleStudent(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filteredStudents.map((s) => s.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleBulkAssign() {
    if (selectedIds.size === 0) { setMsg("❌ 학생을 1명 이상 선택하세요"); return; }
    if (!trackId) { setMsg("❌ 트랙을 선택하세요"); return; }
    if (weekdays.length === 0) { setMsg("❌ 요일을 1개 이상 선택하세요"); return; }

    setMsg("");
    setResult(null);
    setBusy(true);
    try {
      const res = await bulkCreateStudentVocabPlansAction({
        studentIds: Array.from(selectedIds),
        trackId,
        startDateISO,
        weekdays,
        maxActiveSets,
        startDayIndex,
        queueSize,
      });
      if ("error" in res) {
        setMsg(`❌ ${res.error}`);
      } else {
        setResult(res);
        setMsg(`✅ ${res.succeeded}명 완료 · ${res.failed}명 실패`);
      }
    } finally {
      setBusy(false);
    }
  }

  const selectedTrack = initialTracks.find((t) => t.id === trackId);

  return (
    <div className="space-y-4">
      {/* ── 필터 + 학생 목록 ── */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-base font-extrabold text-slate-900">학년 · 반 단위 그룹 배포</div>
        <div className="mt-1 text-sm text-slate-500">학년/반 필터로 학생을 선택하고 트랙을 한꺼번에 배정합니다.</div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <div className="text-xs font-bold text-slate-500 mb-1">학년 / 학교 필터</div>
            <select
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={gradeFilter}
              onChange={(e) => { setGradeFilter(e.target.value); setSelectedIds(new Set()); }}
            >
              <option value="">전체</option>
              {grades.map((g) => (
                <option key={g} value={g}>{g.startsWith("학교:") ? g : `학년: ${g}`}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-500 mb-1">이름 검색</div>
            <input
              className="w-full rounded-xl border px-3 py-2 text-sm"
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="이름 / 아이디"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="button" onClick={selectAll}
              className="flex-1 rounded-xl border py-2 text-sm font-bold hover:bg-slate-50">
              전체 선택 ({filteredStudents.length})
            </button>
            <button type="button" onClick={deselectAll}
              className="flex-1 rounded-xl border py-2 text-sm font-bold hover:bg-slate-50">
              해제
            </button>
          </div>
        </div>

        {/* 학생 체크리스트 */}
        <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border divide-y">
          {filteredStudents.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">해당 조건의 학생이 없습니다.</div>
          ) : (
            filteredStudents.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectedIds.has(s.id)}
                  onChange={() => toggleStudent(s.id)}
                  className="h-4 w-4 rounded"
                />
                <span className="flex-1 text-sm font-semibold text-slate-800">
                  {s.full_name ?? "(이름없음)"}
                </span>
                {s.grade && <span className="text-xs text-slate-500">{s.grade}</span>}
                {s.school && <span className="text-xs text-slate-400">{s.school}</span>}
                <span className="text-xs text-slate-400 font-mono">{s.login_id ?? ""}</span>
              </label>
            ))
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="mt-2 text-sm font-semibold text-slate-700">
            {selectedIds.size}명 선택됨
          </div>
        )}
      </div>

      {/* ── 배포 설정 ── */}
      <div className="rounded-2xl border bg-white p-5">
        <div className="text-base font-extrabold text-slate-900 mb-4">배포 설정</div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <div className="text-xs font-bold text-slate-500 mb-1">트랙 선택</div>
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm"
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
              >
                {initialTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {`${t.title ?? t.slug ?? t.id} (${t.total_days ?? "?"}일)`}
                  </option>
                ))}
              </select>
            </div>
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
            </div>
          </div>

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
            </div>

            {/* 배포 요약 */}
            {selectedIds.size > 0 && selectedTrack && (
              <div className="rounded-xl bg-slate-50 p-3 text-sm space-y-1">
                <div className="font-extrabold text-slate-800">배포 예시</div>
                <div className="text-slate-600">
                  <strong>{selectedIds.size}명</strong> →{" "}
                  <strong>{selectedTrack.title ?? selectedTrack.slug}</strong>
                </div>
                <div className="text-slate-500">
                  {startDateISO} 시작 · {weekdays.map((d) => WEEKDAY_LABELS[d]).join("/")} 학습
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          <button
            type="button"
            onClick={handleBulkAssign}
            disabled={busy || selectedIds.size === 0 || !trackId}
            className="h-11 px-8 rounded-2xl bg-emerald-700 text-white font-extrabold text-sm disabled:opacity-40 hover:bg-emerald-800"
          >
            {busy ? "배포 중..." : `${selectedIds.size}명에게 배포`}
          </button>
        </div>

        {msg && (
          <div className={`mt-3 rounded-xl px-4 py-2 text-sm font-bold ${msg.startsWith("✅") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
            {msg}
          </div>
        )}
      </div>

      {/* ── 결과 ── */}
      {result && (
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-base font-extrabold text-slate-900 mb-3">배포 결과</div>
          <div className="flex gap-6 text-sm mb-3">
            <div><span className="text-slate-500">전체</span> <strong>{result.total}</strong></div>
            <div><span className="text-emerald-600">성공</span> <strong className="text-emerald-700">{result.succeeded}</strong></div>
            {result.failed > 0 && (
              <div><span className="text-rose-600">실패</span> <strong className="text-rose-700">{result.failed}</strong></div>
            )}
          </div>
          {result.results.some((r) => !r.ok) && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {result.results.filter((r) => !r.ok).map((r) => (
                <div key={r.studentId} className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  <strong>{r.name}</strong>: {r.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
