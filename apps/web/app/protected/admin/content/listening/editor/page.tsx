// apps/web/app/(protected)/admin/content/listening/editor/page.tsx
"use client";

export default function ListeningContentEditorPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">Listening 2026 – Content Editor</h1>
        <p className="text-sm text-slate-600">
          Manage Listening modules (Stage 1 / Stage 2, conversations,
          announcements, academic talks).
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-md border bg-slate-50 p-3 text-sm">
          <h2 className="text-xs font-semibold uppercase text-slate-500">
            Listening Sets
          </h2>
          <p className="text-xs text-slate-600">
            This sidebar will show available Listening sets and modules.
          </p>
          <button
            type="button"
            className="mt-2 w-full rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
          >
            + New Listening Set
          </button>
        </aside>

        <section className="space-y-4 rounded-md border bg-white p-4 text-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            Module / Item Editor
          </h2>
          <p className="text-xs text-slate-600">
            Here we will later edit modules, items, and questions with audio
            URLs and transcripts.
          </p>

          <div className="rounded-md border bg-slate-50 p-3 text-xs font-mono text-slate-700">
            <pre className="whitespace-pre-wrap">
{`{
  "id": "updated-listening-demo-1",
  "meta": { "examEra": "ibt_2026" },
  "modules": [
    { "id": "L-mod-1", "stage": 1, "items": [...] },
    { "id": "L-mod-2", "stage": 2, "items": [...] }
  ]
}`}
            </pre>
          </div>
        </section>
      </section>
    </main>
  );
}
