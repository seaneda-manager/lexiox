import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Params = Promise<{ lectureId: string }>;

export default async function LectureQuestionsPage({ params }: { params: Params }) {
  const { lectureId } = await params;
  const supabase = await getServerSupabase();

  const [{ data: lec }, { data: questions }] = await Promise.all([
    supabase
      .from("lectures")
      .select("id, title")
      .eq("id", lectureId)
      .maybeSingle(),
    supabase
      .from("lecture_questions")
      .select("id, body, created_at, student_id, profiles(full_name, display_name)")
      .eq("lecture_id", lectureId)
      .order("created_at", { ascending: false }),
  ]);

  if (!lec) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-neutral-400">
          Admin / Lectures /{" "}
          <Link href={`/admin/lectures/${lectureId}/edit`} className="hover:underline">
            편집
          </Link>{" "}
          / 질문
        </div>
        <h1 className="text-xl font-semibold">{(lec as any).title}</h1>
      </div>

      {(questions ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400">
          아직 질문이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {(questions ?? []).map((q: any) => {
            const profile = q.profiles as { full_name: string | null; display_name: string | null } | null;
            const name = profile?.full_name || profile?.display_name || q.student_id?.slice(0, 8);
            const date = new Intl.DateTimeFormat("ko-KR", {
              month: "numeric",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(q.created_at));

            return (
              <div key={q.id} className="rounded-2xl border border-neutral-100 bg-white p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-800">{name}</span>
                  <span className="text-xs text-neutral-400">{date}</span>
                </div>
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">{q.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
