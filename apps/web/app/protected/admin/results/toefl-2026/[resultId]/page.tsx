import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import type { RReadingTest2026 } from "@/models/reading";

export const dynamic = "force-dynamic";

function normalizeAnswers(raw: unknown): Record<string, string> {
  if (!raw) return {};
  const flatten = (v: unknown): string =>
    Array.isArray(v) ? v.map(String).sort().join(",") : String(v ?? "");
  if (Array.isArray(raw)) {
    const map: Record<string, string> = {};
    for (const entry of raw as any[]) {
      const id = entry?.questionId ?? entry?.question_id;
      if (!id) continue;
      map[id] = flatten(entry?.chosenChoiceId ?? entry?.answer ?? entry?.value);
    }
    return map;
  }
  if (typeof raw === "object") {
    const map: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      map[k] = flatten(v);
    }
    return map;
  }
  return {};
}

export default async function AdminReadingDetailPage({
  params,
}: {
  params: Promise<{ resultId: string }>;
}) {
  const { resultId } = await params;
  const supabase = await getServerSupabase();

  // 1. 결과 조회
  const { data: resultData, error: resultError } = await supabase
    .from("reading_results_2026")
    .select("*")
    .eq("id", resultId)
    .single();

  if (resultError || !resultData) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-red-600">결과를 찾을 수 없습니다.</p>
        <Link href="/admin/results?tab=toefl-2026" className="text-blue-600 underline">
          ← 돌아가기
        </Link>
      </main>
    );
  }

  // 2. 학생명 조회
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, name, email")
    .eq("id", resultData.user_id)
    .single();

  const studentName = (profile as any)?.full_name || (profile as any)?.name || (profile as any)?.email || "Unknown";

  // 3. 테스트 정보 조회
  const { data: testData } = await supabase
    .from("reading_tests_2026")
    .select("payload, label")
    .eq("id", resultData.test_id)
    .single();

  const testJson = testData?.payload as RReadingTest2026;
  const testLabel = testJson?.meta?.label ?? testData?.label ?? resultData.label ?? "Reading Test";

  // 4. 답변 파싱
  const userAnswers = normalizeAnswers(resultData.answers);

  // 5. 모든 문제 수집
  const allItems = [
    ...(testJson?.modules?.[0]?.items ?? []),
    ...(testJson?.modules?.[1]?.items ?? []),
  ];

  const questions = [];
  for (const item of allItems) {
    if (item.taskKind === "complete_words") {
      const cw = item as any;
      for (const blank of cw.blanks ?? []) {
        const isCorrect = userAnswers[blank.id] === blank.correctToken;
        questions.push({
          id: blank.id,
          type: "complete_words",
          stem: `${cw.title || ""}`.substring(0, 50),
          userAnswer: userAnswers[blank.id] ?? "-",
          correctAnswer: blank.correctToken,
          isCorrect,
        });
      }
    } else {
      const qs = (item as any).questions ?? [];
      for (const q of qs) {
        const correctChoice = q.choices.find(
          (c: any) => c.isCorrect === true || c.is_correct === true
        );
        const isCorrect = userAnswers[q.id] === correctChoice?.id;
        questions.push({
          id: q.id,
          type: item.taskKind,
          stem: q.stem?.substring(0, 50) ?? "-",
          userAnswer: userAnswers[q.id] ?? "-",
          correctAnswer: correctChoice?.text ?? "Unknown",
          isCorrect,
        });
      }
    }
  }

  // 6. 점수 계산
  const correct = questions.filter((q) => q.isCorrect).length;
  const total = questions.length;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">TOEFL 2026 Reading</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{studentName}</h1>
            <p className="mt-1 text-sm text-slate-600">{testLabel}</p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-slate-900">{score}%</div>
            <div className="mt-1 text-sm text-slate-600">
              {correct}/{total} 문제
            </div>
          </div>
        </div>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th className="w-12">번호</th>
                <th>문제</th>
                <th className="w-32">유형</th>
                <th className="w-40">학생 답</th>
                <th className="w-40">정답</th>
                <th className="w-16">결과</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, idx) => (
                <tr
                  key={q.id}
                  className="border-t border-slate-100 hover:bg-slate-50 [&>td]:px-4 [&>td]:py-3"
                >
                  <td className="font-semibold text-slate-900">{idx + 1}</td>
                  <td className="text-slate-700 truncate max-w-xs">{q.stem}</td>
                  <td className="text-slate-600 text-xs">
                    {q.type === "complete_words" ? "단어 채우기" : "객관식"}
                  </td>
                  <td className="font-mono text-sm text-slate-600">{q.userAnswer}</td>
                  <td className="font-mono text-sm font-semibold text-slate-900">
                    {q.correctAnswer}
                  </td>
                  <td className="text-center">
                    {q.isCorrect ? (
                      <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        ✓ 정답
                      </span>
                    ) : (
                      <span className="inline-block rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                        ✗ 오답
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href="/admin/results?tab=toefl-2026"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← 돌아가기
        </Link>
      </div>
    </main>
  );
}
