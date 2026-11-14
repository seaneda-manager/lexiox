"use client";
// 2단계 Drill: ① 청크 배열(정답 즉시 판정) → ② 한글→영어 작문(자동 채점) → 결과 요약
import ReviewGate, { type GateInfo } from "@/components/review/ReviewGate";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DrillChunkItem, DrillComposeItem, DrillItem } from "@/lib/writing/reviewTypes";

type Result = { id: string; tag: string; ok: boolean };

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
const join = (c: string[]) => c.join(" ").replace(/\s+/g, " ").trim();

export default function DrillClient({ sessionId }: { sessionId: string }) {
  const [items, setItems] = useState<DrillItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gate, setGate] = useState<GateInfo | null>(null);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const load = useCallback(
    async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/writing-2026/drill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, action: "get" }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.notPublished || json.notGenerated) {
          setGate(json as GateInfo);
          return;
        }
        if (!res.ok || !json.ok) throw new Error(json.error || "Drill을 불러오지 못했습니다");
        setItems(json.items as DrillItem[]);
        setIdx(0);
        setResults([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Drill을 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const record = (item: DrillItem, ok: boolean) =>
    setResults((r) => (r.some((x) => x.id === item.id) ? r : [...r, { id: item.id, tag: item.tag, ok }]));

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-slate-700">Drill을 불러오고 있어요</p>
        <p className="mt-1 text-xs text-slate-500"></p>
      </div>
    );
  }
  if (gate) return <ReviewGate gate={gate} />;

  if (error || !items) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6 text-center">
        <p className="text-sm text-rose-700">{error ?? "Drill이 없습니다"}</p>
        <button onClick={() => load()} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700">
          다시 시도
        </button>
      </div>
    );
  }

  if (idx >= items.length) return <Summary items={items} results={results} sessionId={sessionId} onRetry={() => { setIdx(0); setResults([]); }} />;

  const item = items[idx];
  const stage = item.kind === "chunk" ? 1 : 2;
  const stageTotal = items.filter((i) => i.kind === item.kind).length;
  const stagePos = items.filter((i) => i.kind === item.kind).findIndex((i) => i.id === item.id) + 1;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold text-slate-700">
            {stage === 1 ? "1단계 · 청크 배열" : "2단계 · 한글 → 영어 작문"} ({stagePos}/{stageTotal})
          </span>
          <span>
            {idx + 1} / {items.length}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${(idx / items.length) * 100}%` }} />
        </div>
      </div>

      {item.kind === "chunk" ? (
        <ChunkStep key={item.id} item={item} sessionId={sessionId} onDone={(ok) => { record(item, ok); setIdx((i) => i + 1); }} />
      ) : (
        <ComposeStep key={item.id} item={item} sessionId={sessionId} onDone={(ok) => { record(item, ok); setIdx((i) => i + 1); }} />
      )}
    </div>
  );
}

function TagBadge({ tag }: { tag: string }) {
  return <span className="inline-block rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800">{tag}</span>;
}

// ── 1단계: 청크 배열 ────────────────────────────────────────────────
function ChunkStep({ item, onDone }: { item: DrillChunkItem; sessionId: string; onDone: (ok: boolean) => void }) {
  const initial = useMemo(() => {
    // 정답 순서와 같게 섞이지 않도록 보장
    let s = shuffle(item.chunks.map((text, i) => ({ text, i })));
    for (let n = 0; n < 5 && s.every((c, k) => c.i === k); n++) s = shuffle(s);
    return s;
  }, [item]);
  const [pool, setPool] = useState(initial);
  const [picked, setPicked] = useState<typeof initial>([]);
  const [checked, setChecked] = useState<null | boolean>(null);

  const answer = join(item.chunks);
  const pick = (c: (typeof initial)[number]) => {
    if (checked !== null) return;
    setPool((p) => p.filter((x) => x.i !== c.i));
    setPicked((p) => [...p, c]);
  };
  const unpick = (c: (typeof initial)[number]) => {
    if (checked !== null) return;
    setPicked((p) => p.filter((x) => x.i !== c.i));
    setPool((p) => [...p, c]);
  };
  const check = () => setChecked(join(picked.map((c) => c.text)) === answer);

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <TagBadge tag={item.tag} />
      <p className="text-base font-semibold leading-relaxed text-slate-900">{item.korean}</p>

      <div className="min-h-[56px] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-3">
        {picked.length === 0 ? (
          <p className="text-xs text-slate-400">아래 청크를 눌러 문장을 만드세요</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {picked.map((c) => (
              <button key={c.i} onClick={() => unpick(c)} className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700">
                {c.text}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {pool.map((c) => (
          <button key={c.i} onClick={() => pick(c)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:border-teal-500 hover:bg-teal-50">
            {c.text}
          </button>
        ))}
      </div>

      {checked === null ? (
        <button
          onClick={check}
          disabled={pool.length > 0}
          className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-30"
        >
          확인
        </button>
      ) : (
        <Feedback ok={checked} answer={answer} onNext={() => onDone(checked)} />
      )}
    </div>
  );
}

// ── 2단계: 한글 → 영어 작문 ────────────────────────────────────────
function ComposeStep({ item, sessionId, onDone }: { item: DrillComposeItem; sessionId: string; onDone: (ok: boolean) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<null | { correct: boolean; feedback: string; corrected: string }>(null);
  const [showHint, setShowHint] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/writing-2026/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          action: "check",
          itemId: item.id,
          answer: text,
          item: { korean: item.korean, answer: item.answer, mustUse: item.mustUse },
        }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "채점에 실패했습니다");
      setRes(json.result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "채점에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <TagBadge tag={item.tag} />
      <p className="text-base font-semibold leading-relaxed text-slate-900">{item.korean}</p>
      {item.mustUse && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">반드시 사용: {item.mustUse}</p>}

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!!res}
        rows={3}
        placeholder="영어로 작문하세요"
        className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-teal-500 focus:outline-none disabled:bg-slate-50"
      />

      {!res && item.hint && (
        <button onClick={() => setShowHint((v) => !v)} className="text-xs text-slate-500 underline">
          {showHint ? `힌트: ${item.hint}` : "힌트 보기"}
        </button>
      )}
      {err && <p className="text-xs text-rose-600">{err}</p>}

      {!res ? (
        <button onClick={submit} disabled={busy || !text.trim()} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-30">
          {busy ? "채점 중…" : "제출"}
        </button>
      ) : (
        <div className="space-y-3">
          <Feedback ok={res.correct} answer={item.answer} onNext={() => onDone(res.correct)} note={res.feedback} corrected={res.correct ? undefined : res.corrected} />
        </div>
      )}
    </div>
  );
}

function Feedback({ ok, answer, onNext, note, corrected }: { ok: boolean; answer: string; onNext: () => void; note?: string; corrected?: string }) {
  return (
    <div className="space-y-3">
      <div className={`rounded-xl p-4 text-sm ${ok ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
        <p className="font-bold">{ok ? "✓ 정답!" : "✗ 아쉬워요"}</p>
        {note && <p className="mt-1 text-xs leading-relaxed">{note}</p>}
        {corrected && <p className="mt-2 text-xs">내 문장 수정: <span className="font-semibold">{corrected}</span></p>}
        <p className="mt-2 text-xs">모범 문장: <span className="font-semibold">{answer}</span></p>
      </div>
      <button onClick={onNext} className="w-full rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-700">
        다음 →
      </button>
    </div>
  );
}

// ── 결과 요약 ───────────────────────────────────────────────────────
function Summary({ items, results, sessionId, onRetry }: { items: DrillItem[]; results: Result[]; sessionId: string; onRetry: () => void }) {
  const correct = results.filter((r) => r.ok).length;
  const byTag = new Map<string, { ok: number; n: number }>();
  for (const r of results) {
    const t = byTag.get(r.tag) ?? { ok: 0, n: 0 };
    t.n += 1;
    if (r.ok) t.ok += 1;
    byTag.set(r.tag, t);
  }
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Drill 완료</p>
      <p className="text-5xl font-black text-teal-600">
        {correct}
        <span className="text-xl font-bold text-slate-400"> / {items.length}</span>
      </p>
      <div className="space-y-2 text-left">
        {[...byTag.entries()].map(([tag, v]) => (
          <div key={tag} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <span className="font-semibold text-slate-700">{tag}</span>
            <span className={v.ok === v.n ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>
              {v.ok}/{v.n}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onRetry} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          같은 문제 다시 풀기
        </button>
        <Link href={`/writing-2026/review/${sessionId}`} className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
          리뷰로 돌아가기
        </Link>
      </div>
    </div>
  );
}
