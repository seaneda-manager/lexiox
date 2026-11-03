"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { VocabTestQuestion } from "@/models/vocab/test.types";
import { QUESTION_TYPE_LABEL } from "@/lib/vocab/test/teacherExam";

type Exam = {
  id: string;
  title: string;
  day_from: number;
  day_to: number;
  questions: VocabTestQuestion[];
};

const CIRCLED = ["①", "②", "③", "④", "⑤"];

function answerText(q: VocabTestQuestion): string {
  if (q.options) {
    const idx = q.options.findIndex(o => o.is_correct);
    return idx >= 0 ? `${CIRCLED[idx]} ${q.options[idx].text ?? ""}` : "";
  }
  if (q.question_type === "word_to_meaning") return (q.meaning_ko ?? [q.correct_answer]).join(", ");
  return q.correct_answer;
}

export default function VocabExamPrintPage() {
  const { id } = useParams<{ id: string }>();
  const [exam, setExam] = useState<Exam | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [withKey, setWithKey] = useState(true);

  useEffect(() => {
    fetch(`/api/teacher/vocab-exams/${id}`, { cache: "no-store" })
      .then(async r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(d => setExam(d.exam))
      .catch(() => setError("시험을 불러오지 못했어요."));
  }, [id]);

  // 듣기 문제는 종이로 풀 수 없어 제외하고 번호를 다시 매긴다
  const printable = useMemo(
    () =>
      (exam?.questions ?? [])
        .filter(q => q.question_type !== "listening")
        .map((q, i) => ({ ...q, question_number: i + 1 })),
    [exam]
  );
  const skippedListening = (exam?.questions.length ?? 0) - printable.length;

  if (error) return <p className="p-10 text-center text-sm text-red-600">{error}</p>;
  if (!exam) return <p className="p-10 text-center text-sm text-neutral-400">불러오는 중…</p>;

  const range = `Day ${exam.day_from}${exam.day_to > exam.day_from ? `~${exam.day_to}` : ""}`;
  let lastType: string | null = null;

  return (
    <>
      {/* 사이드바 등 레이아웃은 숨기고 시험지만 인쇄 */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #exam-print, #exam-print * { visibility: visible !important; }
          #exam-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-4 pt-6 print:hidden">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 text-sm">
          <Link href={`/teacher/vocab-exams/${exam.id}`} className="text-neutral-500 hover:underline">
            ← 시험 상세
          </Link>
          <label className="ml-auto flex items-center gap-1.5">
            <input type="checkbox" checked={withKey} onChange={e => setWithKey(e.target.checked)} />
            정답지 포함 (마지막 장)
          </label>
          <button onClick={() => window.print()} className="rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-700">
            인쇄
          </button>
        </div>
        {skippedListening > 0 && (
          <p className="mt-2 text-xs text-amber-600">듣기 문제 {skippedListening}개는 시험지에서 제외됐어요.</p>
        )}
      </div>

      <div id="exam-print" className="mx-auto max-w-3xl bg-white px-6 py-6 text-black">
        <header className="mb-4 border-b-2 border-black pb-3">
          <div className="flex items-baseline justify-between">
            <h1 className="text-xl font-bold">{exam.title}</h1>
            <span className="text-sm">
              {range} · {printable.length}문항
            </span>
          </div>
          <div className="mt-3 flex gap-6 text-sm">
            <span>이름: <span className="inline-block w-36 border-b border-black" /></span>
            <span>날짜: <span className="inline-block w-28 border-b border-black" /></span>
            <span className="ml-auto">점수: <span className="inline-block w-12 border-b border-black" /> / {printable.length}</span>
          </div>
        </header>

        <div className="columns-2 gap-8 text-[13px] leading-6">
          {printable.map(q => {
            const heading = q.question_type !== lastType ? QUESTION_TYPE_LABEL[q.question_type] : null;
            lastType = q.question_type;
            return (
              <div key={q.id}>
                {heading && (
                  <p className="mb-1 mt-3 break-after-avoid rounded bg-neutral-100 px-2 text-xs font-semibold first:mt-0 print:bg-neutral-200">
                    {heading === "단어 → 뜻" ? "다음 단어의 뜻을 고르거나 쓰시오." : heading === "뜻 → 단어" ? "다음 뜻에 해당하는 영어 단어를 쓰시오." : "다음 단어와 뜻이 비슷한 단어를 고르시오."}
                  </p>
                )}
                <div className="mb-3 break-inside-avoid">
                  {q.question_type === "meaning_to_word" ? (
                    <p>
                      <b>{q.question_number}.</b> {(q.meaning_ko ?? []).join(", ")}
                      <span className="ml-2 inline-block w-32 border-b border-black align-bottom" />
                    </p>
                  ) : (
                    <p>
                      <b>{q.question_number}.</b> <span className="font-semibold">{q.word_text}</span>
                      {!q.options && <span className="ml-2 inline-block w-32 border-b border-black align-bottom" />}
                    </p>
                  )}
                  {q.options && (
                    <ul className="ml-4 grid grid-cols-1 gap-x-3">
                      {q.options.map((o, i) => (
                        <li key={o.id}>
                          {CIRCLED[i]} {o.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {withKey && (
          <section className="mt-8 break-before-page">
            <h2 className="mb-3 border-b-2 border-black pb-2 text-lg font-bold">
              정답지 — {exam.title} ({range})
            </h2>
            <ol className="columns-2 gap-8 text-[13px] leading-6">
              {printable.map(q => (
                <li key={q.id} className="break-inside-avoid">
                  <b>{q.question_number}.</b> {answerText(q)}
                  {q.question_type === "meaning_to_word" ? "" : <span className="text-neutral-500"> ({q.word_text})</span>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </>
  );
}
