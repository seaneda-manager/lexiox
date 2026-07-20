import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import LecturePlayerWrapper from "./_components/LecturePlayerWrapper";
import { submitLectureQuestionAction } from "./actions";

export const dynamic = "force-dynamic";

function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

export default async function StudentLecturePage({
  params,
}: {
  params: Promise<{ lectureId: string }>;
}) {
  const { lectureId } = await params;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [{ data: lec }, { data: questions }, { data: completion }, { data: myQuestions }] = await Promise.all([
    supabase
      .from("lectures")
      .select("id, title, description, youtube_url, duration_seconds")
      .eq("id", lectureId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("lecture_quiz_questions")
      .select("id, timestamp_seconds, question_text, blank_answer, hint")
      .eq("lecture_id", lectureId)
      .order("timestamp_seconds"),
    supabase
      .from("lecture_completions")
      .select("quiz_score, quiz_total")
      .eq("lecture_id", lectureId)
      .eq("student_id", user.id)
      .maybeSingle(),
    supabase
      .from("lecture_questions")
      .select("id, body, created_at")
      .eq("lecture_id", lectureId)
      .eq("student_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (!lec) notFound();

  const lecture = lec as {
    id: string;
    title: string;
    description: string | null;
    youtube_url: string;
    duration_seconds: number | null;
  };

  const vid = youtubeId(lecture.youtube_url);
  if (!vid) notFound();

  type QuizQuestion = {
    id: string;
    timestamp_seconds: number;
    question_text: string;
    blank_answer: string;
    hint: string | null;
  };

  const quizList = (questions ?? []) as QuizQuestion[];
  const alreadyCompleted = !!completion;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-neutral-900">{lecture.title}</h1>
        {lecture.description && (
          <p className="text-sm text-neutral-500">{lecture.description}</p>
        )}
        {alreadyCompleted && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-700">
            완료됨 · 퀴즈 {(completion as { quiz_score: number; quiz_total: number }).quiz_score}/{(completion as { quiz_score: number; quiz_total: number }).quiz_total}
          </span>
        )}
      </div>

      <LecturePlayerWrapper
        lectureId={lectureId}
        youtubeId={vid}
        questions={quizList}
        studentId={user.id}
      />

      {quizList.length > 0 && (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
          <p className="text-xs text-neutral-500">
            이 강의에는 퀴즈 {quizList.length}개가 포함되어 있습니다. 영상이 특정 구간에서 멈추면 빈칸을 채워야 다음으로 넘어갑니다.
          </p>
        </div>
      )}

      {/* 질문 섹션 */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700">질문하기</h2>
        <form action={submitLectureQuestionAction.bind(null, lectureId)} className="space-y-2">
          <textarea
            name="body"
            required
            placeholder="강의에 대해 궁금한 점을 적어주세요."
            rows={3}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neutral-300 resize-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
          >
            질문 제출
          </button>
        </form>

        {(myQuestions ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-neutral-400">내가 보낸 질문</p>
            {(myQuestions ?? []).map((q: any) => (
              <div key={q.id} className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
                <p className="whitespace-pre-wrap">{q.body}</p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  {new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(q.created_at))}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
