import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type LegacyRow = {
  id: string;
  set_id: string | null;
  title: string | null;
  updated_at: string | null;
  questions_count?: number | null;
};

type NaesinRow = {
  id: string;
  title: string | null;
  updated_at: string | null;
  total_questions: number | null;
  exam_context: string | null;
  grade_band: string | null;
  difficulty: string | null;
  school_name: string | null;
  semester: string | null;
  is_published: boolean | null;
};

function fmtDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function badge(text?: string | null) {
  if (!text) return null;
  return (
    <span className="rounded-full border px-2 py-0.5 text-xs text-gray-700">
      {text}
    </span>
  );
}

export default async function AdminContentListPage() {
  const supabase = await getServerSupabase();

  let legacyRows: LegacyRow[] = [];
  let legacyErrorMsg: string | null = null;

  let naesinRows: NaesinRow[] = [];
  let naesinErrorMsg: string | null = null;

  const naesin = await supabase
    .from("naesin_reading_sets")
    .select(
      `
      id,
      title,
      updated_at,
      total_questions,
      exam_context,
      grade_band,
      difficulty,
      school_name,
      semester,
      is_published
    `,
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!naesin.error && naesin.data) {
    naesinRows = (naesin.data as any[]).map((r) => ({
      id: r.id,
      title: r.title ?? "",
      updated_at: r.updated_at ?? null,
      total_questions:
        typeof r.total_questions === "number" ? r.total_questions : null,
      exam_context: r.exam_context ?? null,
      grade_band: r.grade_band ?? null,
      difficulty: r.difficulty ?? null,
      school_name: r.school_name ?? null,
      semester: r.semester ?? null,
      is_published:
        typeof r.is_published === "boolean" ? r.is_published : null,
    }));
  } else {
    naesinErrorMsg = naesin.error?.message ?? "Naesin query failed";
  }

  const legacyA = await supabase
    .from("reading_passages")
    .select(`
      id,
      set_id,
      title,
      updated_at,
      reading_questions:reading_questions(count)
    `)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!legacyA.error && legacyA.data) {
    legacyRows = (legacyA.data as any[]).map((r) => ({
      id: r.id,
      set_id: r.set_id ?? null,
      title: r.title ?? "",
      updated_at: r.updated_at ?? null,
      questions_count:
        typeof r.reading_questions?.[0]?.count === "number"
          ? r.reading_questions[0].count
          : null,
    }));
  } else {
    const legacyB = await supabase
      .from("reading_passages")
      .select("id, set_id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);

    if (!legacyB.error && legacyB.data) {
      legacyRows = legacyB.data.map((r) => ({
        id: (r as any).id,
        set_id: (r as any).set_id ?? null,
        title: (r as any).title ?? "",
        updated_at: (r as any).updated_at ?? null,
        questions_count: null,
      }));
    } else {
      legacyErrorMsg =
        legacyA.error?.message || legacyB.error?.message || "Legacy query failed";
    }
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Content List</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/content/new/json"
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            New Naesin JSON
          </Link>
          <Link
            href="/reading/admin"
            className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
            title="Open Advanced Reading Editor"
          >
            Legacy Advanced Editor
          </Link>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Naesin Reading Sets</h2>
            <p className="text-sm text-gray-500">
              Saved into <code>naesin_reading_*</code> tables
            </p>
          </div>
        </div>

        {naesinErrorMsg ? (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <div className="mb-1 font-medium">Could not load Naesin sets.</div>
            <div className="opacity-75">{naesinErrorMsg}</div>
          </div>
        ) : naesinRows.length === 0 ? (
          <div className="rounded border p-6 text-sm text-gray-600">
            No Naesin reading sets found yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Meta</th>
                  <th className="p-2 text-left">Questions</th>
                  <th className="p-2 text-left">Updated</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {naesinRows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-2">
                      <div className="font-medium text-gray-900">
                        {r.title || "(Untitled)"}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {r.school_name || "-"}
                        {r.semester ? ` · ${r.semester}` : ""}
                        {r.is_published ? " · published" : " · draft"}
                      </div>
                    </td>

                    <td className="p-2">
                      <div className="flex flex-wrap gap-1.5">
                        {badge(r.exam_context)}
                        {badge(r.grade_band)}
                        {badge(r.difficulty)}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        ID: {r.id.slice(0, 8)}
                      </div>
                    </td>

                    <td className="p-2">
                      {typeof r.total_questions === "number"
                        ? r.total_questions
                        : "-"}
                    </td>

                    <td className="p-2">{fmtDate(r.updated_at)}</td>

                    <td className="p-2 text-right">
                      <Link
                        href={`/admin/content/new/json?setId=${encodeURIComponent(
                          r.id,
                        )}`}
                        className="rounded border px-2 py-1 hover:bg-gray-50"
                        title="Open Naesin JSON editor"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold">Legacy Reading Passages</h2>
          <p className="text-sm text-gray-500">
            Existing advanced editor / legacy reading content
          </p>
        </div>

        {legacyErrorMsg ? (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
            <div className="mb-1 font-medium">Could not load the legacy list.</div>
            <div className="opacity-75">{legacyErrorMsg}</div>
          </div>
        ) : legacyRows.length === 0 ? (
          <div className="rounded border p-6 text-sm text-gray-600">
            No legacy reading passages found yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-2 text-left">Title</th>
                  <th className="p-2 text-left">Set / ID</th>
                  <th className="p-2 text-left">Questions</th>
                  <th className="p-2 text-left">Updated</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {legacyRows.map((r) => {
                  const editorSetId = r.set_id ?? r.id;

                  return (
                    <tr key={r.id} className="border-t">
                      <td className="p-2">{r.title || "(Untitled)"}</td>
                      <td className="p-2">
                        {(r.set_id ?? "(no-set)") + " / " + r.id.slice(0, 8)}
                      </td>
                      <td className="p-2">
                        {typeof r.questions_count === "number"
                          ? r.questions_count
                          : "-"}
                      </td>
                      <td className="p-2">{fmtDate(r.updated_at)}</td>
                      <td className="p-2 text-right">
                        <Link
                          href={`/reading/admin?setId=${encodeURIComponent(
                            editorSetId,
                          )}`}
                          className="rounded border px-2 py-1 hover:bg-gray-50"
                          title="Edit in Advanced Editor"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
