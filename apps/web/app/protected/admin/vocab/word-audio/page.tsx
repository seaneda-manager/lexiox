"use client";

import { useEffect, useRef, useState } from "react";
import { playWordAudio } from "@/lib/vocab/audio/wordAudio";

type Status = { total: number; done: number; remaining: number };

export default function VocabWordAudioPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sample, setSample] = useState("apple");
  const stopRef = useRef(false);

  async function refresh() {
    setError(null);
    const r = await fetch("/api/admin/vocab/word-audio");
    const j = await r.json();
    if (!j.ok) return setError(j.error || "상태를 불러오지 못했습니다.");
    setStatus({ total: j.total, done: j.done, remaining: j.remaining });
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function start() {
    stopRef.current = false;
    setRunning(true);
    setError(null);
    try {
      for (;;) {
        if (stopRef.current) break;
        const r = await fetch("/api/admin/vocab/word-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 20 }),
        });
        const j = await r.json();
        if (!j.ok) {
          setError(j.error || "생성 실패");
          break;
        }
        setStatus((s) => (s ? { ...s, done: s.total - j.remaining, remaining: j.remaining } : s));
        if (j.failed?.length) {
          setLog((l) => [...j.failed.map((f: { word: string; error: string }) => `✗ ${f.word}: ${f.error}`), ...l].slice(0, 30));
        }
        if (j.remaining <= 0) break;
        // 한 개도 못 만들었으면 같은 단어에서 반복하게 되므로 멈춘다 (키·요금제 한도 확인 필요)
        if (j.generated === 0) {
          setError("생성된 단어가 없어 멈췄습니다. 아래 오류 로그(API 키·요금제 한도)를 확인하세요.");
          break;
        }
      }
    } finally {
      setRunning(false);
      void refresh();
    }
  }

  const pct = status && status.total ? Math.round((status.done / status.total) * 100) : 0;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">단어 발음 음성 만들기</h1>
        <p className="mt-1 text-sm text-slate-600">
          모든 단어의 발음을 ElevenLabs로 한 번만 만들어 저장해 둡니다. 저장된 음성이 있는 단어는 시험·학습에서 그 음성이 나오고,
          없는 단어는 지금처럼 브라우저 음성이 나옵니다. 이미 만든 단어는 다시 만들지 않습니다.
        </p>
      </header>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-slate-600">진행</span>
          <span className="text-lg font-semibold tabular-nums text-slate-900">
            {status ? `${status.done.toLocaleString()} / ${status.total.toLocaleString()}` : "…"}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex gap-2">
          {!running ? (
            <button
              onClick={start}
              disabled={!status || status.remaining === 0}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {status && status.remaining === 0 ? "모두 완료" : "만들기 시작"}
            </button>
          ) : (
            <button
              onClick={() => {
                stopRef.current = true;
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
            >
              멈춤 (이번 묶음까지 하고 멈춰요)
            </button>
          )}
          <button onClick={() => void refresh()} disabled={running} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-40">
            새로고침
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </section>

      <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-800">들어보기</h2>
        <div className="flex gap-2">
          <input
            value={sample}
            onChange={(e) => setSample(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="단어"
          />
          <button onClick={() => playWordAudio(sample)} className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">
            ▶ 재생
          </button>
        </div>
        <p className="text-xs text-slate-500">저장된 음성이 없으면 브라우저 음성이 재생됩니다.</p>
      </section>

      {log.length > 0 && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h2 className="mb-1 text-sm font-semibold text-red-700">실패한 단어</h2>
          <ul className="space-y-0.5 text-xs text-red-700">
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
