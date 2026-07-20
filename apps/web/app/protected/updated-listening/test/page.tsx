import { getServerSupabase } from "@/lib/supabase/server";
import type { LListeningTest2026Linear } from "@/models/listening";
import Link from "next/link";
import Listening2026TestClient from "./_client/Listening2026TestClient";

export const dynamic = "force-dynamic";

export default async function Listening2026TestPage() {
  const supabase = await getServerSupabase();

  const { data } = await supabase
    .from("listening_tests_2026")
    .select("id,label,payload")
    .eq("is_locked", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.payload) {
    return (
      <main className="mx-auto max-w-xl py-16 px-4 text-center space-y-4">
        <div className="text-4xl">🎧</div>
        <h1 className="text-lg font-bold">아직 시험이 없습니다</h1>
        <p className="text-sm text-gray-500">
          Admin에서 Listening 시험을 생성하고 Lock하면 여기에 표시됩니다.
        </p>
        <Link href="/updated-listening" className="inline-block rounded-lg border px-4 py-2 text-xs hover:bg-gray-50">
          돌아가기
        </Link>
      </main>
    );
  }

  return (
    <div className="-m-4 md:-m-6 h-[calc(100%+2rem)] md:h-[calc(100%+3rem)]">
      <Listening2026TestClient test={data.payload as LListeningTest2026Linear} testId={data.id} />
    </div>
  );
}
