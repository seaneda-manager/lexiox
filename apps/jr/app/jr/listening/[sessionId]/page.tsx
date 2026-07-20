import { getSupabaseServer } from 'web/lib/supabaseServer';
import ListeningSessionClient from './_components/ListeningSessionClient';

export const dynamic = 'force-dynamic';

export default async function ListeningPage({ params }: { params: { sessionId: string } }) {
  const supabase = await getSupabaseServer();

  const { data: session } = await supabase
    .from('jr_listening_sessions')
    .select('*')
    .eq('id', params.sessionId)
    .single();

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">세션을 찾을 수 없습니다</h1>
        </div>
      </div>
    );
  }

  return <ListeningSessionClient session={session} />;
}
