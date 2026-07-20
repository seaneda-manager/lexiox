import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import BulkVocabClient from './BulkVocabClient';

export const dynamic = 'force-dynamic';

export default async function HiNaesinVocabBulkPage() {
  const supabase = await getServerSupabase();

  const { data: passages } = await supabase
    .from('hi_naesin_passages')
    .select('id, title, grade')
    .order('grade')
    .order('title');

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-400">
            Admin / hi-내신 /{' '}
            <Link href="/admin/hi-naesin/passages" className="hover:underline">
              지문 목록
            </Link>{' '}
            / 단어 일괄 추가
          </div>
          <h1 className="mt-0.5 text-2xl font-semibold text-neutral-900">단어 일괄 추가</h1>
          <p className="mt-1 text-sm text-neutral-500">
            지문을 선택하고 단어를 탭 구분으로 붙여넣으면 한 번에 등록됩니다.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <BulkVocabClient passages={passages ?? []} />
      </div>
    </main>
  );
}
