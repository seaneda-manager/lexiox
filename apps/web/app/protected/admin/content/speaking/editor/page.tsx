// apps/web/app/(protected)/admin/content/speaking/editor/page.tsx
"use client";

export default function SpeakingContentEditorPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-xl font-bold">Speaking 2026 – Content Editor</h1>
        <p className="text-sm text-slate-600">
          Set up Speaking tasks (personal, campus, academic) for practice or
          mock tests.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-md border bg-slate-50 p-3 text-sm">
          <h2 className="text-xs font-semibold uppercase text-slate-500">
            Speaking Sets
          </h2>
          <p className="text-xs text-slate-600">
            Later this will list Speaking test forms with task counts.
          </p>
          <button
            type="button"
            className="mt-2 w-full rounded-md bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900"
          >
            + New Speaking Set
          </button>
        </aside>

        <section className="space-y-4 rounded-md border bg-white p-4 text-sm">
          <h2 className="text-sm font-semibold text-slate-800">
            Task Editor Preview
          </h2>
          <p className="text-xs text-slate-600">
            This area will show task prompts, prep/speak times, and reference
            to audio/reading materials where needed.
          </p>

          <div className="rounded-md border bg-slate-50 p-3 text-xs font-mono text-slate-700">
            <pre className="whitespace-pre-wrap">
{`{
  "meta": { "id": "speaking-2026-demo-1" },
  "tasks": [
    { "id": "sp1", "kind": "personal", "prepSeconds": 15, "speakSeconds": 45 }
  ]
}`}
            </pre>
          </div>
        </section>
      </section>
    </main>
  );
}
