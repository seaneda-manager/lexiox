import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LectureRow = {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  duration_seconds: number | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
};

function youtubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function fmtDuration(s: number | null) {
  if (!s) return "-";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default async function AdminLecturesPage() {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("lectures")
    .select("id, title, description, youtube_url, duration_seconds, tags, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          강의 목록을 불러오지 못했습니다. <span className="text-xs">{error.message}</span>
        </div>
      </main>
    );
  }

  const lectures = (data ?? []) as LectureRow[];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-neutral-400">Admin / Lectures</div>
          <h1 className="text-2xl font-semibold tracking-tight">강의 관리</h1>
          <p className="text-sm text-neutral-500">YouTube 강의를 등록하고 퀴즈를 추가합니다.</p>
        </div>
        <Link
          href="/admin/lectures/new"
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + 강의 추가
        </Link>
      </header>

      {lectures.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-16 text-center text-sm text-neutral-400">
          등록된 강의가 없습니다.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lectures.map((lec) => {
            const vid = youtubeId(lec.youtube_url);
            return (
              <div
                key={lec.id}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              >
                {vid ? (
                  <img
                    src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`}
                    alt={lec.title}
                    className="h-40 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-40 items-center justify-center bg-neutral-100 text-xs text-neutral-400">
                    썸네일 없음
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold text-neutral-900 line-clamp-2">{lec.title}</h2>
                    {!lec.is_active && (
                      <span className="shrink-0 rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-500">
                        비공개
                      </span>
                    )}
                  </div>
                  {lec.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2">{lec.description}</p>
                  )}
                  <div className="text-xs text-neutral-400">{fmtDuration(lec.duration_seconds)}</div>
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/admin/lectures/${lec.id}/edit`}
                      className="flex-1 rounded-lg border py-1.5 text-center text-xs text-neutral-700 hover:bg-neutral-50"
                    >
                      편집 / 퀴즈
                    </Link>
                    <Link
                      href={`/admin/lectures/${lec.id}/assign`}
                      className="flex-1 rounded-lg bg-neutral-900 py-1.5 text-center text-xs text-white hover:bg-neutral-800"
                    >
                      배정
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
