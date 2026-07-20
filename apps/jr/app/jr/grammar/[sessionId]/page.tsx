import { getSupabaseServer } from 'web/lib/supabaseServer';
import GrammarSessionClient from './_components/GrammarSessionClient';

export const dynamic = 'force-dynamic';

export default async function GrammarPage({ params }: { params: { sessionId: string } }) {
  const supabase = await getSupabaseServer();

  const { data: chapter } = await supabase
    .from('jr_grammar_chapters')
    .select('*')
    .eq('id', params.sessionId)
    .single();

  if (!chapter) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">문법 단원을 찾을 수 없습니다</h1>
        </div>
      </div>
    );
  }

  return <GrammarSessionClient chapter={chapter} />;
}
