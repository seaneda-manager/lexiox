"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ResultRow = {
  id: string;
  testId: string;
  testLabel: string;
  module: number;
  difficulty: "hard" | "easy" | null;
  correctCount: number;
  totalQuestions: number;
  takenAt: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ListeningReviewPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/updated-listening/results");
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "결과를 불러올 수 없습니다");
        setResults(data.results);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Listening Review</h1>
        <p className="text-xs text-neutral-500">
          지금까지 응시한 기록입니다. Module 1 성적에 따라 Module 2 난이도가 갈립니다.
        </p>
      </header>

      {loading && <p className="text-sm text-neutral-500">불러오는 중…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && !error && results.length === 0 && (
        <div className="space-y-3 rounded-xl border bg-white px-6 py-10 text-center text-sm text-neutral-500">
          <p>아직 응시 기록이 없습니다.</p>
          <div className="flex justify-center gap-2">
            <Link href="/updated-listening/study" className="rounded-lg border px-3 py-1.5 text-xs hover:bg-neutral-50">
              Study Mode
            </Link>
            <Link href="/updated-listening/test" className="rounded-lg border px-3 py-1.5 text-xs hover:bg-neutral-50">
              Test Mode
            </Link>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="divide-y overflow-hidden rounded-xl border bg-white shadow-sm">
          {results.map((r) => {
            const pct =
              r.totalQuestions > 0 ? Math.round((r.correctCount / r.totalQuestions) * 100) : 0;
            return (
              <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <p className="truncate text-sm font-medium text-neutral-900">{r.testLabel}</p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
                    <span>{fmt(r.takenAt)}</span>
                    <span>·</span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600">
                      Module {r.module}
                    </span>
                    {r.difficulty && (
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          r.difficulty === "hard"
                            ? "bg-rose-50 text-rose-700"
                            : "bg-sky-50 text-sky-700"
                        }`}
                      >
                        {r.difficulty}
                      </span>
                    )}
                  </div>
                </div>
                <div className="whitespace-nowrap text-right">
                  <div
                    className={`text-sm font-bold ${pct >= 70 ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {pct}%
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {r.correctCount}/{r.totalQuestions}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link href="/updated-listening" className="inline-block text-xs text-neutral-500 hover:underline">
        ← Listening 홈
      </Link>
    </div>
  );
}
