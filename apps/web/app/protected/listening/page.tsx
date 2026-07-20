// apps/web/app/(protected)/listening/page.tsx
export const dynamic = "force-dynamic";

import { getSupabaseServer } from "@/lib/supabaseServer";
import SetPicker from "@/components/listening/SetPicker";

type AvailSet = { id: string; tpo: number; title: string };

export default async function Page() {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // (protected) 영역: 로그인된 유저만 접근 가능
  if (!user) {
    return <div className="p-6">Please sign in.</div>;
  }

  // NOTE: 나중에 listening_available_sets RPC로 교체 예정
  // const { data: sets, error } = await supabase
  //   .rpc<AvailSet[]>('listening_available_sets', { p_user_id: user.id });

  // 현재 로직: 뷰에서 사용 가능한 세트 조회
  const { data: sets, error } = await supabase
    .from("v_user_listening_sets")
    .select("id, tpo, title")
    .eq("user_id", user.id)
    .eq("downloaded", true)
    .order("tpo", { ascending: true })
    .returns<AvailSet[]>();

  if (error) {
    return <div className="p-6 text-red-600">Load error: {error.message}</div>;
  }

  return (
    <div className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-xl font-semibold">Listening</h1>

      {!sets || sets.length === 0 ? (
        <>
          <p className="text-sm text-neutral-600">
            다운로드된 TPO 리스닝 세트가 없습니다. 먼저 Admin에서 세트를
            다운로드해 주세요.
          </p>
        </>
      ) : (
        <SetPicker sets={sets} />
      )}

      <p className="text-xs text-neutral-500">
        목록에는 다운로드가 완료된 세트만 표시됩니다.
      </p>
    </div>
  );
}
