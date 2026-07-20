// apps/web/app/(protected)/listening/page.tsx
export const dynamic = 'force-dynamic';

import { getSupabaseServer } from '@/lib/supabaseServer';
import SetPicker from '@/components/listening/SetPicker';

type AvailSet = { id: string; tpo: number; title: string };

export default async function Page() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // (protected)??嫄곗쓽 ?????놁?留??덉쟾?μ튂
    return <div className="p-6">Please sign in.</div>;
  }

  // ??RPC 沅뚯옣 (?덉떆)
  // const { data: sets, error } = await supabase
  //   .rpc<AvailSet[]>('listening_available_sets', { p_user_id: user.id });

  // ??酉?議곗씤 吏곸젒 (?꾩옱 濡쒖쭅 ?좎?)
  const { data: sets, error } = await supabase
    .from('v_user_listening_sets')
    .select('id,tpo,title')
    .eq('user_id', user.id)
    .eq('downloaded', true)
    .order('tpo', { ascending: true }) as unknown as { data: AvailSet[] | null, error: any };

  if (error) {
    return <div className="p-6 text-red-600">Load error: {error.message}</div>;
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Listening</h1>
      {(!sets || sets.length === 0) ? (
        <>
          <p className="text-sm text-neutral-600">
            ?ㅼ슫濡쒕뱶??TPO媛 ?놁뒿?덈떎. 癒쇱? ?먮즺瑜??ㅼ슫濡쒕뱶?섏꽭??
          </p>
        </>
      ) : (
        <SetPicker sets={sets} />
      )}
      <p className="text-xs text-neutral-500">
        紐⑸줉?먮뒗 ?ㅼ슫濡쒕뱶 ?꾨즺???뚯감留??쒖떆?⑸땲??
      </p>
    </div>
  );
}




