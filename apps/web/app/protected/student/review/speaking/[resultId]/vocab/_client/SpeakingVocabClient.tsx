"use client";
// 말하기 단어시험
//  1) study — 단어 목록을 보며 암기(항목을 누르면 영어 발음 재생). 타이머가 끝나거나 직접 시험 시작.
//  2) test  — 한글 뜻을 화면에 보이고 읽어 주면(ko-KR TTS) 영어 표현을 말해 녹음. 인식된 말과 정답을 비교.
//  3) summary — 틀린 항목 목록 + 틀린 것만 다시 보기
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Mic, RotateCcw, Square, Volume2 } from "lucide-react";
import { useSpeechRecorder } from "@/components/speaking/useSpeechRecorder";
import { tokens } from "@/lib/speaking/similarity";
import type { SpeakingVocabEntry, VocabKind } from "@/lib/speaking/reviewTypes";

const KIND_LABEL: Record<VocabKind, string> = { word: "단어", phrasal: "이어동사", idiom: "숙어" };
const KIND_CLS: Record<VocabKind, string> = {
  word: "bg-sky-50 text-sky-700",
  phrasal: "bg-violet-50 text-violet-700",
  idiom: "bg-amber-50 text-amber-800",
};
const STUDY_SECONDS = 120;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function speak(text: string, lang: "en-US" | "ko-KR", rate = 0.9) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = rate;
  const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith(lang));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

/** 첫 글자 힌트: 단어마다 첫 글자만 보이고 나머지는 밑줄 (예: "add up to" → "a__ u_ t_") */
function firstLetterHint(en: string): string {
  return en
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] + "_".repeat(Math.max(1, w.length - 1)))
    .join("  ");
}

/** 인식 결과에 정답 표현(또는 변형)이 그대로 들어 있으면 통과. 한두 단어 표현은 음성 인식이 불안정하므로 포함 여부로 판정한다. */
function matches(entry: SpeakingVocabEntry, spoken: string): boolean {
  const said = ` ${tokens(spoken).join(" ")} `;
  return [entry.en, ...entry.alts].some((c) => {
    const t = tokens(c).join(" ");
    return t.length > 0 && said.includes(` ${t} `);
  });
}

export default function SpeakingVocabClient({ resultId }: { resultId: string }) {
  const [items, setItems] = useState<SpeakingVocabEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"study" | "test" | "summary">("study");
  const [queue, setQueue] = useState<SpeakingVocabEntry[]>([]);
  const [missed, setMissed] = useState<SpeakingVocabEntry[]>([]);
  const [correct, setCorrect] = useState(0);

  const load = useCallback(
    async (regenerate = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/speaking-2026/vocab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultId, regenerate }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || "단어 목록을 불러오지 못했습니다");
        setItems(json.items as SpeakingVocabEntry[]);
        setPhase("study");
      } catch (e) {
        setError(e instanceof Error ? e.message : "단어 목록을 불러오지 못했습니다");
      } finally {
        setLoading(false);
      }
    },
    [resultId],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const startTest = (list: SpeakingVocabEntry[]) => {
    // 시험은 순서를 섞어서 본다
    setQueue([...list].sort(() => Math.random() - 0.5));
    setMissed([]);
    setCorrect(0);
    setPhase("test");
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-orange-500" />
        <p className="mt-4 text-sm font-semibold text-gray-700">이 주제의 단어 목록을 만들고 있어요</p>
        <p className="mt-1 text-xs text-gray-500">처음 한 번만 20~40초 걸립니다.</p>
      </div>
    );
  }
  if (error || !items) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-6 text-center">
        <p className="text-sm text-rose-700">{error ?? "단어 목록이 없습니다"}</p>
        <button onClick={() => load(false)} className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700">
          다시 시도
        </button>
      </div>
    );
  }

  if (phase === "study") return <StudyPhase items={items} onStart={() => startTest(items)} />;
  if (phase === "test")
    return (
      <TestPhase
        queue={queue}
        onFinish={(m, c) => {
          setMissed(m);
          setCorrect(c);
          setPhase("summary");
        }}
      />
    );

  return (
    <Summary
      total={queue.length}
      correct={correct}
      missed={missed}
      resultId={resultId}
      onRetryMissed={() => startTest(missed)}
      onRetryAll={() => setPhase("study")}
      onRegenerate={() => load(true)}
    />
  );
}

// ── 1) 암기 시간 ─────────────────────────────────────────────────────
function StudyPhase({ items, onStart }: { items: SpeakingVocabEntry[]; onStart: () => void }) {
  const [left, setLeft] = useState(STUDY_SECONDS);
  const [hideKo, setHideKo] = useState(false);
  const startRef = useRef(onStart);
  startRef.current = onStart;

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left <= 0) startRef.current();
  }, [left]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-orange-50 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-orange-900">암기 시간</p>
          <p className="text-xs text-orange-800/70">항목을 누르면 영어 발음이 나와요. 시간이 끝나면 시험이 시작됩니다.</p>
        </div>
        <span className={`text-2xl font-black tabular-nums ${left <= 15 ? "text-rose-600" : "text-orange-700"}`}>{fmt(Math.max(0, left))}</span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>총 {items.length}개 · 단어 / 이어동사 / 숙어</span>
        <button onClick={() => setHideKo((v) => !v)} className="underline">{hideKo ? "한글 뜻 보기" : "한글 뜻 가리기 (스스로 테스트)"}</button>
      </div>

      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id}>
            <button
              onClick={() => speak(it.en, "en-US", 0.8)}
              className="group flex w-full items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left hover:border-orange-300 hover:bg-orange-50/40"
            >
              <Volume2 className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 group-hover:text-orange-500" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-gray-900">{it.en}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_CLS[it.kind]}`}>{KIND_LABEL[it.kind]}</span>
                </span>
                <span className={`mt-0.5 block text-sm ${hideKo ? "text-transparent select-none" : "text-gray-600"}`}>{it.ko}</span>
                {it.example && <span className="mt-1 block text-xs italic leading-relaxed text-gray-400">“{it.example}”</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button onClick={onStart} className="w-full rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">
        시험 시작하기 →
      </button>
    </div>
  );
}

// ── 2) 시험 ──────────────────────────────────────────────────────────
function TestPhase({ queue, onFinish }: { queue: SpeakingVocabEntry[]; onFinish: (missed: SpeakingVocabEntry[], correct: number) => void }) {
  const [idx, setIdx] = useState(0);
  const [missed, setMissed] = useState<SpeakingVocabEntry[]>([]);
  const [correct, setCorrect] = useState(0);
  const rec = useSpeechRecorder();
  const [verdict, setVerdict] = useState<null | boolean>(null);
  const [tries, setTries] = useState(0);

  const item = queue[idx];
  const spokenKo = useRef<string>("");

  // 문제가 바뀌면 한글 뜻을 읽어 준다
  useEffect(() => {
    if (!item || spokenKo.current === item.id) return;
    spokenKo.current = item.id;
    speak(item.ko, "ko-KR", 1);
  }, [item]);

  const judge = () => {
    const ok = matches(item, rec.transcript);
    setVerdict(ok);
    setTries((t) => t + 1);
  };

  const advance = (ok: boolean) => {
    const nextMissed = ok ? missed : [...missed, item];
    const nextCorrect = ok ? correct + 1 : correct;
    setMissed(nextMissed);
    setCorrect(nextCorrect);
    if (idx + 1 >= queue.length) {
      onFinish(nextMissed, nextCorrect);
      return;
    }
    setIdx(idx + 1);
    setVerdict(null);
    setTries(0);
    rec.reset();
  };

  const pct = useMemo(() => Math.round((idx / queue.length) * 100), [idx, queue.length]);
  if (!item) return null;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="font-semibold text-gray-700">한글 뜻을 영어로 말하세요</span>
          <span>{idx + 1} / {queue.length}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${KIND_CLS[item.kind]}`}>{KIND_LABEL[item.kind]}</span>
          <button onClick={() => speak(item.ko, "ko-KR", 1)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50">
            <Volume2 className="h-3.5 w-3.5" /> 다시 듣기
          </button>
        </div>
        <p className="text-2xl font-bold leading-relaxed text-gray-900">{item.ko}</p>
        <p className="font-mono text-lg font-semibold tracking-widest text-orange-600" aria-label="첫 글자 힌트">
          {firstLetterHint(item.en)}
        </p>

        {verdict === null && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {rec.status === "idle" && (
                <button onClick={rec.start} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                  <Mic className="h-4 w-4" /> 녹음 시작
                </button>
              )}
              {rec.status === "recording" && (
                <>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" /> {fmt(rec.seconds)}
                  </span>
                  <button onClick={rec.stop} className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white">
                    <Square className="h-3.5 w-3.5" /> 중지
                  </button>
                </>
              )}
            </div>
            {(rec.status === "recording" || rec.status === "done") && (
              <p className="min-h-[2.5rem] rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
                {rec.transcript}
                {rec.interim && <span className="text-gray-400">{rec.interim}</span>}
                {!rec.transcript && !rec.interim && <span className="text-gray-400">{rec.status === "recording" ? "말씀해 주세요…" : "인식된 말이 없습니다."}</span>}
              </p>
            )}
            {!rec.sttSupported && <p className="text-xs text-amber-700">이 브라우저는 음성 인식을 지원하지 않아요. Chrome에서 열어 주세요.</p>}
            {rec.error && <p className="text-xs text-rose-600">{rec.error}</p>}
            {rec.status === "done" && (
              <div className="flex gap-2">
                <button onClick={judge} disabled={!rec.transcript.trim()} className="flex-1 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-30">
                  제출
                </button>
                <button onClick={rec.reset} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600">
                  <RotateCcw className="h-4 w-4" /> 다시
                </button>
              </div>
            )}
          </div>
        )}

        {verdict !== null && (
          <div className="space-y-3">
            <div className={`rounded-xl p-4 ${verdict ? "bg-emerald-50" : "bg-rose-50"}`}>
              <p className={`text-sm font-bold ${verdict ? "text-emerald-800" : "text-rose-800"}`}>{verdict ? "✓ 정답!" : "✗ 아쉬워요"}</p>
              <p className="mt-1 text-xs text-gray-600">내가 말한 것: <span className="font-semibold">{rec.transcript}</span></p>
              <p className="mt-1 text-sm text-gray-800">정답: <span className="font-bold">{item.en}</span></p>
              {item.example && <p className="mt-1 text-xs italic text-gray-500">“{item.example}”</p>}
            </div>
            {rec.audioUrl && <audio controls src={rec.audioUrl} className="h-9 w-full" />}
            <div className="flex gap-2">
              {!verdict && tries < 2 && (
                <button onClick={() => { setVerdict(null); rec.reset(); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700">
                  <RotateCcw className="h-4 w-4" /> 한 번 더
                </button>
              )}
              <button onClick={() => speak(item.en, "en-US", 0.8)} className="inline-flex items-center gap-1 rounded-xl border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700">
                <Volume2 className="h-4 w-4" /> 발음
              </button>
              <button onClick={() => advance(verdict)} className="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">
                {idx + 1 >= queue.length ? "결과 보기" : "다음 →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 3) 결과 ──────────────────────────────────────────────────────────
function Summary({
  total,
  correct,
  missed,
  resultId,
  onRetryMissed,
  onRetryAll,
  onRegenerate,
}: {
  total: number;
  correct: number;
  missed: SpeakingVocabEntry[];
  resultId: string;
  onRetryMissed: () => void;
  onRetryAll: () => void;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">단어시험 결과</p>
        <p className="mt-2 text-5xl font-black text-orange-600">
          {correct}
          <span className="text-xl font-bold text-gray-400"> / {total}</span>
        </p>
      </div>

      {missed.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-gray-900">다시 외울 표현</p>
          <ul className="space-y-1.5">
            {missed.map((m) => (
              <li key={m.id}>
                <button onClick={() => speak(m.en, "en-US", 0.8)} className="flex w-full items-center gap-3 rounded-lg bg-rose-50 px-3 py-2 text-left text-sm hover:bg-rose-100">
                  <Volume2 className="h-4 w-4 shrink-0 text-rose-400" />
                  <span className="font-bold text-rose-900">{m.en}</span>
                  <span className="text-xs text-gray-600">{m.ko}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {missed.length > 0 && (
          <button onClick={onRetryMissed} className="flex-1 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">
            틀린 것만 다시 보기
          </button>
        )}
        <button onClick={onRetryAll} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          처음부터 다시
        </button>
        <button onClick={onRegenerate} className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          새 단어 목록
        </button>
      </div>
      <Link href={`/student/review/speaking/${resultId}`} className="block text-center text-xs text-gray-500 underline">
        리뷰로 돌아가기
      </Link>
    </div>
  );
}
