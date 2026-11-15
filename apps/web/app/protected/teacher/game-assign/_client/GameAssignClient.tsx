"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GAME_GROUPS, type GameStyle } from "@/lib/workout/gameCatalog";

type Student = { id: string; name: string; grade: string | null; school: string | null };
type Track = { id: string; title: string; sets: { id: string; day: number }[] };
type Assignment = {
  id: string;
  studentId: string;
  studentName: string;
  style: string;
  setLabel: string | null;
  mode: string;
  level: string;
  targetPlays: number;
  dueDate: string | null;
  note: string;
  createdAt: string;
  plays: number;
  bestScore: number;
  lastPlayedAt: string | null;
};

const MODE_LABEL: Record<string, string> = { "en-en": "영영", "ko-en": "한영", "en-ko": "영한", spelling: "스펠링" };
const LEVEL_LABEL: Record<string, string> = { easy: "쉬움", normal: "보통", hard: "어려움" };
const STYLE_LABEL: Record<string, string> = Object.fromEntries(GAME_GROUPS.flatMap((g) => g.modes.map((m) => [m.style, `${g.subtitle} · ${m.label}`])));

export default function GameAssignClient() {
  const [students, setStudents] = useState<Student[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [list, setList] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [style, setStyle] = useState<GameStyle>("hang");
  const [trackId, setTrackId] = useState("");
  const [setId, setSetId] = useState("");
  const [mode, setMode] = useState("en-en");
  const [level, setLevel] = useState("normal");
  const [target, setTarget] = useState(1);
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/teacher/game-assignments", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "불러오지 못했어요");
      setStudents(j.students);
      setTracks(j.tracks);
      setList(j.assignments);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "불러오지 못했어요");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const spellingOk = style === "hang" || style === "fly";
  const usesMode = style !== "spell";
  const noKo = style === "omok" || style === "rescue";
  const usesLevel = style === "omok" || style === "sprint" || style === "rescue" || style === "memory";
  const modeOptions = Object.keys(MODE_LABEL).filter((m) => !(m === "spelling" && !spellingOk) && !(m === "en-ko" && noKo));
  const effMode = modeOptions.includes(mode) ? mode : "en-en";

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? students.filter((s) => s.name.toLowerCase().includes(k) || (s.school ?? "").toLowerCase().includes(k)) : students;
  }, [students, q]);
  const track = tracks.find((t) => t.id === trackId);

  function toggle(id: string) {
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function submit() {
    setErr(null);
    setOkMsg(null);
    if (picked.size === 0) return setErr("학생을 고르세요");
    if (!setId) return setErr("단어 범위(Day)를 고르세요");
    setBusy(true);
    try {
      const r = await fetch("/api/teacher/game-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(picked), style, setId, mode: effMode, level, targetPlays: target, dueDate: due || null, note }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "배정하지 못했어요");
      setOkMsg(`${j.created}명에게 배정했어요`);
      setPicked(new Set());
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "배정하지 못했어요");
    } finally {
      setBusy(false);
    }
  }

  async function cancel(a: Assignment) {
    if (!window.confirm(`${a.studentName} 학생의 "${STYLE_LABEL[a.style] ?? a.style}" 배정을 취소할까요? (플레이 기록은 남아요)`)) return;
    const r = await fetch(`/api/teacher/game-assignments?id=${a.id}`, { method: "DELETE" });
    if (!r.ok) setErr("취소하지 못했어요");
    await load();
  }

  const shownList = useMemo(() => {
    const k = filter.trim().toLowerCase();
    return k ? list.filter((a) => a.studentName.toLowerCase().includes(k)) : list;
  }, [list, filter]);

  const field = "rounded-lg border px-3 py-1.5 text-sm";

  return (
    <div className="space-y-6">
      {err && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}
      {okMsg && <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{okMsg}</div>}

      <section className="space-y-4 rounded-2xl border bg-white p-4">
        <h2 className="font-semibold text-neutral-900">새로 배정</h2>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs text-neutral-500">
            게임
            <select value={style} onChange={(e) => setStyle(e.target.value as GameStyle)} className={`${field} w-full text-neutral-900`}>
              {GAME_GROUPS.map((g) => (
                <optgroup key={g.id} label={`${g.subtitle} (${g.name})`}>
                  {g.modes.map((m) => (
                    <option key={m.style} value={m.style}>
                      {m.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs text-neutral-500">
              단어 과정
              <select
                value={trackId}
                onChange={(e) => {
                  setTrackId(e.target.value);
                  setSetId("");
                }}
                className={`${field} w-full text-neutral-900`}
              >
                <option value="">선택</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-neutral-500">
              Day
              <select value={setId} onChange={(e) => setSetId(e.target.value)} disabled={!track} className={`${field} w-full text-neutral-900`}>
                <option value="">선택</option>
                {track?.sets.map((s) => (
                  <option key={s.id} value={s.id}>
                    Day {s.day}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {usesMode && (
            <label className="space-y-1 text-xs text-neutral-500">
              문제 방식
              <select value={effMode} onChange={(e) => setMode(e.target.value)} className={`${field} w-full text-neutral-900`}>
                {modeOptions.map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {usesLevel && (
            <label className="space-y-1 text-xs text-neutral-500">
              난이도
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={`${field} w-full text-neutral-900`}>
                {Object.entries(LEVEL_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="space-y-1 text-xs text-neutral-500">
            목표 횟수 (판)
            <input type="number" min={1} max={20} value={target} onChange={(e) => setTarget(Math.min(20, Math.max(1, Number(e.target.value) || 1)))} className={`${field} w-full text-neutral-900`} />
          </label>
          <label className="space-y-1 text-xs text-neutral-500">
            기한 (선택)
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={`${field} w-full text-neutral-900`} />
          </label>
          <label className="space-y-1 text-xs text-neutral-500 sm:col-span-2">
            메모 (선택, 학생에게 보여요)
            <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={`${field} w-full text-neutral-900`} />
          </label>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-neutral-500">학생 ({picked.size}명 선택)</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·학교 검색" className={`${field} min-w-[140px] flex-1`} />
            <button type="button" className="text-xs text-neutral-600 underline" onClick={() => setPicked(new Set([...picked, ...shown.map((s) => s.id)]))}>
              보이는 학생 모두 선택
            </button>
            <button type="button" className="text-xs text-neutral-600 underline" onClick={() => setPicked(new Set())}>
              선택 해제
            </button>
          </div>
          <ul className="grid max-h-56 gap-1 overflow-y-auto rounded-xl border p-2 sm:grid-cols-2">
            {shown.map((s) => (
              <li key={s.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-neutral-50">
                  <input type="checkbox" checked={picked.has(s.id)} onChange={() => toggle(s.id)} />
                  <span className="font-medium text-neutral-900">{s.name}</span>
                  <span className="text-xs text-neutral-400">{[s.school, s.grade].filter(Boolean).join(" · ")}</span>
                </label>
              </li>
            ))}
            {shown.length === 0 && <li className="p-2 text-sm text-neutral-400">학생이 없어요</li>}
          </ul>
        </div>

        <button disabled={busy} onClick={submit} className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:opacity-50">
          {busy ? "배정 중..." : `${picked.size}명에게 배정`}
        </button>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="font-semibold text-neutral-900">배정 현황 ({list.length})</h2>
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="학생 이름 검색" className={`${field} min-w-[140px] flex-1`} />
        </div>
        {loading ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-neutral-400">불러오는 중...</div>
        ) : shownList.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-neutral-400">배정한 게임이 없어요.</div>
        ) : (
          <ul className="divide-y rounded-2xl border bg-white">
            {shownList.map((a) => {
              const done = a.plays >= a.targetPlays;
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-[160px] flex-1">
                    <div className="font-semibold text-neutral-900">{a.studentName}</div>
                    <div className="text-xs text-neutral-500">
                      {STYLE_LABEL[a.style] ?? a.style} · {a.setLabel ?? "—"} · {MODE_LABEL[a.mode] ?? a.mode}
                      {a.level !== "normal" ? ` · ${LEVEL_LABEL[a.level] ?? a.level}` : ""}
                    </div>
                    {a.note && <div className="text-xs text-neutral-400">“{a.note}”</div>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${done ? "bg-emerald-100 text-emerald-700" : a.plays > 0 ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {done ? "완료" : a.plays > 0 ? "진행 중" : "시작 전"} · {a.plays}/{a.targetPlays}판
                  </span>
                  {a.plays > 0 && <span className="text-xs text-neutral-400">최고 {a.bestScore}점</span>}
                  {a.dueDate && <span className="text-xs text-neutral-400">기한 {a.dueDate}</span>}
                  <button onClick={() => cancel(a)} className="rounded-lg border px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50">
                    취소
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
