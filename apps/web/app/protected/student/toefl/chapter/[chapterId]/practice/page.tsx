import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import PracticeSession from "./_components/PracticeSession";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: chapter } = await supabase
    .from("toefl_chapters")
    .select("id, skill, order_num, title, focus_type")
    .eq("id", chapterId)
    .maybeSingle();

  if (!chapter) notFound();

  // 학생 레벨
  const { data: studentLevel } = await supabase
    .from("toefl_student_level")
    .select("current_level")
    .eq("student_id", user.id)
    .eq("skill", chapter.skill)
    .maybeSingle();

  const level = studentLevel?.current_level ?? "basic";

  // 이 챕터/레벨에 맞는 published 지문 + 문제 가져오기
  const { data: passages } = await supabase
    .from("toefl_practice_passages")
    .select("id, title, body, focus_type, toefl_practice_questions(id, order_num, stem, choices, explanation)")
    .eq("skill", chapter.skill as any)
    .eq("level", level as any)
    .eq("focus_type", chapter.focus_type ?? "")
    .eq("is_published", true)
    .order("created_at");

  if (!passages || passages.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center space-y-3">
        <p className="text-4xl">📭</p>
        <p className="font-semibold">아직 Practice 지문이 없습니다</p>
        <p className="text-sm text-neutral-400">선생님이 곧 추가할 예정이에요.</p>
      </main>
    );
  }

  // 문제 정렬
  const passagesWithSortedQ = passages.map((p) => ({
    ...p,
    toefl_practice_questions: [...(p.toefl_practice_questions ?? [])].sort(
      (a, b) => a.order_num - b.order_num
    ),
  }));

  return (
    <PracticeSession
      chapterId={chapterId}
      chapterTitle={chapter.title}
      skill={chapter.skill}
      level={level}
      passages={passagesWithSortedQ as any}
    />
  );
}
