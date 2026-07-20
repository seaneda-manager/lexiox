// apps/web/app/(protected)/updated-reading/study/[setId]/page.tsx
import { notFound, redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';

type Props = { params: Promise<{ setId: string }> };

export default async function ReadingStudyPage({ params: paramsPromise }: Props) {
  const { setId } = await paramsPromise;
  const supabase = await getSupabaseServer();

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/auth/login');

  const { data: set, error } = await supabase
    .from('reading_sets')
    .select('id, title, passage_html')
    .eq('id', setId)
    .maybeSingle();

  if (error || !set) notFound();

  const { data: questions } = await supabase
    .from('reading_questions')
    .select('id, number, stem, choices')
    .eq('set_id', setId)
    .order('number', { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{set.title}</h1>

      <article
        className="prose max-w-none rounded border bg-white p-4"
        dangerouslySetInnerHTML={{ __html: set.passage_html }}
      />

      <form
        className="space-y-4"
        action={async (formData) => {
          'use server';
          const answers: Record<string, string> = {};
          (questions ?? []).forEach((q) => {
            const key = `q_${q.id}`;
            const val = formData.get(key);
            if (typeof val === 'string' && val) {
              answers[q.id] = val;
            }
          });

          const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/updated-reading/study/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ setId: setId, answers }),
          });

          if (!res.ok) {
            console.error('submit failed', await res.text());
            return;
          }
          const json = await res.json();
          if (json.ok && json.sessionId) {
            redirect(`/updated-reading/review/${json.sessionId}`);
          }
        }}
      >
        {(questions ?? []).map((q) => (
          <div key={q.id} className="rounded border bg-white p-3">
            <div className="text-sm font-medium">
              Q{q.number}. {q.stem}
            </div>
            <div className="mt-2 space-y-1 text-sm">
              {Array.isArray(q.choices) &&
                q.choices.map((c: any) => (
                  <label key={c.id} className="flex items-center gap-2">
                    <input type="radio" name={`q_${q.id}`} value={c.id} className="h-4 w-4" />
                    <span>{c.text}</span>
                  </label>
                ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="mt-4 rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Submit &amp; Go to Review
        </button>
      </form>
    </div>
  );
}
