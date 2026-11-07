// 정답 근거 문장 검수 — AI 초안을 선생님이 확인·수정·승인한다.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { htmlToPlain } from "@/lib/reading/evidence";
import EvidenceReviewClient, { type EvidenceQuestion } from "./_client/EvidenceReviewClient";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ testId: string }> };

export default async function ReadingEvidencePage({ params }: PageProps) {
  const { testId } = await params;
  const supabase = await getServerSupabase();
  const { data } = await supabase
    .from("reading_tests_2026")
    .select("id,label,payload")
    .eq("id", testId)
    .maybeSingle();
  if (!data?.payload) notFound();

  const test = data.payload as any;
  const modules: any[] = [test?.modules ?? [], [test?.stage2Pool?.easy], [test?.stage2Pool?.hard]]
    .flat()
    .filter(Boolean);

  const questions: EvidenceQuestion[] = [];
  let passageNo = 0;
  for (const mod of modules) {
    for (const item of mod?.items ?? []) {
      if (item.taskKind !== "academic_passage" && item.taskKind !== "daily_life") continue;
      passageNo++;
      const html = item.taskKind === "academic_passage" ? item.passageHtml : item.contentHtml;
      for (const q of item.questions ?? []) {
        questions.push({
          id: q.id,
          number: q.number ?? questions.length + 1,
          type: q.type ?? "detail",
          stem: q.stem ?? "",
          passageHtml: html ?? "",
          passagePlain: htmlToPlain(html ?? ""),
          passageLabel: `지문 ${passageNo} · ${item.taskKind === "daily_life" ? "Daily Life" : "Academic"}`,
          choices: (q.choices ?? []).map((c: any) => ({ text: c.text, isCorrect: c.isCorrect === true || c.is_correct === true })),
          evidence: q.explanation?.evidence ?? [],
          qa: q.meta?.qa ?? null,
        });
      }
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">정답 근거 검수</h1>
          <p className="text-xs text-gray-500">{data.label} — AI가 고른 근거 문장을 확인하고 승인하면 학생 리뷰 화면의 지문에 표시됩니다.</p>
        </div>
        <Link href={`/admin/content/updated-reading/${testId}`} className="rounded border px-3 py-1.5 text-xs hover:bg-gray-50">
          ← 시험 편집
        </Link>
      </div>
      <EvidenceReviewClient testId={testId} questions={questions} />
    </main>
  );
}
