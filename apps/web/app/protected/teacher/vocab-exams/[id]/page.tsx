"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { QUESTION_TYPE_LABEL } from "@/lib/vocab/test/teacherExam";
import type { QuestionType } from "@/models/vocab/test.types";

type Detail = {
  exam: {
    id: string;
    title: string;
    day_from: number;
    day_to: number;
    question_count: number;
    question_types: QuestionType[];
    created_at: string;
  };
  results: Array<{
    student_id: string;
    name: string;
    status: string;
    score: number | null;
    correct_count: number | null;
    total_count: number | null;
  }>;
};

const STATUS_LABEL: Record<string, string> = {
  not_started: "미응시",
  in_progress: "응시 중",
  submitted: "제출",
  graded: "완료",
};

export default function VocabExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const short = Number(useSearchParams().get("short") ?? 0);
  const [data, setData] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/teacher/vocab-exams/${id}`, { cache: "no-store" })
      .then(async r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => setError("시험을 불러오지 못했어요."));
  }, [id]);

  async function remove() {
    if (!confirm("이 시험을 삭제할까요? 학생 응시 기록의 시험 연결도 해제됩니다.")) return;
    const r = await fetch(`/api/teacher/vocab-exams/${id}`, { method: "DELETE" });
    if (r.ok) router.push("/teacher/vocab-exams");
    else setError("삭제에 실패했어요.");
  }

  if (error) return <p className="p-10 text-center text-sm text-red-600">{error}</p>;
  if (!data) return <p className="p-10 text-center text-sm text-neutral-400">불러오는 중…</p>;

  const { exam, results } = data;
  const done = results.filter(r => r.status === "graded");
  const avg = done.length ? Math.round(done.reduce((s, r) => s + (r.score ?? 0), 0) / done.length) : null;

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <Link href="/teacher/vocab-exams" className="text-xs text-neutral-500 hover:underline">
        ← 시험 목록
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">{exam.title}</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Day {exam.day_from}
            {exam.day_to > exam.day_from ? `~${exam.day_to}` : ""} · {exam.question_count}문항 ·{" "}
            {exam.question_types.map(t => QUESTION_TYPE_LABEL[t]).join(" / ")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/teacher/vocab-exams/${exam.id}/print`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            시험지 프린트
          </Link>
          <button onClick={remove} className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
            삭제
          </button>
        </div>
      </header>

      {short > 0 && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          범위 안에서 만들 수 있는 문제가 부족해 {short}문항이 줄었어요. 범위를 넓히거나 유형을 늘려 보세요.
        </p>
      )}

      <section className="rounded-2xl border bg-white p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-semibold text-neutral-900">온라인 응시 현황</h2>
          {avg !== null && <span className="text-xs text-neutral-500">평균 {avg}점 ({done.length}명 완료)</span>}
        </div>
        {results.length === 0 ? (
          <p className="text-sm text-neutral-400">배정된 학생이 없어요. (프린트 전용 시험)</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-neutral-400">
              <tr>
                <th className="py-1 font-normal">학생</th>
                <th className="py-1 font-normal">상태</th>
                <th className="py-1 text-right font-normal">점수</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.map(r => (
                <tr key={r.student_id}>
                  <td className="py-1.5">{r.name}</td>
                  <td className="py-1.5 text-neutral-500">{STATUS_LABEL[r.status] ?? r.status}</td>
                  <td className="py-1.5 text-right font-medium">
                    {r.status === "graded" ? `${r.score}점 (${r.correct_count}/${r.total_count})` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
