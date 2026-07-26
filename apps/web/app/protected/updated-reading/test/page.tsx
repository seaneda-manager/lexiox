// apps/web/app/protected/updated-reading/test/page.tsx
import { getServerSupabase } from '@/lib/supabase/server';
import MockTestPlayer from '@/components/reading/MockTestPlayer';
import type { RReadingTest2026 } from '@/models/reading';

export const dynamic = 'force-dynamic';

export default async function Reading2026TestPage() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="p-6">Please sign in.</div>;
  }

  const { data: testRow } = await supabase
    .from('reading_tests_2026')
    .select('id, label, payload')
    .eq('is_locked', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!testRow || !testRow.payload) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12 text-center text-sm text-gray-500">
        아직 응시 가능한 Reading 시험이 없습니다. 선생님에게 문의하거나{' '}
        <a href="/updated-reading/assignments" className="text-blue-500 underline">
          Assignments
        </a>
        를 확인하세요.
      </div>
    );
  }

  return (
    <MockTestPlayer
      testId={testRow.id}
      label={testRow.label ?? 'Reading 2026 Test'}
      test={testRow.payload as RReadingTest2026}
    />
  );
}
