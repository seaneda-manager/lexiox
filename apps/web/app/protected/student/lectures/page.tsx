import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function fmtDuration(s: number | null) {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

type Lecture = {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  duration_seconds: number | null;
  due_at: string | null;
};

type Completion = { lecture_id: string; quiz_score: number; quiz_total: number };

export default async function StudentLecturesPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // 배정된 강의
  const { data: assignments } = await supabase
    .from("lecture_assignments")
    .select("lecture_id, due_at, lectures(id, title, description, youtube_url, duration_seconds, is_active)")
    .eq("student_id", user.id);

  const lectures: (Lecture & { completionData?: Completion })[] = [];
  const lectureIds: string[] = [];

  for (const a of assignments ?? []) {
    const lec = (a as Record<string, unknown>).lectures as Record<string, unknown> | null;
    if (!lec || !lec.is_active) continue;
    lectureIds.push(lec.id as string);
    lectures.push({
      id: lec.id as string,
      title: lec.title as string,
      description: (lec.description as string | null) ?? null,
      youtube_url: lec.youtube_url as string,
      duration_seconds: (lec.duration_seconds as number | null) ?? null,
      due_at: (a as Record<string, unknown>).due_at as string | null,
    });
  }

  // 완료 현황
  if (lectureIds.length > 0) {
    const { data: completions } = await supabase
      .from("lecture_completions")
      .select("lecture_id, quiz_score, quiz_total")
      .eq("student_id", user.id)
      .in("lecture_id", lectureIds);

    const completionMap = new Map(
      ((completions ?? []) as Completion[]).map((c) => [c.lecture_id, c])
    );

    for (const lec of lectures) {
      lec.completionData = completionMap.get(lec.id);
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">강의</h1>
        <p className="text-xs text-neutral-400 mt-0.5">선생님이 배정한 강의를 시청하세요.</p>
      </header>

      {lectures.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-16 text-center text-sm text-neutral-400">
          배정된 강의가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {lectures.map((lec) => {
            const vid = youtubeId(lec.youtube_url);
            const isDone = !!lec.completionData;
            const due = lec.due_at
              ? new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short" }).format(new Date(lec.due_at))
              : null;

            return (
              <div key={lec.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                <div className="flex gap-4 p-4">
                  {vid && (
                    <img
                      src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                      alt={lec.title}
                      className="h-20 w-32 shrink-0 rounded-xl object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isDone && (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700">
                          완료 · {lec.completionData!.quiz_score}/{lec.completionData!.quiz_total}
                        </span>
                      )}
                      {due && (
                        <span className="text-[11px] text-neutral-400">마감 {due}</span>
                      )}
                      {fmtDuration(lec.duration_seconds) && (
                        <span className="text-[11px] text-neutral-400">
                          {fmtDuration(lec.duration_seconds)}
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-semibold text-neutral-900 line-clamp-2">
                      {lec.title}
                    </h2>
                    {lec.description && (
                      <p className="text-xs text-neutral-400 line-clamp-1">{lec.description}</p>
                    )}
                  </div>
                </div>
                <div className="border-t px-4 py-3">
                  <Link
                    href={`/student/lectures/${lec.id}`}
                    className={[
                      "block w-full rounded-xl py-2 text-center text-xs font-semibold transition",
                      isDone
                        ? "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                        : "bg-neutral-900 text-white hover:bg-neutral-800",
                    ].join(" ")}
                  >
                    {isDone ? "다시 보기" : "강의 시청"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
