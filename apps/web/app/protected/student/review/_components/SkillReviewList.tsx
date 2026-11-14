// 영역별 리뷰 목록 페이지의 공용 서버 컴포넌트.
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import { loadSkill, SKILL_META, type ReviewRow, type SkillKey } from "../_lib/skills";

export const colorMap = {
  blue: { text: "text-blue-700", border: "border-blue-100", bg: "bg-blue-50", hover: "hover:bg-blue-50" },
  orange: { text: "text-orange-700", border: "border-orange-100", bg: "bg-orange-50", hover: "hover:bg-orange-50" },
  violet: { text: "text-violet-700", border: "border-violet-100", bg: "bg-violet-50", hover: "hover:bg-violet-50" },
  teal: { text: "text-teal-700", border: "border-teal-100", bg: "bg-teal-50", hover: "hover:bg-teal-50" },
} as const;

export default async function SkillReviewList({ skill }: { skill: SkillKey }) {
  const meta = SKILL_META[skill];
  const c = colorMap[meta.color];
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <h1 className="text-xl font-bold tracking-tight">{meta.title} 리뷰</h1>
        <p className="text-sm text-gray-600">이 페이지를 보려면 로그인이 필요합니다.</p>
      </main>
    );
  }

  const { rows, total } = await loadSkill(supabase, user.id, skill, 100);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link href="/student/review" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-3.5 w-3.5" /> 리뷰 홈
        </Link>
        <h1 className={`text-xl font-bold tracking-tight ${c.text}`}>{meta.title} 리뷰</h1>
        <p className="text-xs text-gray-500">
          {meta.desc} · 총 {total}건
        </p>
      </header>

      {rows.length > 0 && rows.every((r) => r.group) ? (
        <GroupedRows rows={rows} colorKey={meta.color} />
      ) : rows.length === 0 ? (
        <div className={`rounded-xl border border-dashed ${c.border} ${c.bg} p-4 text-xs text-gray-500`}>
          아직 기록이 없습니다.{" "}
          <Link href={meta.emptyHref} className="font-semibold text-emerald-700 underline">
            {meta.emptyLabel} →
          </Link>
        </div>
      ) : (
        <div className={`overflow-hidden rounded-xl border ${c.border} bg-white shadow-sm`}>
          {rows.map((r) => (
            <article key={r.id} className={`flex items-center justify-between gap-3 border-b px-4 py-3 text-xs last:border-0 ${c.hover}`}>
              <div className="min-w-0 space-y-0.5">
                <div className={`truncate font-semibold ${c.text}`}>{r.label}</div>
                <div className="text-[11px] text-gray-500">{r.meta}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                {r.extra && (
                  <Link
                    href={r.extra.href}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-teal-700"
                  >
                    {r.extra.label}
                  </Link>
                )}
                <Link
                  href={r.href}
                  className={`inline-flex items-center gap-1 rounded-lg border ${c.border} bg-white px-2.5 py-1.5 text-[11px] font-medium ${c.text} ${c.hover}`}
                >
                  리뷰 <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

const BAR = { blue: "border-blue-300", orange: "border-orange-300", violet: "border-violet-300", teal: "border-teal-300" } as const;

/** 날짜 + 시험 이름별 큰 헤딩 아래에 그 응시의 답변들을 모아서 보여 준다. */
function GroupedRows({ rows, colorKey }: { rows: ReviewRow[]; colorKey: keyof typeof colorMap }) {
  const c = colorMap[colorKey];
  const groups: { key: string; title: string; date: string; rows: ReviewRow[] }[] = [];
  for (const r of rows) {
    const g = groups.find((x) => x.key === r.group!.key);
    if (g) g.rows.push(r);
    else groups.push({ key: r.group!.key, title: r.group!.title, date: r.group!.date, rows: [r] });
  }
  // 그룹 안에서는 푼 순서(오래된 것 먼저)로
  groups.forEach((g) => g.rows.sort((a, b) => String(a.at).localeCompare(String(b.at))));

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <div className={`border-l-4 pl-3 ${BAR[colorKey]}`}>
            <h2 className={`text-base font-bold leading-snug ${c.text}`}>{g.title}</h2>
            <p className="text-xs text-gray-500">
              {g.date} · 답변 {g.rows.length}개
            </p>
          </div>
          <div className={`overflow-hidden rounded-xl border ${c.border} bg-white shadow-sm`}>
            {g.rows.map((r, i) => (
              <article key={r.id} className={`flex items-center justify-between gap-3 border-b px-4 py-3 text-xs last:border-0 ${c.hover}`}>
                <div className="min-w-0 space-y-0.5">
                  <div className={`truncate font-semibold ${c.text}`}>
                    <span className="mr-1.5 text-gray-400">{i + 1}.</span>
                    {r.label}
                  </div>
                  <div className="text-[11px] text-gray-500">{r.meta}</div>
                </div>
                <Link
                  href={r.href}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-lg border ${c.border} bg-white px-2.5 py-1.5 text-[11px] font-medium ${c.text} ${c.hover}`}
                >
                  리뷰 <ArrowRight className="h-3 w-3" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
