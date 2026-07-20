import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LEVEL_LABEL: Record<string, string> = { basic: "기본", intermediate: "중급", advanced: "고급" };
const SKILL_COLOR: Record<string, string> = {
  reading:   "bg-sky-100 text-sky-700 ring-sky-200",
  listening: "bg-violet-100 text-violet-700 ring-violet-200",
  speaking:  "bg-amber-100 text-amber-700 ring-amber-200",
  writing:   "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

export default async function PracticeListPage() {
  const supabase = await getServerSupabase();

  const { data: passages } = await supabase
    .from("toefl_practice_passages")
    .select("id, skill, level, focus_type, title, word_count, is_published, created_at")
    .order("created_at", { ascending: false });

  const rows = passages ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex items-end justify-between">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-widest text-neutral-400">
            Admin / TOEFL / Practice 지문
          </div>
          <h1 className="text-2xl font-semibold">Practice 지문 관리</h1>
          <p className="text-sm text-neutral-500">
            챕터별 연습 지문을 작성하고 문제를 붙입니다.
          </p>
        </div>
        <Link
          href="/admin/toefl/content/practice/new"
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + 새 지문
        </Link>
      </header>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-3 text-center text-sm">
        {["reading", "listening", "speaking", "writing"].map((skill) => {
          const count = rows.filter((r) => r.skill === skill).length;
          return (
            <div key={skill} className="rounded-xl border border-neutral-200 bg-white px-4 py-3">
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs text-neutral-500 mt-0.5 capitalize">{skill}</p>
            </div>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400">
          아직 지문이 없습니다.{" "}
          <Link href="/admin/toefl/content/practice/new" className="underline">
            첫 지문 만들기
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2 text-left">스킬</th>
                <th className="px-4 py-2 text-left">레벨</th>
                <th className="px-4 py-2 text-left">Focus</th>
                <th className="px-4 py-2 text-left">제목</th>
                <th className="px-4 py-2 text-right">단어수</th>
                <th className="px-4 py-2 text-center">상태</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-neutral-50 transition">
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${SKILL_COLOR[p.skill] ?? ""}`}>
                      {p.skill}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-600">{LEVEL_LABEL[p.level] ?? p.level}</td>
                  <td className="px-4 py-3 text-neutral-400 text-xs">{p.focus_type ?? "—"}</td>
                  <td className="px-4 py-3 font-medium truncate max-w-48">{p.title ?? "제목 없음"}</td>
                  <td className="px-4 py-3 text-right text-neutral-500">{p.word_count ?? "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {p.is_published ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">공개</span>
                    ) : (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">임시저장</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/toefl/content/practice/${p.id}`}
                      className="rounded-lg border border-neutral-200 px-3 py-1 text-xs hover:bg-neutral-100 transition"
                    >
                      편집
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
