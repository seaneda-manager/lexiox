import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SKILLS = [
  { key: "reading",   label: "Reading",   color: "bg-sky-100 text-sky-700 ring-sky-200" },
  { key: "listening", label: "Listening", color: "bg-violet-100 text-violet-700 ring-violet-200" },
  { key: "speaking",  label: "Speaking",  color: "bg-amber-100 text-amber-700 ring-amber-200" },
  { key: "writing",   label: "Writing",   color: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
] as const;

const LEVEL_LABEL: Record<string, string> = {
  basic: "기본",
  intermediate: "중급",
  advanced: "고급",
};

export default async function ToeflCurriculumPage() {
  const supabase = await getServerSupabase();

  const { data: chapters, error } = await supabase
    .from("toefl_chapters")
    .select("id, skill, order_num, title, focus_type, description")
    .order("skill")
    .order("order_num");

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error.message}
        </div>
      </main>
    );
  }

  // 스킬별로 그룹핑
  const bySkill = Object.fromEntries(
    SKILLS.map((s) => [s.key, (chapters ?? []).filter((c) => c.skill === s.key)])
  );

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-neutral-400">Admin / TOEFL</div>
          <h1 className="text-2xl font-semibold tracking-tight">커리큘럼 관리</h1>
          <p className="text-sm text-neutral-500">
            스킬별 챕터를 정의하고, 기본·중급·고급 레벨별 콘텐츠를 붙입니다.
          </p>
        </div>
        <Link
          href="/admin/toefl/curriculum/new"
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + 챕터 추가
        </Link>
      </header>

      {/* 레벨 설명 */}
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        {["basic", "intermediate", "advanced"].map((lv) => (
          <div key={lv} className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
            <p className="font-semibold">{LEVEL_LABEL[lv]}</p>
            <p className="text-xs text-neutral-400 mt-0.5">
              {lv === "basic" && "짧은 지문 · 쉬운 어휘 · 기초 문제 유형"}
              {lv === "intermediate" && "중간 길이 · 중급 어휘 · 복합 문제"}
              {lv === "advanced" && "실전 길이 · 고급 어휘 · 전 유형"}
            </p>
          </div>
        ))}
      </div>

      {/* 스킬별 챕터 테이블 */}
      {SKILLS.map((skill) => {
        const rows = bySkill[skill.key] ?? [];
        return (
          <section key={skill.key}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${skill.color}`}>
                {skill.label}
              </span>
              <span className="text-sm text-neutral-400">{rows.length}개 챕터</span>
              <Link
                href={`/admin/toefl/curriculum/new?skill=${skill.key}`}
                className="ml-auto text-xs text-neutral-500 hover:text-neutral-800 underline underline-offset-2"
              >
                + {skill.label} 챕터
              </Link>
            </div>

            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-sm text-neutral-400">
                챕터가 없습니다.{" "}
                <Link href={`/admin/toefl/curriculum/new?skill=${skill.key}`} className="underline">
                  추가하기
                </Link>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-xs text-neutral-500">
                    <tr>
                      <th className="px-4 py-2 text-left w-10">#</th>
                      <th className="px-4 py-2 text-left">챕터명</th>
                      <th className="px-4 py-2 text-left">Focus</th>
                      <th className="px-4 py-2 text-center">기본</th>
                      <th className="px-4 py-2 text-center">중급</th>
                      <th className="px-4 py-2 text-center">고급</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {rows.map((ch) => (
                      <tr key={ch.id} className="hover:bg-neutral-50 transition">
                        <td className="px-4 py-3 text-neutral-400">{ch.order_num}</td>
                        <td className="px-4 py-3 font-medium">{ch.title}</td>
                        <td className="px-4 py-3 text-neutral-500 text-xs">{ch.focus_type ?? "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <ContentDot chapterId={ch.id} level="basic" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ContentDot chapterId={ch.id} level="intermediate" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ContentDot chapterId={ch.id} level="advanced" />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/admin/toefl/curriculum/${ch.id}`}
                            className="rounded-lg border border-neutral-200 px-3 py-1 text-xs hover:bg-neutral-100 transition"
                          >
                            관리
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}

// 콘텐츠 유무 표시 (서버 컴포넌트에서 dot만)
// 실제로는 chapter_content count를 join해서 가져와야 하지만 일단 placeholder
function ContentDot({ chapterId, level }: { chapterId: string; level: string }) {
  return (
    <span
      title={`${level} 콘텐츠`}
      className="inline-block h-2 w-2 rounded-full bg-neutral-200"
    />
  );
}
