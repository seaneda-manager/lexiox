import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import {
  updateLectureAction,
  addQuizQuestionAction,
  deleteQuizQuestionAction,
} from "../../actions";

export const dynamic = "force-dynamic";

type QuizQuestion = {
  id: string;
  timestamp_seconds: number;
  question_text: string;
  blank_answer: string;
  hint: string | null;
  sort_order: number;
};

type Lecture = {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  duration_seconds: number | null;
  tags: string[] | null;
  is_active: boolean;
};

function fmtTimestamp(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default async function EditLecturePage({
  params,
}: {
  params: Promise<{ lectureId: string }>;
}) {
  const { lectureId } = await params;
  const supabase = await getServerSupabase();

  const [{ data: lec }, { data: questions }] = await Promise.all([
    supabase.from("lectures").select("*").eq("id", lectureId).maybeSingle(),
    supabase
      .from("lecture_quiz_questions")
      .select("*")
      .eq("lecture_id", lectureId)
      .order("timestamp_seconds"),
  ]);

  if (!lec) notFound();

  const lecture = lec as Lecture;
  const quizList = (questions ?? []) as QuizQuestion[];

  const updateWithId = updateLectureAction.bind(null, lectureId);
  const addQuizWithId = addQuizQuestionAction.bind(null, lectureId);

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-6 py-8">
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-neutral-400">
          Admin / Lectures / 편집
        </div>
        <h1 className="text-xl font-semibold">{lecture.title}</h1>
        <div className="flex gap-2 pt-1">
          <a href={`/admin/lectures/${lectureId}/assign`} className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50">배정</a>
          <a href={`/admin/lectures/${lectureId}/questions`} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100">질문 보기</a>
        </div>
      </div>

      {/* 강의 기본 정보 편집 */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <h2 className="text-sm font-semibold text-neutral-700">기본 정보</h2>
        <form action={updateWithId} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">제목</label>
            <input
              name="title"
              defaultValue={lecture.title}
              required
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">YouTube URL</label>
            <input
              name="youtube_url"
              defaultValue={lecture.youtube_url}
              required
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-600">설명</label>
            <textarea
              name="description"
              defaultValue={lecture.description ?? ""}
              rows={2}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600">영상 길이 (초)</label>
              <input
                name="duration_seconds"
                type="number"
                defaultValue={lecture.duration_seconds ?? ""}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-neutral-600">태그</label>
              <input
                name="tags"
                defaultValue={(lecture.tags ?? []).join(", ")}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={lecture.is_active}
              className="rounded"
            />
            공개 (학생에게 표시)
          </label>
          <button
            type="submit"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            저장
          </button>
        </form>
      </section>

      {/* 퀴즈 목록 */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">
            타임스탬프 퀴즈 ({quizList.length}개)
          </h2>
          <p className="text-xs text-neutral-400">영상이 멈추고 빈칸 채우기 팝업이 뜹니다</p>
        </div>

        {quizList.length > 0 && (
          <div className="space-y-2">
            {quizList.map((q) => {
              const deleteWithId = deleteQuizQuestionAction.bind(null, lectureId, q.id);
              return (
                <div
                  key={q.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-mono text-neutral-700">
                        {fmtTimestamp(q.timestamp_seconds)}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-800">{q.question_text}</p>
                    <p className="text-xs text-emerald-700">
                      정답: <span className="font-medium">{q.blank_answer}</span>
                    </p>
                    {q.hint && (
                      <p className="text-xs text-neutral-400">힌트: {q.hint}</p>
                    )}
                  </div>
                  <form action={deleteWithId}>
                    <button
                      type="submit"
                      className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        {/* 퀴즈 추가 폼 */}
        <form action={addQuizWithId} className="space-y-3 border-t pt-4">
          <h3 className="text-xs font-semibold text-neutral-600">퀴즈 추가</h3>
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">타임스탬프 (초) *</label>
            <input
              name="timestamp_seconds"
              type="number"
              required
              placeholder="예: 120 (2분)"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-neutral-500">
              문제 * — 빈칸은 <code className="bg-neutral-100 px-1 rounded">___</code> 로 표시
            </label>
            <input
              name="question_text"
              required
              placeholder="The ___ is the powerhouse of the cell."
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-neutral-500">정답 *</label>
              <input
                name="blank_answer"
                required
                placeholder="mitochondria"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-neutral-500">힌트 (선택)</label>
              <input
                name="hint"
                placeholder="m으로 시작해요"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-xl border border-neutral-900 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
          >
            + 퀴즈 추가
          </button>
        </form>
      </section>
    </main>
  );
}
