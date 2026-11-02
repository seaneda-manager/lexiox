import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceRoleClient } from "@/lib/supabase/server";
import type { GrammarLesson } from "@/models/middle-naesin/grammar-lesson";
import { normalizeLesson } from "@/lib/grammar-engine/sections";
import LessonStudentPreview from "@/components/grammar-engine/LessonStudentPreview";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ conceptKey: string; level: string }> };

export default async function GrammarStudentPreviewPage({ params }: Props) {
  const { conceptKey, level: levelStr } = await params;
  const level = Number(levelStr);
  if (!Number.isInteger(level) || level < 1 || level > 5) notFound();

  const db = getServiceRoleClient();
  const { data: concept } = await db.from("grammar_concepts").select("id, key, title_ko, title_en").eq("key", conceptKey).maybeSingle();
  if (!concept) notFound();
  const { data: row } = await db.from("grammar_lessons").select("lesson, status").eq("concept_id", concept.id).eq("level", level).maybeSingle();
  if (!row) notFound();

  const lesson = normalizeLesson(row.lesson) as unknown as GrammarLesson;

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <Link href={`/admin/grammar-engine/${concept.key}/${level}`} className="text-sm text-neutral-500 hover:text-neutral-800">← 칸 화면으로</Link>
        <h1 className="text-xl font-semibold text-neutral-900">
          {concept.title_ko} · L{level} <span className="text-sm font-normal text-neutral-500">학생 화면 미리보기</span>
        </h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {row.status === "final" ? "확정된 레슨입니다." : "초안입니다. 학생에게는 보이지 않습니다."} 미리보기는 점수와 기록을 저장하지 않습니다.
        </div>
      </header>
      <LessonStudentPreview lesson={lesson} />
    </main>
  );
}
