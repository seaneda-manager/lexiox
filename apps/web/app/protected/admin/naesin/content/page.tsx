import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { toggleNaesinContentActiveAction } from "./actions";

type SearchParams = Promise<{
  q?: string;
  section?: string;
  school_level?: string;
  source_type?: string;
  question_origin_type?: string;
  active?: string;
}>;

type NaesinContentRow = {
  id: string;
  title: string;
  section: string;
  school_level: string;
  source_type: string;
  content_kind: string;
  question_origin_type: string | null;
  source_book: string | null;
  publisher: string | null;
  grade: string | null;
  semester: string | null;
  unit: string | null;
  chapter: string | null;
  difficulty: string | null;
  tags: string[] | null;
  is_active: boolean | null;
  updated_at: string | null;
};

export const dynamic = "force-dynamic";

export default async function AdminNaesinContentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await getServerSupabase();

  let query = supabase
    .from("naesin_contents")
    .select(
      "id, title, section, school_level, source_type, content_kind, question_origin_type, source_book, publisher, grade, semester, unit, chapter, difficulty, tags, is_active, updated_at",
    )
    .eq("track", "naesin")
    .order("updated_at", { ascending: false });

  if (sp.section) query = query.eq("section", sp.section);
  if (sp.school_level) query = query.eq("school_level", sp.school_level);
  if (sp.source_type) query = query.eq("source_type", sp.source_type);
  if (sp.question_origin_type) {
    query = query.eq("question_origin_type", sp.question_origin_type);
  }
  if (sp.active === "true") query = query.eq("is_active", true);
  if (sp.active === "false") query = query.eq("is_active", false);
  if (sp.q) query = query.ilike("title", `%${sp.q}%`);

  const { data, error } = await query;

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          내신 콘텐츠를 불러오지 못했습니다.
          <div className="mt-2 text-xs">{error.message}</div>
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as NaesinContentRow[];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Admin / Naesin
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Content Manager
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            내신 콘텐츠 자산 허브. 교과서, 기출, 예상문제, 외부교재를 한 군데서 관리.
          </p>
        </div>

        <Link
          href="/admin/naesin/content/new"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          새 콘텐츠 만들기
        </Link>
      </header>

      <section className="rounded-2xl border bg-white p-4">
        <form className="grid gap-3 md:grid-cols-6">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="제목 검색"
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          />

          <select
            name="section"
            defaultValue={sp.section ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 section</option>
            <option value="reading">reading</option>
            <option value="grammar">grammar</option>
            <option value="listening">listening</option>
            <option value="writing">writing</option>
            <option value="vocab">vocab</option>
          </select>

          <select
            name="school_level"
            defaultValue={sp.school_level ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 school level</option>
            <option value="middle">middle</option>
            <option value="high">high</option>
          </select>

          <select
            name="source_type"
            defaultValue={sp.source_type ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 source type</option>
            <option value="textbook">textbook</option>
            <option value="mock_csat">mock_csat</option>
            <option value="csat">csat</option>
            <option value="external_book">external_book</option>
            <option value="school_handout">school_handout</option>
            <option value="teacher_made">teacher_made</option>
          </select>

          <select
            name="question_origin_type"
            defaultValue={sp.question_origin_type ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 문제 성격</option>
            <option value="past_exam">past_exam</option>
            <option value="mock_expected">mock_expected</option>
            <option value="teacher_made">teacher_made</option>
            <option value="adapted">adapted</option>
          </select>

          <div className="flex gap-2">
            <select
              name="active"
              defaultValue={sp.active ?? ""}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            >
              <option value="">전체 활성 상태</option>
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>

            <button
              type="submit"
              className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
            >
              적용
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="border-b px-4 py-3 text-sm font-semibold text-neutral-900">
          Naesin Contents
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>제목</th>
                <th>section</th>
                <th>학교급</th>
                <th>source</th>
                <th>content kind</th>
                <th>문제 성격</th>
                <th>교재/범위</th>
                <th>활성</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const scopeHint =
                  [row.source_book, row.grade, row.semester, row.unit, row.chapter]
                    .filter(Boolean)
                    .join(" / ") || "-";

                return (
                  <tr key={row.id} className="border-t [&>td]:px-4 [&>td]:py-3">
                    <td>
                      <div className="font-medium text-neutral-900">{row.title}</div>
                      <div className="mt-1 text-xs text-neutral-500">
                        {row.difficulty ?? "-"}
                        {row.tags?.length ? ` · ${row.tags.join(", ")}` : ""}
                      </div>
                    </td>
                    <td>{row.section}</td>
                    <td>{row.school_level}</td>
                    <td>{row.source_type}</td>
                    <td>{row.content_kind}</td>
                    <td>{row.question_origin_type ?? "-"}</td>
                    <td>{scopeHint}</td>
                    <td>
                      <form action={toggleNaesinContentActiveAction}>
                        <input type="hidden" name="id" value={row.id} />
                        <input
                          type="hidden"
                          name="is_active"
                          value={String(!(row.is_active ?? true))}
                        />
                        <button
                          type="submit"
                          className={[
                            "rounded-full border px-3 py-1 text-xs",
                            row.is_active
                              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                              : "border-neutral-300 bg-neutral-50 text-neutral-600",
                          ].join(" ")}
                        >
                          {row.is_active ? "활성" : "비활성"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    등록된 콘텐츠가 없습니다.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
