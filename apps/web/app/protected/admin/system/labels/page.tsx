import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { toggleUILabelActiveAction } from "./actions";

type SearchParams = Promise<{
  domain?: string;
  track?: string;
  section?: string;
  q?: string;
  active?: string;
}>;

type UILabelRow = {
  id: string;
  domain: string;
  key: string;
  track: string | null;
  section: string | null;
  school_level: string | null;
  audience: string | null;
  label_ko: string;
  label_en: string | null;
  sort_order: number | null;
  is_active: boolean | null;
  updated_at: string | null;
};

export const dynamic = "force-dynamic";

export default async function AdminSystemLabelsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const supabase = await getServerSupabase();

  let query = supabase
    .from("ui_label_catalog")
    .select(
      "id, domain, key, track, section, school_level, audience, label_ko, label_en, sort_order, is_active, updated_at",
    )
    .order("domain", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("key", { ascending: true });

  if (sp.domain) query = query.eq("domain", sp.domain);
  if (sp.track) query = query.eq("track", sp.track);
  if (sp.section) query = query.eq("section", sp.section);
  if (sp.active === "true") query = query.eq("is_active", true);
  if (sp.active === "false") query = query.eq("is_active", false);
  if (sp.q) query = query.or(`key.ilike.%${sp.q}%,label_ko.ilike.%${sp.q}%`);

  const { data, error } = await query;
  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          labels를 불러오지 못했습니다.
          <div className="mt-2 text-xs">{error.message}</div>
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as UILabelRow[];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Admin / System
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Labels
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            화면 표시 라벨과 설명을 관리하는 카탈로그
          </p>
        </div>

        <Link
          href="/admin/system/labels/new"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          새 라벨 만들기
        </Link>
      </header>

      <section className="rounded-2xl border bg-white p-4">
        <form className="grid gap-3 md:grid-cols-5">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="key / label 검색"
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          />

          <select
            name="domain"
            defaultValue={sp.domain ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 domain</option>
            <option value="weak_tag">weak_tag</option>
            <option value="prescription">prescription</option>
            <option value="analytics_metric">analytics_metric</option>
            <option value="review_tab">review_tab</option>
            <option value="review_field">review_field</option>
          </select>

          <select
            name="track"
            defaultValue={sp.track ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 track</option>
            <option value="naesin">naesin</option>
            <option value="junior">junior</option>
            <option value="toefl">toefl</option>
          </select>

          <select
            name="section"
            defaultValue={sp.section ?? ""}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 section</option>
            <option value="reading">reading</option>
            <option value="listening">listening</option>
            <option value="speaking">speaking</option>
            <option value="writing">writing</option>
            <option value="grammar">grammar</option>
            <option value="vocab">vocab</option>
          </select>

          <div className="flex gap-2">
            <select
              name="active"
              defaultValue={sp.active ?? ""}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
            >
              <option value="">활성 전체</option>
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
          Label Catalog
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>domain</th>
                <th>key</th>
                <th>label_ko</th>
                <th>scope</th>
                <th>정렬</th>
                <th>활성</th>
                <th>수정</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t [&>td]:px-4 [&>td]:py-3">
                  <td>{row.domain}</td>
                  <td className="font-mono text-xs">{row.key}</td>
                  <td className="font-medium text-neutral-900">{row.label_ko}</td>
                  <td className="text-neutral-600">
                    {[row.track, row.section, row.school_level, row.audience]
                      .filter(Boolean)
                      .join(" / ") || "-"}
                  </td>
                  <td>{row.sort_order ?? 100}</td>
                  <td>
                    <form action={toggleUILabelActiveAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <input
                        type="hidden"
                        name="is_active"
                        value={String(!(row.is_active ?? true))}
                      />
                      <button
                        type="submit"
                        className={[
                          "rounded-full px-3 py-1 text-xs border",
                          row.is_active
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : "border-neutral-300 bg-neutral-50 text-neutral-600",
                        ].join(" ")}
                      >
                        {row.is_active ? "활성" : "비활성"}
                      </button>
                    </form>
                  </td>
                  <td>
                    <Link
                      href={`/admin/system/labels/${row.id}`}
                      className="rounded-lg border px-3 py-1.5 text-xs hover:bg-neutral-50"
                    >
                      편집
                    </Link>
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-neutral-500"
                  >
                    등록된 라벨이 없습니다.
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
