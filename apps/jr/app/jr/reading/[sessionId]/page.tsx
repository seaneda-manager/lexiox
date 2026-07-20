import { getSupabaseServer } from 'web/lib/supabaseServer';
import ReadingSessionClient from './_components/ReadingSessionClient';

export const dynamic = 'force-dynamic';

type Props = {
  params: { sessionId: string };
};

export default async function ReadingPage({ params }: Props) {
  const supabase = await getSupabaseServer();

  const { data: passage } = await supabase
    .from('jr_reading_passages')
    .select('*')
    .eq('id', params.sessionId)
    .single();

  if (!passage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">지문을 찾을 수 없습니다</h1>
        </div>
      </div>
    );
  }

  return <ReadingSessionClient passage={passage} />;
}
