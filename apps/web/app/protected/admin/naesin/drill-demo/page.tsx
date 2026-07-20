// app/(protected)/admin/naesin/drill-demo/page.tsx
import { getServerSupabase } from "@/lib/supabase/server";
import DrillDemoClient from "./_client/DrillDemoClient";

export const dynamic = "force-dynamic";

export default async function AdminNaesinDrillDemoPage() {
  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("naesin_passages")
    .select("id, title, status, school_level, sentence_count, payload")
    .order("updated_at", { ascending: false })
    .limit(100);

  const passages = (data ?? []) as {
    id: string;
    title: string;
    status: string;
    school_level: string | null;
    sentence_count: number;
    payload: unknown;
  }[];

  return (
    <main className="mx-auto max-w-[1600px] space-y-4 px-6 py-8">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Admin / Naesin / Drill Demo
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">내신 Drill 미리보기</h1>
        <p className="text-sm text-slate-500">
          DB에 저장된 지문을 선택해 8단계 드릴을 미리 체험합니다.
          준비되지 않은 단계는 빈칸으로 진행됩니다.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          지문 로드 오류: {error.message}
        </div>
      )}

      <DrillDemoClient passages={passages} />
    </main>
  );
}
