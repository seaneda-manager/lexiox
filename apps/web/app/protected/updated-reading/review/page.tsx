"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ResultRow = {
  id: string;
  testId: string;
  testLabel: string;
  totalQuestions: number;
  isAdaptive: boolean;
  stage2Difficulty: "easy" | "hard" | null;
  takenAt: string | null;
};

function fmt(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ReadingReviewPage() {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/updated-reading/results");
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
        <h1 className="text-xl font-semibold">Reading Review</h1>
        <p className="text-xs text-neutral-500">
          지금까지 푼 시험을 다시 열어 문항별 해설과 오답 이유를 확인합니다.
        </p>
      </header>

      {loading && <p className="text-sm text-neutral-500">불러오는 중…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {!loading && !error && results.length === 0 && (
        <div className="rounded-xl border bg-white px-6 py-10 text-center text-sm text-neutral-500 space-y-3">
          <p>아직 응시 기록이 없습니다.</p>
          <div className="flex justify-center gap-2">
            <Link href="/updated-reading/study" className="rounded-lg border px-3 py-1.5 text-xs hover:bg-neutral-50">
              Study Mode
            </Link>
            <Link href="/updated-reading/test" className="rounded-lg border px-3 py-1.5 text-xs hover:bg-neutral-50">
              Test Mode
            </Link>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="divide-y overflow-hidden rounded-xl border bg-white shadow-sm">
          {results.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium text-neutral-900">{r.testLabel}</p>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
                  <span>{fmt(r.takenAt)}</span>
                  <span>·</span>
                  <span>{r.totalQuestions}문항</span>
                  {r.isAdaptive && (
                    <>
                      <span>·</span>
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                        적응형{r.stage2Difficulty ? ` · Module 2 ${r.stage2Difficulty}` : ""}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <Link
                href={`/updated-reading/result/${r.id}`}
                className="whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-sky-50"
              >
                해설 보기
              </Link>
            </div>
          ))}
        </div>
      )}

      <Link href="/updated-reading" className="inline-block text-xs text-neutral-500 hover:underline">
        ← Reading 홈
      </Link>
    </div>
  );
}
