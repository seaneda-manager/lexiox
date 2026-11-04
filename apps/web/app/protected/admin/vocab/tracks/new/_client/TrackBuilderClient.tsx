"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createTrackAction,
  loadTrackBuilderDataAction,
  saveTrackDaysAction,
  type BuilderSet,
  type BuilderTrack,
} from "../actions";

function daysOf(sets: BuilderSet[], trackId: string) {
  return sets
    .filter((s) => s.track_id === trackId)
    .sort((a, b) => (a.order_index ?? 9999) - (b.order_index ?? 9999))
    .map((s) => s.id);
}

export default function TrackBuilderClient() {
  const [tracks, setTracks] = useState<BuilderTrack[]>([]);
  const [sets, setSets] = useState<BuilderSet[]>([]);
  const [trackId, setTrackId] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function reload(tid: string) {
    const r = await loadTrackBuilderDataAction();
    if (!r.ok) {
      setMsg(`❌ ${r.error}`);
      return;
    }
    const rs = r.sets ?? [];
    setTracks(r.tracks ?? []);
    setSets(rs);
    setTrackId(tid);
    setDays(daysOf(rs, tid));
  }

  useEffect(() => {
    reload("");
  }, []);

  const setById = useMemo(() => new Map(sets.map((s) => [s.id, s])), [sets]);
  const available = useMemo(
    () =>
      sets.filter(
        (s) =>
          !days.includes(s.id) &&
          (!q.trim() || (s.title ?? "").toLowerCase().includes(q.trim().toLowerCase())),
      ),
    [sets, days, q],
  );

  function pickTrack(id: string) {
    setTrackId(id);
    setMsg("");
    setDays(daysOf(sets, id));
  }

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= days.length) return;
    const next = days.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setDays(next);
  }

  async function createTrack() {
    setBusy(true);
    setMsg("");
    try {
      const r = await createTrackAction({ title: newTitle, description: newDesc });
      if (!r.ok || !r.trackId) return setMsg(`❌ ${r.error}`);
      setNewTitle("");
      setNewDesc("");
      await reload(r.trackId);
      setMsg("✅ Track을 만들었습니다. 아래에서 Day를 편성하세요.");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMsg("");
    try {
      const r = await saveTrackDaysAction({ trackId, setIds: days });
      if (!r.ok) return setMsg(`❌ ${r.error}`);
      await reload(trackId);
      setMsg(`✅ 저장 완료 — 총 ${r.totalDays}일`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`rounded-xl border p-3 text-sm font-semibold ${msg.startsWith("✅") ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {msg}
        </div>
      )}

      <section className="rounded-2xl border bg-white p-5 space-y-3">
        <div className="text-sm font-extrabold text-slate-900">1. Track 선택 또는 새로 만들기</div>
        <select
          value={trackId}
          onChange={(e) => pickTrack(e.target.value)}
          className="w-full rounded-xl border px-3 py-2 text-sm"
        >
          <option value="">-- 기존 Track 선택 --</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title || t.id} {t.total_days ? `(${t.total_days}일)` : ""}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="새 Track 이름 (예: 올림포스 영어독해 9대 변별유형)"
            className="rounded-xl border px-3 py-2 text-sm"
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="설명 (선택)"
            className="rounded-xl border px-3 py-2 text-sm"
          />
          <button
            onClick={createTrack}
            disabled={busy || !newTitle.trim()}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Track 만들기
          </button>
        </div>
      </section>

      {trackId && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm font-extrabold text-slate-900">2. Day 구성 ({days.length}일)</div>
            <div className="mt-3 space-y-2 max-h-[28rem] overflow-auto">
              {days.length === 0 && <div className="text-sm text-slate-500">오른쪽에서 세트를 추가하세요.</div>}
              {days.map((id, i) => {
                const s = setById.get(id);
                return (
                  <div key={id} className="flex items-center gap-2 rounded-xl border p-2 text-sm">
                    <span className="w-14 shrink-0 font-bold text-violet-700">Day {i + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{s?.title ?? id}</span>
                    <span className="text-xs text-slate-500">{s?.word_count ?? 0}개</span>
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="px-1 disabled:opacity-30" title="위로">▲</button>
                    <button onClick={() => move(i, 1)} disabled={i === days.length - 1} className="px-1 disabled:opacity-30" title="아래로">▼</button>
                    <button onClick={() => setDays(days.filter((x) => x !== id))} className="px-1 text-rose-600" title="빼기">✕</button>
                  </div>
                );
              })}
            </div>
            <button
              onClick={save}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "저장 중..." : "Day 구성 저장"}
            </button>
          </div>

          <div className="rounded-2xl border bg-white p-5">
            <div className="text-sm font-extrabold text-slate-900">세트 추가</div>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="세트 이름 검색"
              className="mt-3 w-full rounded-xl border px-3 py-2 text-sm"
            />
            <div className="mt-3 space-y-2 max-h-[26rem] overflow-auto">
              {available.map((s) => {
                const other = s.track_id && s.track_id !== trackId ? tracks.find((t) => t.id === s.track_id) : null;
                return (
                  <div key={s.id} className="flex items-center gap-2 rounded-xl border p-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{s.title ?? s.id}</span>
                    {other && <span className="text-xs text-amber-700" title="저장하면 이 Track으로 옮겨집니다">{other.title}에서 이동</span>}
                    <span className="text-xs text-slate-500">{s.word_count}개</span>
                    <button onClick={() => setDays([...days, s.id])} className="rounded-lg border px-2 py-1 text-xs font-semibold">
                      + 추가
                    </button>
                  </div>
                );
              })}
              {available.length === 0 && <div className="text-sm text-slate-500">추가할 세트가 없습니다.</div>}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
