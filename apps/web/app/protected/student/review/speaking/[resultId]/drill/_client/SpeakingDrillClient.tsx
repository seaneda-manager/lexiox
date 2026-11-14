"use client";
// 녹음 Drill: 모든 문항을 마이크로 답한다.
//  shadow  — 듣고(TTS) 따라 말하기: 인식된 문장과 목표 문장을 단어 단위로 비교
//  recall  — 한글 뜻 + 힌트만 보고 기억해서 말하기: 같은 방식으로 비교
//  pattern — 지정 문형으로 단문 말하기: 인식된 문장을 AI가 채점
//  retell  — 같은 문제를 구조 템플릿을 보고 전체 다시 답하기: 처음 답과 수치 비교
import ReviewGate, { type GateInfo } from "@/components/review/ReviewGate";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, Square, Volume2, RotateCcw, Loader2 } from "lucide-react";
import { useSpeechRecorder } from "@/components/speaking/useSpeechRecorder";
import MicCheck from "@/components/speaking/MicCheck";
import { compareSpoken } from "@/lib/speaking/similarity";
import type { DictationItem, FixItem, PatternItem, RecallItem, ShadowItem, SpeakingDeliveryStats, SpeakingDrillItem } from "@/lib/speaking/reviewTypes";

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

const PASS_SAY = 70; // 타이핑 후 소리 내어 말하기 통과선
const PLAY_FREE = 1; // 무료로 들을 수 있는 횟수
const PLAY_PENALTY = 10; // 재청취 1회마다 감점
const PASS_DICTATION = 60; // 감점 후 점수 통과선
const PASS_SHADOW = 80;
const PASS_RECALL = 65;

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function SpeakingDrillClient({ resultId, prompt, firstScript }: { resultId: string; prompt: string; firstScript: string }) {
  const [items, setItems] = useState<SpeakingDrillItem[] | null>(null);
  const [retell, setRetell] = useState<Retell | null>(null);
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
        const res = await fetch("/api/speaking-2026/drill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultId, action: "get" }),
        });
        const json = await res.json().catch(() => ({}));
        if (json.notPublished || json.notGenerated) {
          setGate(json as GateInfo);
          return;
        }
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
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
        <p className="mt-4 text-sm font-semibold text-gray-700">Drill을 불러오고 있어요</p>
        <p className="mt-1 text-xs text-gray-500"></p>
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

  const total = items.length + 1; // +1: 마지막 전체 다시 답하기
  const record = (id: string, tag: string, ok: boolean) =>
    setResults((r) => (r.some((x) => x.id === id) ? r : [...r, { id, tag, ok }]));
  const next = () => setIdx((i) => i + 1);

  const stageLabel = (it: SpeakingDrillItem | null) =>
    !it
      ? "마지막 · 같은 문제 다시 답하기"
      : it.kind === "shadow"
        ? "듣고 따라 말하기"
        : it.kind === "dictation"
          ? "듣고 기억해서 쓰고 말하기"
          : it.kind === "fix"
            ? "틀린 문장 고치고 말하기"
            : it.kind === "recall"
              ? "기억해서 말하기"
              : "한글 보고 말하기";

  if (idx > items.length) return <Summary results={results} resultId={resultId} onRetry={() => { setIdx(0); setResults([]); }} />;

  const item = idx < items.length ? items[idx] : null;

  return (
    <div className="space-y-4">
      <MicCheck />
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
      ) : item.kind === "dictation" ? (
        <DictationStep key={item.id} item={item} onDone={(oks) => { oks.forEach((o, i) => record(`${item.id}-${i}`, item.tag, o)); next(); }} />
      ) : item.kind === "fix" ? (
        <FixStep key={item.id} item={item} resultId={resultId} onDone={(oks) => { oks.forEach((o, i) => record(`${item.id}-${i}`, item.tag, o)); next(); }} />
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

/** 전에 틀려서 고친 부분(changes[].to)을 노란색으로 표시한다. */
function Highlight({ text, changes }: { text: string; changes?: { from: string; to: string }[] }) {
  const ranges: { start: number; end: number }[] = [];
  const low = text.toLowerCase();
  for (const c of changes ?? []) {
    const t = c.to.toLowerCase();
    if (!t) continue;
    const i = low.indexOf(t);
    if (i >= 0 && !ranges.some((r) => i < r.end && i + t.length > r.start)) ranges.push({ start: i, end: i + t.length });
  }
  ranges.sort((x, y) => x.start - y.start);
  const out: React.ReactNode[] = [];
  let pos = 0;
  ranges.forEach((r, k) => {
    if (r.start > pos) out.push(text.slice(pos, r.start));
    out.push(
      <mark key={k} className="rounded bg-yellow-200 px-0.5 text-gray-900">
        {text.slice(r.start, r.end)}
      </mark>,
    );
    pos = r.end;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return <>{out}</>;
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
            <p className="text-lg font-semibold leading-relaxed text-gray-900">
              {shown ? <Highlight text={item.text} changes={item.changes} /> : "••••••••••"}
            </p>
            <p className="text-xs text-gray-500">{item.korean}</p>
            {shown && item.original && item.original.trim().toLowerCase() !== item.text.trim().toLowerCase() && (
              <p className="rounded-lg bg-white/70 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
                내가 말한 문장: <span className="text-rose-600 line-through decoration-rose-300">{item.original}</span>
                <br />
                <span className="rounded bg-yellow-200 px-1 text-gray-800">노란 표시</span> = 전에 틀려서 고친 부분
              </p>
            )}
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


// ── 말하기 확인: 문장을 말하고 인식된 결과를 목표와 비교 (dictation/fix 공용) ───
function SaySentence({
  target,
  hidden,
  onResult,
  label,
  korean,
}: {
  target: string;
  hidden: boolean;
  onResult: (ok: boolean) => void;
  label: string;
  korean?: string;
}) {
  const rec = useSpeechRecorder();
  const [judged, setJudged] = useState<null | { score: number; diff: { word: string; state: "hit" | "miss" }[] }>(null);

  if (judged) {
    const ok = judged.score >= PASS_SAY;
    return (
      <div className="space-y-3">
        <div className={`rounded-xl p-4 ${ok ? "bg-emerald-50" : "bg-rose-50"}`}>
          <p className={`text-sm font-bold ${ok ? "text-emerald-800" : "text-rose-800"}`}>
            {ok ? "✓ 말하기 통과" : "✗ 말하기 다시 해 볼까요?"} · 일치율 {judged.score}%
          </p>
          <div className="mt-2">
            <p className="mb-1 text-[11px] text-gray-500">정답 문장 (빨간 단어는 못 들렸어요)</p>
            <DiffLine diff={judged.diff} />
          </div>
          <p className="mt-2 text-[11px] text-gray-500">내가 말한 문장: <span className="text-gray-700">{rec.transcript}</span></p>
        </div>
        {rec.audioUrl && <audio controls src={rec.audioUrl} className="h-9 w-full" />}
        <div className="flex gap-2">
          {!ok && (
            <button onClick={() => { setJudged(null); rec.reset(); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
              <RotateCcw className="h-4 w-4" /> 다시 말하기
            </button>
          )}
          <button onClick={() => onResult(ok)} className="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">
            다음 →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-orange-700">{label}</p>
      {korean && (
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-[11px] font-semibold text-gray-500">한글 뜻</p>
          <p className="text-base font-semibold leading-relaxed text-gray-900">{korean}</p>
        </div>
      )}
      <p className="rounded-xl bg-orange-50/60 p-4 text-lg font-semibold leading-relaxed text-gray-900">{hidden ? "••••••••••••••" : target}</p>
      <RecorderBar rec={rec} />
      {rec.status === "done" && (
        <div className="flex gap-2">
          <button
            onClick={() => {
              const r = compareSpoken(target, rec.transcript);
              setJudged({ score: r.score, diff: r.diff });
            }}
            disabled={!rec.transcript.trim()}
            className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-30"
          >
            결과 보기
          </button>
          <button onClick={rec.reset} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600">
            <RotateCcw className="h-4 w-4" /> 다시
          </button>
        </div>
      )}
    </div>
  );
}

// ── dictation: 듣고 기억해서 타이핑(재청취 감점) → 소리 내어 말하기(녹음) ─────
function DictationStep({ item, onDone }: { item: DictationItem; onDone: (oks: boolean[]) => void }) {
  const [plays, setPlays] = useState(0);
  const [typed, setTyped] = useState("");
  const [typeResult, setTypeResult] = useState<null | { base: number; score: number; diff: { word: string; state: "hit" | "miss" }[] }>(null);
  const [phase, setPhase] = useState<"type" | "say">("type");

  const extra = Math.max(0, plays - PLAY_FREE);
  const penalty = extra * PLAY_PENALTY;

  const play = (rate = 0.9) => {
    speak(item.text, rate);
    setPlays((n) => n + 1);
  };

  const check = () => {
    const r = compareSpoken(item.text, typed);
    setTypeResult({ base: r.score, score: Math.max(0, r.score - penalty), diff: r.diff });
  };
  const typedOk = typeResult ? typeResult.score >= PASS_DICTATION : false;

  if (phase === "say") {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <Tag tag={item.tag} />
        <SaySentence
          target={item.text}
          hidden={false}
          korean={item.korean}
          label="이제 같은 문장을 소리 내어 말해 보세요."
          onResult={(sayOk) => onDone([typedOk, sayOk])}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <Tag tag={item.tag} />
      <p className="text-xs text-gray-500">
        문장을 듣고 기억해서 그대로 입력하세요. 첫 {PLAY_FREE}번은 무료, 다시 들을 때마다 <b>{PLAY_PENALTY}점 감점</b>됩니다.
      </p>
      <div className="space-y-2 rounded-xl bg-orange-50/60 p-4">
        <div className="flex items-center gap-2">
          <button onClick={() => play()} disabled={!!typeResult} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-40">
            <Volume2 className="h-3.5 w-3.5" /> {plays === 0 ? "듣기" : "다시 듣기"}
          </button>
          <button onClick={() => play(0.65)} disabled={!!typeResult} className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 disabled:opacity-40">
            천천히
          </button>
          <span className="ml-auto text-xs text-gray-600">
            들은 횟수 <b>{plays}</b>회{penalty > 0 && <span className="font-semibold text-rose-600"> · -{penalty}점</span>}
          </span>
        </div>
        <p className="text-xs text-gray-500">{item.korean}</p>
      </div>

      <textarea
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        disabled={!!typeResult}
        rows={2}
        placeholder="들은 문장을 입력하세요"
        className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
      />

      {!typeResult ? (
        <button onClick={check} disabled={plays === 0 || !typed.trim()} className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-30">
          {plays === 0 ? "먼저 문장을 들어 보세요" : "제출"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className={`rounded-xl p-4 ${typedOk ? "bg-emerald-50" : "bg-rose-50"}`}>
            <p className={`text-sm font-bold ${typedOk ? "text-emerald-800" : "text-rose-800"}`}>
              {typedOk ? "✓ 잘 기억했어요!" : "✗ 아쉬워요"} · 점수 {typeResult.score}점
              {penalty > 0 && <span className="font-normal text-gray-500"> (일치율 {typeResult.base}% - 재청취 {penalty}점)</span>}
            </p>
            <div className="mt-2">
              <p className="mb-1 text-[11px] text-gray-500">정답 문장 (빨간 단어는 빠졌어요)</p>
              <DiffLine diff={typeResult.diff} />
            </div>
          </div>
          <button onClick={() => setPhase("say")} className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">
            이어서 소리 내어 말하기 →
          </button>
        </div>
      )}
    </div>
  );
}

// ── fix(문법 드릴): 틀린 문장을 듣고(최대 5번) 바르게 고쳐 타이핑 → "지워집니다" 알림 → 한글 뜻만 보고 말하기 ──
const MAX_FIX_PLAYS = 5;

function FixStep({ item, resultId, onDone }: { item: FixItem; resultId: string; onDone: (oks: boolean[]) => void }) {
  const [plays, setPlays] = useState(0);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fix, setFix] = useState<null | { correct: boolean; feedback: string }>(null);
  const [phase, setPhase] = useState<"listen" | "erasing" | "say">("listen");
  const [faded, setFaded] = useState(false);

  const play = (rate = 0.9) => {
    if (plays >= MAX_FIX_PLAYS) return;
    speak(item.wrong, rate);
    setPlays((n) => n + 1);
  };

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      // 정답과 사실상 같으면 AI 호출 없이 통과
      const local = compareSpoken(item.answer, typed);
      if (local.score >= 97 && local.extra.length === 0) {
        setFix({ correct: true, feedback: "정확하게 고쳤어요." });
        return;
      }
      const r = await fetch("/api/speaking-2026/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId, action: "fix", typed, item: { wrong: item.wrong, answer: item.answer } }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok || !json.ok) throw new Error(json.error || "채점에 실패했습니다");
      setFix(json.result);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "채점에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  // 문장이 서서히 지워진 뒤 말하기 단계로 넘어간다
  useEffect(() => {
    if (phase !== "erasing") return;
    setFaded(false);
    const a = setTimeout(() => setFaded(true), 700);
    const b = setTimeout(() => setPhase("say"), 3200);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [phase]);

  const koreanBox = item.korean ? (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[11px] font-semibold text-gray-500">한글 뜻</p>
      <p className="text-base font-semibold leading-relaxed text-gray-900">{item.korean}</p>
    </div>
  ) : null;

  if (phase === "say") {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <Tag tag={item.tag} />
        <SaySentence
          target={item.answer}
          hidden
          korean={item.korean}
          label="영어 문장이 지워졌어요. 한글 뜻을 보고 기억해서 말해 보세요."
          onResult={(sayOk) => onDone([fix?.correct ?? false, sayOk])}
        />
      </div>
    );
  }

  if (phase === "erasing") {
    return (
      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <Tag tag={item.tag} />
        <div role="status" aria-live="polite" className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900">
          ✂️ 잠시 후 영어 문장이 화면에서 지워집니다. 마지막으로 눈에 담아 두세요!
        </div>
        {koreanBox}
        <p
          className="rounded-xl bg-emerald-50 p-4 text-lg font-semibold leading-relaxed text-emerald-900 transition-opacity duration-[2000ms]"
          style={{ opacity: faded ? 0 : 1 }}
        >
          <Highlight text={item.answer} changes={item.changes} />
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
      <Tag tag={item.tag} />
      <p className="text-xs text-gray-500">
        문법 오류가 들어 있는 문장을 들려드려요(최대 {MAX_FIX_PLAYS}번). 듣고 <b>바르게 고쳐서</b> 입력하세요.
      </p>
      {koreanBox}
      <div className="flex items-center gap-2 rounded-xl bg-orange-50/60 p-3">
        <button onClick={() => play()} disabled={plays >= MAX_FIX_PLAYS || !!fix} className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-40">
          <Volume2 className="h-3.5 w-3.5" /> {plays === 0 ? "듣기" : "다시 듣기"}
        </button>
        <button onClick={() => play(0.65)} disabled={plays >= MAX_FIX_PLAYS || !!fix} className="rounded-lg border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 disabled:opacity-40">
          천천히
        </button>
        <span className="ml-auto text-xs text-gray-600">
          들은 횟수 <b>{plays}</b> / {MAX_FIX_PLAYS}
        </span>
      </div>
      <textarea
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        disabled={!!fix}
        rows={2}
        placeholder="바르게 고친 문장을 입력하세요"
        className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-orange-500 focus:outline-none disabled:bg-gray-50"
      />
      {err && <p className="text-xs text-rose-600">{err}</p>}

      {!fix ? (
        <button onClick={submit} disabled={busy || plays === 0 || !typed.trim()} className="w-full rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-30">
          {busy ? "채점 중…" : plays === 0 ? "먼저 문장을 들어 보세요" : "제출"}
        </button>
      ) : (
        <div className="space-y-3">
          <div className={`rounded-xl p-4 text-sm ${fix.correct ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-900"}`}>
            <p className="font-bold">{fix.correct ? "✓ 잘 고쳤어요!" : "✗ 아직 틀린 부분이 있어요"}</p>
            <p className="mt-1 text-xs leading-relaxed">{fix.feedback}</p>
            <div className="mt-3 space-y-1 text-xs">
              <p className="text-gray-500">들려드린 문장(오류): <span className="text-rose-700 line-through decoration-rose-300">{item.wrong}</span></p>
              <p className="text-gray-500">바른 문장: <span className="font-semibold text-emerald-800"><Highlight text={item.answer} changes={item.changes} /></span></p>
              {item.explanation && <p className="pt-1 text-gray-600">{item.explanation}</p>}
            </div>
          </div>
          <button onClick={() => setPhase("erasing")} className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">
            문장 지우고 말하기로 →
          </button>
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
  // 마칠 때 한 번 결과를 저장한다 (학생 본인이 볼 때만 서버가 저장하고, 선생님 미리보기는 건너뛴다)
  const savedRef = useRef(false);
  const [saveState, setSaveState] = useState<"saving" | "ok" | "fail" | "skip">("saving");
  useEffect(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    fetch("/api/speaking-2026/drill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultId, action: "finish", results: results.map((r) => ({ tag: r.tag, ok: r.ok })) }),
    })
      .then((r) => r.json())
      .then((j) => setSaveState(j.skipped ? "skip" : j.ok ? "ok" : "fail"))
      .catch(() => setSaveState("fail"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      {saveState !== "skip" && (
        <p className="text-[11px] text-gray-400">
          {saveState === "saving" ? "결과 저장 중…" : saveState === "ok" ? "✓ 결과가 저장됐어요" : "결과를 저장하지 못했어요"}
        </p>
      )}
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
          같은 문제 다시 풀기
        </button>
        <Link href={`/student/review/speaking/${resultId}`} className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white">
          리뷰로 돌아가기
        </Link>
      </div>
    </div>
  );
}
