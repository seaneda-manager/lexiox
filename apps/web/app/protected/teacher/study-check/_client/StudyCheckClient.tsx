"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Row = {
  academyId: string;
  profileId: string | null;
  name: string;
  grade: string | null;
  school: string | null;
  checked: boolean;
  minutes: number;
  note: string;
  balance: number;
};

function todayKst(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export default function StudyCheckClient() {
  const [day, setDay] = useState(todayKst());
  const [rows, setRows] = useState<Row[]>([]);
  const [defaultMinutes, setDefaultMinutes] = useState(10);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [minutes, setMinutes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch(`/api/teacher/study-checks?day=${day}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "불러오지 못했어요");
      setRows(j.students as Row[]);
      setDefaultMinutes(j.defaultMinutes as number);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, [day]);

  useEffect(() => {
    load();
  }, [load]);

  async function check(row: Row) {
    if (!row.profileId) return;
    setBusy(row.academyId);
    setErr(null);
    try {
      const raw = minutes[row.academyId];
      const body: { profileId: string; day: string; minutes?: number } = { profileId: row.profileId, day };
      if (raw && Number(raw) > 0) body.minutes = Number(raw);
      const r = await fetch("/api/teacher/study-checks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "체크하지 못했어요");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "체크하지 못했어요");
    } finally {
      setBusy(null);
    }
  }

  async function cancel(row: Row) {
    if (!row.profileId) return;
    if (!window.confirm(`${row.name} 학생의 체크를 취소하고 적립한 ${row.minutes}분을 회수할까요?`)) return;
    setBusy(row.academyId);
    setErr(null);
    try {
      const r = await fetch(`/api/teacher/study-checks?profileId=${row.profileId}&day=${day}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "취소하지 못했어요");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "취소하지 못했어요");
    } finally {
      setBusy(null);
    }
  }

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? rows.filter((r) => r.name.toLowerCase().includes(k) || (r.school ?? "").toLowerCase().includes(k)) : rows;
  }, [rows, q]);
  const doneCount = rows.filter((r) => r.checked).length;
  const withAccount = rows.filter((r) => r.profileId).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          날짜
          <input type="date" value={day} onChange={(e) => setDay(e.target.value || todayKst())} className="rounded-lg border px-3 py-1.5 text-sm" />
        </label>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="학생 이름·학교 검색" className="min-w-[160px] flex-1 rounded-lg border px-3 py-1.5 text-sm" />
        <span className="text-xs text-neutral-500">
          체크 {doneCount} / {withAccount}명 · 기본 {defaultMinutes}분
        </span>
      </div>

      {err && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

      {loading ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-neutral-400">불러오는 중...</div>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-neutral-400">학생이 없습니다.</div>
      ) : (
        <ul className="divide-y rounded-2xl border bg-white">
          {shown.map((r) => (
            <li key={r.academyId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-[140px] flex-1">
                <div className="font-semibold text-neutral-900">{r.name}</div>
                <div className="text-xs text-neutral-400">{[r.school, r.grade].filter(Boolean).join(" · ") || "—"}</div>
              </div>

              {!r.profileId ? (
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-500">로그인 계정 없음</span>
              ) : r.checked ? (
                <>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">체크됨 · +{r.minutes}분</span>
                  <span className="text-xs text-neutral-400">잔액 {r.balance}분</span>
                  <button disabled={busy === r.academyId} onClick={() => cancel(r)} className="rounded-lg border px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50">
                    취소
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    placeholder={String(defaultMinutes)}
                    value={minutes[r.academyId] ?? ""}
                    onChange={(e) => setMinutes((m) => ({ ...m, [r.academyId]: e.target.value }))}
                    className="w-16 rounded-lg border px-2 py-1.5 text-center text-sm"
                    aria-label="적립 분(비우면 기본값)"
                  />
                  <span className="text-xs text-neutral-400">분</span>
                  <button disabled={busy === r.academyId} onClick={() => check(r)} className="rounded-lg bg-neutral-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">
                    학습 완료 체크
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
