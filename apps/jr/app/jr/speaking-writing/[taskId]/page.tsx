import { getSupabaseServer } from 'web/lib/supabaseServer';
import SpeakingWritingClient from './_components/SpeakingWritingClient';

export const dynamic = 'force-dynamic';

export default async function SpeakingWritingPage({ params }: { params: { taskId: string } }) {
  const supabase = await getSupabaseServer();

  const { data: task } = await supabase
    .from('jr_speaking_writing_tasks')
    .select('*')
    .eq('id', params.taskId)
    .single();

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900">과제를 찾을 수 없습니다</h1>
        </div>
      </div>
    );
  }

  return <SpeakingWritingClient task={task} />;
}
