"use client";
// 녹음 Drill: 모든 문항을 마이크로 답한다.
//  shadow  — 듣고(TTS) 따라 말하기: 인식된 문장과 목표 문장을 단어 단위로 비교
//  recall  — 한글 뜻 + 힌트만 보고 기억해서 말하기: 같은 방식으로 비교
//  pattern — 지정 문형으로 단문 말하기: 인식된 문장을 AI가 채점
//  retell  — 같은 문제를 구조 템플릿을 보고 전체 다시 답하기: 처음 답과 수치 비교
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, Square, Volume2, RotateCcw, Loader2 } from "lucide-react";
import { useSpeechRecorder } from "@/components/speaking/useSpeechRecorder";
import { compareSpoken } from "@/lib/speaking/similarity";
import type { PatternItem, RecallItem, ShadowItem, SpeakingDeliveryStats, SpeakingDrillItem } from "@/lib/speaking/reviewTypes";

type Retell = { outline: { part: string; role: string }[]; modelText: string };
type Result = { id: string; tag: string; ok: boolean };

const MODE_LABEL: Record<PatternItem["mode"], string> = {
  verb: "동사 지정",
  expression: "표현 지정",
  structure: "구조 지정",
  free: "자유 번역",
};
const MODE_DESC: Record<PatternItem["mode"], string> = {
  verb: "주어진 동사를 써서 말하세요",
  expression: "주어진 표현을 써서 말하세요",
  structure: "지정된 문장 구조로 말하세요",
  free: "힌트 없이 뜻만 보고 영어로 말하세요",
};

const PASS_SHADOW = 80;
const PASS_RECALL = 65;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function SpeakingDrillClient({ resultId, prompt, firstScript }: { resultId: string; prompt: string; firstScript: string }) {
  const [items, setItems] = useState<SpeakingDrillItem[] | null>(null);
  const [retell, setRetell] = useState<Retell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState<Result[]>([]);

  const load = useCallback(
    async (regenerate = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/speaking-2026/drill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultId, action: "get", regenerate }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || "Drill을 불러오지 못했습니다");
        setItems(json.items as SpeakingDrillItem[]);
        setRetell(json.retell as Retell);
        setIdx(0);
        setResults([]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Drill을 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    },
    [resultId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
        <p className="mt-4 text-sm font-semibold text-gray-700">내 답변에 맞는 Drill을 만들고 있어요</p>
        <p className="mt-1 text-xs text-gray-500">처음 한 번만 20~40초 걸립니다.</p>
      </div>
    );
  }
  if (error || !items) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6 text-center">
        <p className="text-sm text-rose-700">{error ?? "Drill이 없습니다"}</p>
        <button onClick={() => load(false)} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700">
          다시 시도
        </button>
      </div>
    );
  }

  const total = items.length + 1; // +1: 마지막 전체 다시 답하기
  const record = (id: string, tag: string, ok: boolean) =>
    setResults((r) => (r.some((x) => x.id === id) ? r : [...r, { id, tag, ok }]));
  const next = () => setIdx((i) => i + 1);

  const stageLabel = (it: SpeakingDrillItem | null) =>
    !it ? "마지막 · 같은 문제 다시 답하기" : it.kind === "shadow" ? "1단계 · 듣고 따라 말하기" : it.kind === "recall" ? "2단계 · 기억해서 말하기" : "3단계 · 한글 보고 말하기";

  if (idx > items.length) return <Summary results={results} resultId={resultId} onRetry={() => load(true)} />;

  const item = idx < items.length ? items[idx] : null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{stageLabel(item)}</span>
          <span>
            {idx + 1} / {total}
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${(idx / total) * 100}%` }} />
        </div>
      </div>

      {item === null ? (
        <RetellStep key="retell" resultId={resultId} prompt={prompt} retell={retell} onDone={next} />
      ) : item.kind === "shadow" ? (
        <TargetStep key={item.id} item={item} onDone={(ok) => { record(item.id, item.tag, ok); next(); }} />
      ) : item.kind === "recall" ? (
        <TargetStep key={item.id} item={item} onDone={(ok) => { record(item.id, item.tag, ok); next(); }} />
      ) : (
        <PatternStep key={item.id} item={item} resultId={resultId} onDone={(ok) => { record(item.id, item.tag, ok); next(); }} />
      )}
    </div>
  );
}

// ── 공용 UI ─────────────────────────────────────────────────────────
function Tag({ tag }: { tag: string }) {
  return <span className="inline-block rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-800">{tag}</span>;
}

function RecorderBar({ rec, disabled }: { rec: ReturnType<typeof useSpeechRecorder>; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {rec.status === "idle" && (
          <button
            onClick={rec.start}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40"
          >
            <Mic className="h-4 w-4" /> 녹음 시작
          </button>
        )}
        {rec.status === "recording" && (
          <>
            <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              {fmt(rec.seconds)}
            </span>
            <button onClick={rec.stop} className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white">
              <Square className="h-3.5 w-3.5" /> 중지
            </button>
          </>
        )}
      </div>
      {(rec.status === "recording" || rec.status === "done") && (
        <p className="min-h-[2.5rem] rounded-lg bg-gray-50 p-3 text-sm leading-relaxed text-gray-800">
          {rec.transcript}
          {rec.interim && <span className="text-gray-400">{rec.interim}</span>}
          {!rec.transcript && !rec.interim && (
            <span className="text-gray-400">{rec.status === "recording" ? "말씀해 주세요…" : "인식된 말이 없습니다."}</span>
          )}
        </p>
      )}
      {rec.status === "done" && rec.audioUrl && <audio controls src={rec.audioUrl} className="h-9 w-full" />}
      {!rec.sttSupported && (
        <p className="text-xs text-amber-700">이 브라우저는 음성 인식을 지원하지 않아요. Chrome에서 열어 주세요.</p>
      )}
      {rec.error && <p className="text-xs text-rose-600">{rec.error}</p>}
    </div>
  );
}

function speak(text: string, rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = rate;
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith("en-US"));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

function DiffLine({ diff }: { diff: { word: string; state: "hit" | "miss" }[] }) {
  return (
    <p className="text-sm leading-relaxed">
      {diff.map((d, i) => (
        <span key={i} className={d.state === "hit" ? "text-emerald-700" : "rounded bg-rose-100 px-0.5 text-rose-700 line-through decoration-rose-300"}>
          {d.word}{" "}
        </span>
      ))}
    </p>
  );
}

// ── shadow / recall: 목표 문장과 단어 비교 ───────────────────────────
function TargetStep({ item, onDone }: { item: ShadowItem | RecallItem; onDone: (ok: boolean) => void }) {
  const rec = useSpeechRecorder();
  const target = item.kind === "shadow" ? item.text : item.answer;
  const pass = item.kind === "shadow" ? PASS_SHADOW : PASS_RECALL;
  const [shown, setShown] = useState(item.kind === "shadow");
  const [listened, setListened] = useState(item.kind !== "shadow");
  const [hint, setHint] = useState(false);
  const [judged, setJudged] = useState<null | { score: number; diff: { word: string; state: "hit" | "miss" }[] }>(null);

  const judge = () => {
    const r = compareSpoken(target, rec.transcript);
    setJudged({ score: r.score, diff: r.diff });
  };
  const retry = () => {
    setJudged(null);
    rec.reset();
  };
  const ok = judged ? judged.score >= pass : false;

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <Tag tag={item.tag} />

      {item.kind === "shadow" ? (
        <>
          <p className="text-xs text-gray-500">문장을 듣고, 그대로 따라 말해 보세요.</p>
          <div className="space-y-2 rounded-xl bg-orange-50/60 p-4">
            <p className="text-lg font-semibold leading-relaxed text-gray-900">{shown ? item.text : "••••••••••"}</p>
            <p className="text-xs text-gray-500">{item.korean}</p>
            <div className="flex gap-2">
              <button onClick={() => { speak(item.text); setListened(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700">
                <Volume2 className="h-3.5 w-3.5" /> 듣기
              </button>
              <button onClick={() => speak(item.text, 0.65)} className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700">천천히</button>
              <button onClick={() => setShown((v) => !v)} className="ml-auto text-xs text-gray-500 underline">{shown ? "문장 가리기" : "문장 보기"}</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-500">뜻을 보고, 고친 문장을 기억해서 말해 보세요.</p>
          <p className="text-lg font-semibold leading-relaxed text-gray-900">{item.korean}</p>
          <button onClick={() => setHint((v) => !v)} className="text-xs text-gray-500 underline">
            {hint ? `힌트: ${item.hint}` : "힌트 보기"}
          </button>
        </>
      )}

      {!judged && (
        <>
          <RecorderBar rec={rec} disabled={!listened} />
          {!listened && <p className="text-xs text-gray-400">먼저 문장을 들어 보세요.</p>}
          {rec.status === "done" && (
            <div className="flex gap-2">
              <button onClick={judge} disabled={!rec.transcript.trim()} className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-30">
                결과 보기
              </button>
              <button onClick={rec.reset} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600">
                <RotateCcw className="h-4 w-4" /> 다시
              </button>
            </div>
          )}
        </>
      )}

      {judged && (
        <div className="space-y-3">
          <div className={`rounded-xl p-4 ${ok ? "bg-emerald-50" : "bg-rose-50"}`}>
            <p className={`text-sm font-bold ${ok ? "text-emerald-800" : "text-rose-800"}`}>
              {ok ? "✓ 좋아요!" : "✗ 한 번 더 해 볼까요?"} · 일치율 {judged.score}%
            </p>
            <div className="mt-2">
              <p className="mb-1 text-[11px] text-gray-500">목표 문장 (빨간 단어는 못 들렸어요)</p>
              <DiffLine diff={judged.diff} />
            </div>
            <p className="mt-2 text-[11px] text-gray-500">내가 말한 문장: <span className="text-gray-700">{rec.transcript}</span></p>
          </div>
          {rec.audioUrl && <audio controls src={rec.audioUrl} className="h-9 w-full" />}
          <div className="flex gap-2">
            {!ok && (
              <button onClick={retry} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
                <RotateCcw className="h-4 w-4" /> 다시 말하기
              </button>
            )}
            <button onClick={() => onDone(ok)} className="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">
              다음 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── pattern: 단문 말하기 (AI 채점) ───────────────────────────────────
function PatternStep({ item, resultId, onDone }: { item: PatternItem; resultId: string; onDone: (ok: boolean) => void }) {
  const rec = useSpeechRecorder();
    const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [res, setRes] = useState<null | { correct: boolean; feedback: string; corrected: string }>(null);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/speaking-2026/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, action: "check", transcript: rec.transcript, item: { korean: item.korean, answer: item.answer, mustUse: item.mustUse } }),
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
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <Tag tag={item.tag} />
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-[11px] font-bold text-white">{MODE_LABEL[item.mode]}</span>
        <span className="text-xs text-gray-500">{MODE_DESC[item.mode]}</span>
      </div>
      <p className="text-lg font-semibold leading-relaxed text-gray-900">{item.korean}</p>
      {item.mode !== "free" && item.constraint && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{item.constraint}</p>
      )}

      {!res && <RecorderBar rec={rec} />}
      {err && <p className="text-xs text-rose-600">{err}</p>}

      {!res && rec.status === "done" && (
        <div className="flex gap-2">
          <button onClick={submit} disabled={busy || !rec.transcript.trim()} className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-30">
            {busy ? "채점 중…" : "제출"}
          </button>
          <button onClick={rec.reset} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600">
            <RotateCcw className="h-4 w-4" /> 다시
          </button>
        </div>
      )}

      {res && (
        <div className="space-y-3">
          <div className={`rounded-xl p-4 text-sm ${res.correct ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
            <p className="font-bold">{res.correct ? "✓ 정답!" : "✗ 아쉬워요"}</p>
            <p className="mt-1 text-xs leading-relaxed">{res.feedback}</p>
            <p className="mt-2 text-xs">내가 말한 문장: <span className="font-semibold">{rec.transcript}</span></p>
            {!res.correct && <p className="mt-1 text-xs">수정: <span className="font-semibold">{res.corrected}</span></p>}
            <p className="mt-1 text-xs">모범 문장: <span className="font-semibold">{item.answer}</span></p>
          </div>
          {rec.audioUrl && <audio controls src={rec.audioUrl} className="h-9 w-full" />}
          <button onClick={() => onDone(res.correct)} className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}

// ── 마지막: 같은 문제 다시 답하기 ────────────────────────────────────
function RetellStep({ resultId, prompt, retell, onDone }: { resultId: string; prompt: string; retell: Retell | null; onDone: () => void }) {
  const rec = useSpeechRecorder();
  const [showModel, setShowModel] = useState(false);
  const [cmp, setCmp] = useState<null | { before: SpeakingDeliveryStats; after: SpeakingDeliveryStats }>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const secRef = useRef(0);
  secRef.current = rec.seconds;

  const compare = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/speaking-2026/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, action: "compare", transcript: rec.transcript, durationSec: secRef.current }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "비교에 실패했습니다");
      setCmp({ before: json.before, after: json.after });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "비교에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  const fillerCount = (s: SpeakingDeliveryStats) => s.fillers.reduce((a, f) => a + f.count, 0);

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-xs text-gray-500">처음 문제를 구조 템플릿에 맞춰 처음부터 다시 답해 보세요. (45~60초)</p>
      {prompt && <p className="rounded-xl bg-gray-50 p-4 text-sm leading-relaxed text-gray-800">{prompt}</p>}

      {retell && retell.outline.length > 0 && (
        <ol className="space-y-1.5">
          {retell.outline.map((o, i) => (
            <li key={i} className="flex gap-2 text-xs leading-relaxed">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">{i + 1}</span>
              <span>
                <span className="font-semibold text-gray-900">{o.part}</span>
                <span className="text-gray-600"> — {o.role}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      {retell?.modelText && (
        <div>
          <button onClick={() => setShowModel((v) => !v)} className="text-xs text-gray-500 underline">
            {showModel ? "모범답안 숨기기" : "모범답안 ② 보기 (막힐 때만)"}
          </button>
          {showModel && <p className="mt-2 whitespace-pre-wrap rounded-lg bg-orange-50/60 p-3 text-xs leading-relaxed text-gray-800">{retell.modelText}</p>}
        </div>
      )}

      {!cmp && <RecorderBar rec={rec} />}
      {err && <p className="text-xs text-rose-600">{err}</p>}
      {!cmp && rec.status === "done" && (
        <div className="flex gap-2">
          <button onClick={compare} disabled={busy || !rec.transcript.trim()} className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-30">
            {busy ? "비교 중…" : "처음 답과 비교하기"}
          </button>
          <button onClick={rec.reset} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600">
            <RotateCcw className="h-4 w-4" /> 다시
          </button>
        </div>
      )}

      {cmp && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-gray-200 text-xs">
            <div className="grid grid-cols-3 bg-gray-100 font-bold text-gray-600">
              <span className="px-3 py-2">지표</span>
              <span className="px-3 py-2">처음 답</span>
              <span className="px-3 py-2">다시 답</span>
            </div>
            {[
              ["단어 수", cmp.before.words, cmp.after.words],
              ["문장 수", cmp.before.sentences, cmp.after.sentences],
              ["군말", fillerCount(cmp.before), fillerCount(cmp.after)],
              ["말 속도(wpm)", cmp.before.wpm ?? "-", cmp.after.wpm ?? "-"],
            ].map(([label, a, b]) => (
              <div key={String(label)} className="grid grid-cols-3 border-t border-gray-200">
                <span className="px-3 py-2 font-semibold text-gray-700">{label}</span>
                <span className="px-3 py-2 text-gray-600">{a}</span>
                <span className="px-3 py-2 font-semibold text-orange-700">{b}</span>
              </div>
            ))}
          </div>
          {rec.audioUrl && <audio controls src={rec.audioUrl} className="h-9 w-full" />}
          <button onClick={onDone} className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">
            Drill 마치기 →
          </button>
        </div>
      )}
    </div>
  );
}

// ── 결과 요약 ───────────────────────────────────────────────────────
function Summary({ results, resultId, onRetry }: { results: Result[]; resultId: string; onRetry: () => void }) {
  const correct = results.filter((r) => r.ok).length;
  const byTag = new Map<string, { ok: number; n: number }>();
  for (const r of results) {
    const t = byTag.get(r.tag) ?? { ok: 0, n: 0 };
    t.n += 1;
    if (r.ok) t.ok += 1;
    byTag.set(r.tag, t);
  }
  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Drill 완료</p>
      <p className="text-5xl font-black text-orange-600">
        {correct}
        <span className="text-xl font-bold text-gray-400"> / {results.length}</span>
      </p>
      <div className="space-y-2 text-left">
        {[...byTag.entries()].map(([tag, v]) => (
          <div key={tag} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
            <span className="font-semibold text-gray-700">{tag}</span>
            <span className={v.ok === v.n ? "font-bold text-emerald-600" : "font-bold text-amber-600"}>{v.ok}/{v.n}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <button onClick={onRetry} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          새 문제로 다시
        </button>
        <Link href={`/student/review/speaking/${resultId}`} className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white">
          리뷰로 돌아가기
        </Link>
      </div>
    </div>
  );
}
