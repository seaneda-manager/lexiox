// /student/review — 리뷰 허브. 영역별(Reading/Speaking/Listening/Writing) 페이지로 나뉜다.
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { BookOpen, Mic, Headphones, PenLine, ArrowRight, History } from "lucide-react";
import { loadSkill, SKILL_META, type SkillKey } from "./_lib/skills";
import { colorMap } from "./_components/SkillReviewList";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ICONS: Record<SkillKey, React.ReactNode> = {
  reading: <BookOpen className="h-5 w-5" />,
  speaking: <Mic className="h-5 w-5" />,
  listening: <Headphones className="h-5 w-5" />,
  writing: <PenLine className="h-5 w-5" />,
};
const ORDER: SkillKey[] = ["reading", "listening", "speaking", "writing"];

export default async function StudentReviewHubPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <h1 className="text-xl font-bold tracking-tight">Review</h1>
        <p className="text-sm text-gray-600">이 페이지를 보려면 로그인이 필요합니다.</p>
      </main>
    );
  }

  const lists = await Promise.all(ORDER.map((k) => loadSkill(supabase, user.id, k, 1)));

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
          <History className="h-3.5 w-3.5" />
          Updated TOEFL · Review
        </div>
        <h1 className="text-xl font-bold tracking-tight text-gray-900">테스트 리뷰</h1>
        <p className="text-xs text-gray-500">영역을 골라 내가 풀었던 테스트를 다시 확인하세요.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {ORDER.map((k, i) => {
          const meta = SKILL_META[k];
          const c = colorMap[meta.color];
          const { total, rows } = lists[i];
          const latest = rows[0];
          return (
            <Link
              key={k}
              href={`/student/review/${k}`}
              className={`group flex flex-col gap-3 rounded-2xl border ${c.border} bg-white p-5 shadow-sm transition hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 font-bold ${c.text}`}>
                  <span className={`rounded-lg ${c.bg} p-2`}>{ICONS[k]}</span>
                  {meta.title}
                </div>
                <ArrowRight className={`h-4 w-4 ${c.text} transition group-hover:translate-x-0.5`} />
              </div>
              <p className="text-xs text-gray-500">{meta.desc}</p>
              <div className="border-t pt-3 text-[11px] text-gray-500">
                {total === 0 ? (
                  "아직 기록이 없습니다"
                ) : (
                  <>
                    <span className={`font-semibold ${c.text}`}>{total}건</span>
                    {latest && <span> · 최근: {latest.label}</span>}
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
