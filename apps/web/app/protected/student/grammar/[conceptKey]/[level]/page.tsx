import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { canPreviewDrafts } from "@/lib/grammar-engine/previewAccess";
import type { GrammarLesson } from "@/models/middle-naesin/grammar-lesson";
import { normalizeLesson } from "@/lib/grammar-engine/sections";
import LessonStudentPreview from "@/components/grammar-engine/LessonStudentPreview";
import DoneButton from "../../_client/DoneButton";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ conceptKey: string; level: string }> };

export default async function StudentGrammarLessonPage({ params }: Props) {
  const { conceptKey, level: levelStr } = await params;
  const level = Number(levelStr);
  if (!Number.isInteger(level) || level < 1 || level > 5) notFound();

  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login"); // 로그인이 풀렸을 때 404 대신 로그인 화면으로

  const { data: concept } = await supabase.from("grammar_concepts").select("id, key, title_ko, title_en").eq("key", conceptKey).maybeSingle();
  if (!concept) notFound();
  // RLS: 학생은 status = 'final' 인 레슨만 읽을 수 있다. 초안이면 행이 안 보여 404.
  // 테스트 계정은 초안도 본다(확정 전 점검용). 그 외 학생은 RLS 때문에 확정본만 보인다.
  const preview = canPreviewDrafts(user.email);
  const lq = (preview ? getServiceSupabase() : supabase).from("grammar_lessons").select("lesson, status").eq("concept_id", concept.id).eq("level", level);
  const { data: row } = await (preview ? lq : lq.eq("status", "final")).maybeSingle();
  if (!row) notFound();

  const lesson = normalizeLesson(row.lesson) as unknown as GrammarLesson;
  const { data: doneRow } = await supabase
    .from("student_grammar_concept_done")
    .select("concept_id")
    .eq("student_id", user.id)
    .eq("concept_id", concept.id)
    .eq("level", level)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <Link href="/student/grammar" className="text-sm text-neutral-500 hover:text-neutral-800">← 문법 레슨</Link>
        <h1 className="text-xl font-semibold text-neutral-900">
          {concept.title_ko} <span className="text-sm font-normal text-neutral-500">L{level}</span>
        </h1>
        <p className="text-xs text-neutral-400">풀이 기록은 아직 저장되지 않아요. 끝나면 아래 "레슨 완료"를 눌러 주세요.</p>
      </header>
      <LessonStudentPreview lesson={lesson} />
      <DoneButton conceptId={concept.id} level={level} initialDone={!!doneRow} />
    </main>
  );
}
