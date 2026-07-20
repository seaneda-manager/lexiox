// apps/web/app/(protected)/admin/vocab/words/page.tsx
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
};

type WordRow = {
  id: string;
  text: string | null;
  lemma: string | null;
  pos: string | null;
  difficulty: string | number | null;
  created_at: string | null;
  meanings_ko: string[] | string | null;
  meanings_en_simple: string[] | string | null;
};

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "").trim()).filter(Boolean);
  }

  const s = String(value ?? "").trim();
  return s ? [s] : [];
}

function getPrimaryMeaning(row: WordRow) {
  const ko = asStringArray(row.meanings_ko);
  if (ko.length > 0) return ko[0];

  const en = asStringArray(row.meanings_en_simple);
  if (en.length > 0) return en[0];

  return "-";
}

export default async function AdminVocabWordsListPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const sp = (await searchParams) ?? {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const supabase = await getServerSupabase();

  let req = supabase
    .from("words")
    .select(
      "id, text, lemma, pos, difficulty, created_at, meanings_ko, meanings_en_simple",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    req = req.or(`text.ilike.%${q}%,lemma.ilike.%${q}%`);
  }

  const { data, error } = await req;
  const rows = ((data ?? []) as WordRow[]) ?? [];

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-bold">Vocab Words</h1>
          <p className="text-sm text-gray-600">
            최근 200개 표시 {q ? `(검색: "${q}")` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/vocab/import"
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            + Import (리스트로 넣기)
          </Link>

          <Link
            href="/admin/vocab/words/new"
            className="rounded-md bg-black px-3 py-2 text-sm text-white hover:opacity-90"
          >
            + 새 단어
          </Link>
        </div>
      </header>

      <section className="rounded-lg border bg-white p-3">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by text / lemma (예: extend)"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
          >
            검색
          </button>

          {q ? (
            <Link
              href="/admin/vocab/words"
              className="rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
            >
              초기화
            </Link>
          ) : null}
        </form>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          DB 오류: {error.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-600">
              <tr>
                <th className="px-3 py-2">text</th>
                <th className="px-3 py-2">pos</th>
                <th className="px-3 py-2">대표 뜻</th>
                <th className="px-3 py-2">difficulty</th>
                <th className="px-3 py-2">created</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-gray-500" colSpan={6}>
                    결과 없음
                  </td>
                </tr>
              ) : (
                rows.map((w) => (
                  <tr key={w.id} className="border-t align-top">
                    <td className="px-3 py-2">
                      <div className="font-semibold">{w.text ?? "-"}</div>
                      <div className="text-xs text-gray-500">
                        lemma: {w.lemma ?? "-"} · id:{" "}
                        <span className="font-mono">{String(w.id).slice(0, 8)}…</span>
                      </div>
                    </td>

                    <td className="px-3 py-2">{w.pos ?? "-"}</td>

                    <td className="px-3 py-2">
                      <div className="max-w-[280px] whitespace-normal text-sm text-gray-800">
                        {getPrimaryMeaning(w)}
                      </div>
                    </td>

                    <td className="px-3 py-2">{w.difficulty ?? "-"}</td>

                    <td className="px-3 py-2">
                      {w.created_at ? new Date(w.created_at).toLocaleString() : "-"}
                    </td>

                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/vocab/words/${w.id}/edit`}
                        className="rounded-md border px-2.5 py-1 text-xs hover:bg-gray-50"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="text-xs text-gray-500">
        Tip: 저장 후 여기(/admin/vocab/words)에서 text/lemma 검색으로 뜻까지 바로 확인 가능.
      </div>
    </main>
  );
}
