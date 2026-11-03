"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuestionType } from "@/models/vocab/test.types";
import { EXAM_QUESTION_TYPES } from "@/lib/vocab/test/teacherExam";

type Track = { id: string; title: string; minDay: number; maxDay: number };
type ClassRow = { id: string; name: string; studentIds: string[] };
type Student = { authId: string; name: string; grade: string | null; school: string | null };
type ExamRow = {
  id: string;
  title: string;
  day_from: number;
  day_to: number;
  question_count: number;
  created_at: string;
  assigned: number;
  done: number;
};

export default function VocabExamsClient() {
  const router = useRouter();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [trackId, setTrackId] = useState("");
  const [dayFrom, setDayFrom] = useState(1);
  const [dayTo, setDayTo] = useState(1);
  const [count, setCount] = useState(20);
  const [types, setTypes] = useState<Set<QuestionType>>(new Set(["word_to_meaning", "meaning_to_word"]));
  const [arrangement, setArrangement] = useState<"grouped" | "random">("grouped");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reloadExams = useCallback(async () => {
    const r = await fetch("/api/teacher/vocab-exams", { cache: "no-store" });
    if (r.ok) setExams((await r.json()).exams ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [m] = await Promise.all([fetch("/api/teacher/vocab-exams/meta", { cache: "no-store" }), reloadExams()]);
        if (m.ok) {
          const d = await m.json();
          setTracks(d.tracks ?? []);
          setClasses(d.classes ?? []);
          setStudents(d.students ?? []);
          if (d.tracks?.[0]) selectTrack(d.tracks[0]);
        } else {
          setError("출제 정보를 불러오지 못했어요.");
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectTrack(t: Track) {
    setTrackId(t.id);
    setDayFrom(t.minDay);
    setDayTo(Math.min(t.maxDay, t.minDay));
  }

  const track = tracks.find(t => t.id === trackId);
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? students.filter(s => s.name.toLowerCase().includes(q) || (s.school ?? "").toLowerCase().includes(q)) : students;
  }, [students, search]);

  const toggleType = (t: QuestionType) =>
    setTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });

  const toggleStudent = (id: string) =>
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const addClass = (c: ClassRow) => {
    const known = new Set(students.map(s => s.authId));
    setPicked(prev => new Set([...prev, ...c.studentIds.filter(id => known.has(id))]));
  };

  async function submit() {
    setError(null);
    if (!trackId) return setError("트랙을 선택해 주세요.");
    if (types.size === 0) return setError("문제 유형을 1개 이상 선택해 주세요.");
    if (dayTo < dayFrom) return setError("끝 Day는 시작 Day보다 같거나 커야 해요.");
    setBusy(true);
    try {
      const r = await fetch("/api/teacher/vocab-exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          track_id: trackId,
          day_from: dayFrom,
          day_to: dayTo,
          question_count: count,
          question_types: Array.from(types),
          arrangement,
          student_ids: Array.from(picked),
        }),
      });
      const d = await r.json();
      if (!r.ok) return setError(d?.error ?? "출제에 실패했어요.");
      router.push(`/teacher/vocab-exams/${d.id}${d.shortfall > 0 ? `?short=${d.shortfall}` : ""}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="py-10 text-center text-sm text-neutral-400">불러오는 중…</p>;

  const inputCls = "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border bg-white p-5">
        <h2 className="font-semibold text-neutral-900">새 시험 만들기</h2>

        <label className="block text-sm">
          <span className="mb-1 block text-neutral-600">시험 이름 (비우면 자동)</span>
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="예: Day 1~5 단어 시험" />
        </label>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block text-sm sm:col-span-3">
            <span className="mb-1 block text-neutral-600">단어 트랙</span>
            <select
              className={inputCls}
              value={trackId}
              onChange={e => {
                const t = tracks.find(x => x.id === e.target.value);
                if (t) selectTrack(t);
              }}
            >
              {tracks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.title} (Day {t.minDay}~{t.maxDay})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">시작 Day</span>
            <input type="number" className={inputCls} min={track?.minDay ?? 1} max={track?.maxDay} value={dayFrom} onChange={e => setDayFrom(Number(e.target.value))} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">끝 Day</span>
            <input type="number" className={inputCls} min={dayFrom} max={track?.maxDay} value={dayTo} onChange={e => setDayTo(Number(e.target.value))} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-600">문항 수</span>
            <input type="number" className={inputCls} min={1} max={200} value={count} onChange={e => setCount(Number(e.target.value))} />
          </label>
        </div>

        <fieldset>
          <legend className="mb-1 text-sm text-neutral-600">문제 유형 (선택한 유형에 문항 수를 고르게 나눠요)</legend>
          <div className="flex flex-wrap gap-2">
            {EXAM_QUESTION_TYPES.map(t => (
              <button
                key={t.type}
                type="button"
                onClick={() => toggleType(t.type)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  types.has(t.type) ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-300 bg-white text-neutral-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">듣기 유형은 프린트 시험지에서 제외돼요. 동의어는 동의어 데이터가 있는 단어만 출제돼요.</p>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm text-neutral-600">문제 배열</legend>
          <div className="flex gap-2">
            {(["grouped", "random"] as const).map(a => (
              <button
                key={a}
                type="button"
                onClick={() => setArrangement(a)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  arrangement === a ? "border-blue-600 bg-blue-600 text-white" : "border-neutral-300 bg-white text-neutral-700"
                }`}
              >
                {a === "grouped" ? "유형별로 묶기" : "랜덤 섞기"}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-1 text-sm text-neutral-600">
            온라인 응시 대상 <span className="text-neutral-400">(비워 두면 프린트 전용 · 선택 {picked.size}명)</span>
          </legend>
          {classes.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {classes.map(c => (
                <button key={c.id} type="button" onClick={() => addClass(c)} className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-50">
                  + {c.name} ({c.studentIds.length})
                </button>
              ))}
              {picked.size > 0 && (
                <button type="button" onClick={() => setPicked(new Set())} className="rounded-full px-2.5 py-1 text-xs text-red-600">
                  선택 해제
                </button>
              )}
            </div>
          )}
          <input className={`${inputCls} mb-2`} value={search} onChange={e => setSearch(e.target.value)} placeholder="학생 이름/학교 검색" />
          <div className="max-h-48 divide-y overflow-y-auto rounded-lg border">
            {filteredStudents.map(s => (
              <label key={s.authId} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-neutral-50">
                <input type="checkbox" checked={picked.has(s.authId)} onChange={() => toggleStudent(s.authId)} />
                <span>{s.name}</span>
                <span className="text-xs text-neutral-400">{[s.school, s.grade].filter(Boolean).join(" · ")}</span>
              </label>
            ))}
            {filteredStudents.length === 0 && <p className="p-3 text-center text-xs text-neutral-400">학생이 없어요.</p>}
          </div>
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "출제 중…" : "시험 출제"}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-neutral-900">출제한 시험</h2>
        {exams.length === 0 && <p className="text-sm text-neutral-400">아직 출제한 시험이 없어요.</p>}
        {exams.map(e => (
          <Link key={e.id} href={`/teacher/vocab-exams/${e.id}`} className="flex items-center justify-between rounded-xl border bg-white p-3 hover:bg-neutral-50">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">{e.title}</p>
              <p className="text-xs text-neutral-500">
                Day {e.day_from}
                {e.day_to > e.day_from ? `~${e.day_to}` : ""} · {e.question_count}문항 · {new Date(e.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
            <span className="shrink-0 text-xs text-neutral-500">
              {e.assigned > 0 ? `응시 ${e.done}/${e.assigned}` : "프린트 전용"}
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
