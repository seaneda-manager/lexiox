import { getServerSupabase } from '@/lib/supabase/server';
import { startNaesinDrillSessionAction } from '../../naesin/drill/actions';

export const dynamic = 'force-dynamic';

export default async function JrDrillListPage() {
  const supabase = await getServerSupabase();

  const { data: passages } = await supabase
    .from('naesin_passages')
    .select('id, title')
    .eq('track', 'junior')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
          Jr. / Drill
        </div>
        <h1 className="text-2xl font-semibold text-neutral-900">지문 목록</h1>
      </header>

      {(!passages || passages.length === 0) ? (
        <p className="text-sm text-neutral-500">아직 공개된 지문이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {passages.map((p) => (
            <li key={p.id}>
              <form action={startNaesinDrillSessionAction}>
                <input type="hidden" name="passage_id" value={p.id} />
                <button
                  type="submit"
                  className="w-full rounded-xl border bg-white px-5 py-4 text-left text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  {p.title}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
