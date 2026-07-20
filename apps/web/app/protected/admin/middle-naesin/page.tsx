import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MiddleNaesinHubPage() {
  const supabase = await getServerSupabase();
  const { count } = await supabase
    .from('middle_naesin_units')
    .select('id', { count: 'exact', head: true });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <header>
        <div className="text-xs uppercase tracking-wide text-neutral-500">Admin / 중학내신</div>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">중학교 내신 관리</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/middle-naesin/units"
          className="group flex flex-col gap-3 rounded-2xl border bg-white p-6 shadow-sm hover:border-neutral-400 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📚</span>
            {count != null && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
                {count}개 단원
              </span>
            )}
          </div>
          <div>
            <div className="font-semibold text-neutral-900">단원 관리</div>
            <p className="mt-1 text-xs text-neutral-500">
              교과서 단원별 본문·대화문·More Reading·영영단어·기출 관리
            </p>
          </div>
          <div className="mt-auto pt-2 text-xs font-medium text-neutral-900 group-hover:underline">
            단원 목록 열기 →
          </div>
        </Link>

        <Link
          href="/admin/middle-naesin/units/new"
          className="group flex flex-col gap-3 rounded-2xl border border-dashed bg-neutral-50 p-6 hover:bg-white hover:border-neutral-400 transition"
        >
          <span className="text-2xl">＋</span>
          <div>
            <div className="font-semibold text-neutral-900">단원 추가</div>
            <p className="mt-1 text-xs text-neutral-500">
              새 교과서 단원을 등록하고 콘텐츠를 추가합니다.
            </p>
          </div>
        </Link>
      </div>
    </main>
  );
}
