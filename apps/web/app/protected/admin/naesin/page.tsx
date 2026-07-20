import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminNaesinPage() {
  const supabase = await getServerSupabase();

  const { count: passageCount } = await supabase
    .from('hi_naesin_passages')
    .select('id', { count: 'exact', head: true });

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <header>
        <div className="text-xs uppercase tracking-wide text-neutral-500">Admin / 내신</div>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">내신 드릴 관리</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 지문 관리 — 핵심 진입점 */}
        <Link
          href="/admin/hi-naesin/passages"
          className="group flex flex-col gap-3 rounded-2xl border bg-white p-6 shadow-sm hover:border-neutral-400 hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📄</span>
            {passageCount != null && (
              <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600">
                {passageCount}개
              </span>
            )}
          </div>
          <div>
            <div className="font-semibold text-neutral-900">지문 관리</div>
            <p className="mt-1 text-xs text-neutral-500">
              지문 등록 → 드릴 설정 → 학생 배정
            </p>
          </div>
          <div className="mt-auto pt-2 text-xs font-medium text-neutral-900 group-hover:underline">
            지문 목록 열기 →
          </div>
        </Link>

        {/* 챕터 일괄 등록 */}
        <Link
          href="/admin/hi-naesin/passages/bulk-new"
          className="group flex flex-col gap-3 rounded-2xl border bg-white p-6 shadow-sm hover:border-neutral-400 hover:shadow-md transition"
        >
          <span className="text-2xl">📦</span>
          <div>
            <div className="font-semibold text-neutral-900">챕터 일괄 등록</div>
            <p className="mt-1 text-xs text-neutral-500">
              교과서 한 단원의 지문 여러 개를 한 번에 등록합니다.
            </p>
          </div>
          <div className="mt-auto pt-2 text-xs font-medium text-neutral-900 group-hover:underline">
            일괄 등록 열기 →
          </div>
        </Link>

        {/* 단어 일괄 추가 */}
        <Link
          href="/admin/hi-naesin/vocab/bulk"
          className="group flex flex-col gap-3 rounded-2xl border bg-white p-6 shadow-sm hover:border-neutral-400 hover:shadow-md transition"
        >
          <span className="text-2xl">🔤</span>
          <div>
            <div className="font-semibold text-neutral-900">단어 일괄 추가</div>
            <p className="mt-1 text-xs text-neutral-500">
              지문에 연결된 단어장을 CSV 또는 직접 입력으로 추가합니다.
            </p>
          </div>
          <div className="mt-auto pt-2 text-xs font-medium text-neutral-900 group-hover:underline">
            단어 관리 열기 →
          </div>
        </Link>

        {/* 지문 직접 추가 */}
        <Link
          href="/admin/hi-naesin/passages/new"
          className="group flex flex-col gap-3 rounded-2xl border border-dashed bg-neutral-50 p-6 hover:bg-white hover:border-neutral-400 transition"
        >
          <span className="text-2xl">＋</span>
          <div>
            <div className="font-semibold text-neutral-900">지문 단건 추가</div>
            <p className="mt-1 text-xs text-neutral-500">
              지문 하나를 직접 입력해서 등록합니다.
            </p>
          </div>
        </Link>
      </div>
    </main>
  );
}
