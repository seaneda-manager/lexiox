import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LEVELS = [
  { key: "basic",        label: "기본",   desc: "짧은 지문 · 쉬운 어휘", color: "border-sky-200 bg-sky-50" },
  { key: "intermediate", label: "중급",   desc: "중간 길이 · 중급 어휘",   color: "border-violet-200 bg-violet-50" },
  { key: "advanced",     label: "고급",   desc: "실전 길이 · 고급 어휘",   color: "border-amber-200 bg-amber-50" },
] as const;

const CONTENT_TYPE_LABEL: Record<string, { label: string; emoji: string }> = {
  lecture:  { label: "강좌",      emoji: "🎬" },
  practice: { label: "Practice", emoji: "✏️" },
  test:     { label: "Test",     emoji: "📋" },
  drill:    { label: "Drill",    emoji: "🎯" },
};

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ chapterId: string }>;
}) {
  const { chapterId } = await params;
  const supabase = await getServerSupabase();

  const [{ data: chapter }, { data: contents }] = await Promise.all([
    supabase
      .from("toefl_chapters")
      .select("id, skill, order_num, title, focus_type, description")
      .eq("id", chapterId)
      .maybeSingle(),
    supabase
      .from("toefl_chapter_content")
      .select("id, level, content_type, order_num, title, content_ref_id, content_ref_table, notes")
      .eq("chapter_id", chapterId)
      .order("level")
      .order("order_num"),
  ]);

  if (!chapter) notFound();

  const byLevel = Object.fromEntries(
    LEVELS.map((lv) => [lv.key, (contents ?? []).filter((c) => c.level === lv.key)])
  );

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-widest text-neutral-400">
          <Link href="/admin/toefl/curriculum" className="hover:underline">Admin / TOEFL / 커리큘럼</Link>
          {" / "}챕터 {chapter.order_num}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{chapter.title}</h1>
            <p className="text-sm text-neutral-500 mt-0.5">
              {chapter.skill} · {chapter.focus_type ?? "focus 미지정"}
            </p>
            {chapter.description && (
              <p className="text-sm text-neutral-600 mt-2">{chapter.description}</p>
            )}
          </div>
          <Link
            href={`/admin/toefl/curriculum/${chapterId}/edit`}
            className="shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs hover:bg-neutral-50 transition"
          >
            챕터 수정
          </Link>
        </div>
      </header>

      {/* 레벨별 콘텐츠 */}
      {LEVELS.map((lv) => {
        const rows = byLevel[lv.key] ?? [];
        const hasAll = ["lecture", "practice", "test", "drill"].every(
          (t) => rows.some((r) => r.content_type === t)
        );

        return (
          <section key={lv.key} className={`rounded-2xl border p-5 space-y-4 ${lv.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold">{lv.label}</span>
                <span className="text-xs text-neutral-500 ml-2">{lv.desc}</span>
              </div>
              <div className="flex items-center gap-2">
                {hasAll && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    완성
                  </span>
                )}
                <Link
                  href={`/admin/toefl/curriculum/${chapterId}/content/new?level=${lv.key}`}
                  className="rounded-lg bg-white border border-neutral-200 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50 transition"
                >
                  + 콘텐츠 추가
                </Link>
              </div>
            </div>

            {/* 4단계 현황 */}
            <div className="grid grid-cols-4 gap-2">
              {(["lecture", "practice", "test", "drill"] as const).map((type) => {
                const items = rows.filter((r) => r.content_type === type);
                const { label, emoji } = CONTENT_TYPE_LABEL[type];
                return (
                  <div
                    key={type}
                    className={[
                      "rounded-xl border bg-white p-3 text-center",
                      items.length > 0 ? "border-neutral-200" : "border-dashed border-neutral-300",
                    ].join(" ")}
                  >
                    <p className="text-lg">{emoji}</p>
                    <p className="text-xs font-medium mt-1">{label}</p>
                    <p className={`text-xs mt-0.5 ${items.length > 0 ? "text-emerald-600" : "text-neutral-400"}`}>
                      {items.length > 0 ? `${items.length}개` : "없음"}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 콘텐츠 목록 */}
            {rows.length > 0 && (
              <div className="space-y-1">
                {rows.map((item) => {
                  const { label, emoji } = CONTENT_TYPE_LABEL[item.content_type] ?? { label: item.content_type, emoji: "📄" };
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-xl bg-white border border-neutral-100 px-4 py-2.5"
                    >
                      <span className="text-sm">{emoji}</span>
                      <span className="text-xs font-medium text-neutral-500 w-16">{label}</span>
                      <span className="text-sm flex-1 truncate">{item.title ?? "제목 없음"}</span>
                      {item.notes && (
                        <span className="text-xs text-neutral-400 truncate max-w-32">{item.notes}</span>
                      )}
                      <Link
                        href={`/admin/toefl/curriculum/${chapterId}/content/${item.id}`}
                        className="text-xs text-neutral-400 hover:text-neutral-700 underline underline-offset-2"
                      >
                        수정
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
