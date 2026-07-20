// apps/web/app/(protected)/admin/content/writing/editor/page.tsx
"use client";

export default function WritingContentEditorPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">Writing 2026 – Content Editor</h1>
        <p className="text-sm text-slate-600">
          Manage Integrated and Writing for an Academic Discussion tasks for the
          2026 format.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-md border bg-slate-50 p-3 text-sm">
          <h2 className="text-xs font-semibold uppercase text-slate-500">
            Writing Sets
          </h2>
          <p className="text-xs text-slate-600">
            Here you will select which Writing test or practice set to edit.
          </p>
          <button
            type="button"
            className="mt-2 w-full rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
          >
            + New Writing Set
          </button>
        </aside>

        <section className="space-y-4 rounded-md border bg-white p-4 text-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            Prompt / Rubric Editor
          </h2>
          <p className="text-xs text-slate-600">
            This area will later include reading passage, listening summary, and
            scoring rubric inputs.
          </p>

          <div className="rounded-md border bg-slate-50 p-3 text-xs font-mono text-slate-700">
            <pre className="whitespace-pre-wrap">
{`{
  "id": "writing-2026-demo-1",
  "tasks": [
    { "id": "W1", "kind": "integrated", "rubric": { ... } },
    { "id": "W2", "kind": "academic_discussion", "rubric": { ... } }
  ]
}`}
            </pre>
          </div>
        </section>
      </section>
    </main>
  );
}
