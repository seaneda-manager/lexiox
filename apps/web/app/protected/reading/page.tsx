// apps/web/app/(protected)/reading/page.tsx
export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabaseServer';
import SetPicker from '@/components/reading/SetPicker';

type AvailSet = {
  id: string;
  title: string;
  source: string | null;
  version: number | null;
};

export default async function Page() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-6">Please sign in.</div>;
  }

  const { data: sets, error } = await supabase
    .from('v_user_reading_sets')
    .select('id, title, source, version')
    // 필요하면 Listening처럼 user 필터도 쓸 수 있음:
    // .eq('user_id', user.id)
    // .eq('downloaded', true)
    .order('created_at', { ascending: true })
    .returns<AvailSet[]>();

  if (error) {
    return (
      <div className="p-6 text-red-600">
        Load error: {error.message}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Reading</h1>

      {!sets || sets.length === 0 ? (
        <p className="text-sm text-neutral-600">
          다운로드한 Reading 세트가 없습니다.
        </p>
      ) : (
        <SetPicker sets={sets} />
      )}

      <p className="text-xs text-neutral-500">
        목록은 다운로드 여부와 관계없이 표시됩니다.
      </p>
    </div>
  );
}
