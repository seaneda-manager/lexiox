"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StudentExam = {
  id: string;
  title: string;
  day_from: number;
  day_to: number;
  question_count: number;
  status: "not_started" | "in_progress" | "submitted" | "graded";
  score: number | null;
  correct_count: number | null;
  total_count: number | null;
};

export default function StudentVocabExamsPage() {
  const [exams, setExams] = useState<StudentExam[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/vocab/exams", { cache: "no-store" })
      .then(async r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(d => setExams(d.exams ?? []))
      .catch(() => setError("시험 목록을 불러오지 못했어요."));
  }, []);

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">선생님이 낸 단어 시험</h1>
        <p className="mt-0.5 text-xs text-neutral-400">배정된 시험은 한 번만 볼 수 있어요. 끝까지 풀고 제출해 주세요.</p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!exams && !error && <p className="py-10 text-center text-sm text-neutral-400">불러오는 중…</p>}
      {exams && exams.length === 0 && (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          배정된 시험이 없어요.
        </div>
      )}

      <ul className="space-y-3">
        {exams?.map(e => (
          <li key={e.id} className="flex items-center justify-between gap-3 rounded-2xl border bg-white p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-neutral-900">{e.title}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Day {e.day_from}
                {e.day_to > e.day_from ? `~${e.day_to}` : ""} · {e.question_count}문항
              </p>
            </div>
            {e.status === "graded" ? (
              <div className="text-right">
                <p className="text-lg font-bold text-emerald-600">{e.score}점</p>
                <p className="text-[11px] text-neutral-400">
                  {e.correct_count}/{e.total_count} 정답
                </p>
              </div>
            ) : (
              <Link
                href={`/vocab/test?exam_id=${encodeURIComponent(e.id)}`}
                className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {e.status === "in_progress" ? "이어서 풀기" : "시험 시작"}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
