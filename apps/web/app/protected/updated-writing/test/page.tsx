import Link from 'next/link';
import { BookOpen, Clock, Zap, AlertCircle } from 'lucide-react';
import { getServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type WritingTest = {
  id: string;
  label: string;
  payload?: { items?: Array<{ taskKind?: string }> };
  is_locked?: boolean;
};

export default async function WritingTestListPage() {
  const supabase = await getServerSupabase();

  const { data: tests, error } = await supabase
    .from('writing_tests')
    .select('id, label, payload, is_locked')
    .order('created_at', { ascending: false });

  const writingTests = (tests ?? []) as WritingTest[];
  const availableTests = writingTests.filter(t => t.is_locked !== false); // Lock된 것만 표시

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Writing Test Mode</h1>
        <p className="text-sm text-gray-600 mt-1">
          {availableTests.length > 0
            ? `${availableTests.length}개의 Writing Test를 선택할 수 있습니다.`
            : '이용 가능한 Writing Test가 없습니다.'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error.message}</div>
        </div>
      )}

      {availableTests.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-600">아직 준비된 Writing Test가 없습니다.</p>
          <p className="text-xs text-gray-500 mt-2">잠시 후 다시 확인해주세요.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {availableTests.map((test) => {
            const itemCount = test.payload?.items?.length ?? 0;
            const hasEmail = test.payload?.items?.some(i => i.taskKind === 'email');
            const hasAcademic = test.payload?.items?.some(i => i.taskKind === 'academic_discussion');

            let taskDesc = '';
            if (hasEmail && hasAcademic) {
              taskDesc = 'Build a Sentence · Email Writing · Academic Discussion';
            } else if (hasEmail) {
              taskDesc = 'Build a Sentence · Email Writing';
            } else if (hasAcademic) {
              taskDesc = 'Build a Sentence · Academic Discussion';
            } else {
              taskDesc = `${itemCount > 0 ? itemCount : 3} tasks`;
            }

            return (
              <Link
                key={test.id}
                href={`/updated-writing/test/${test.id}`}
                className="rounded-lg border bg-white hover:border-teal-400 hover:shadow-md transition cursor-pointer p-6"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="text-3xl">✍️</div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold">{test.label}</h3>
                    <p className="text-xs text-gray-600 mt-1">{taskDesc}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-600 pt-2 border-t">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>~25 minutes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      <span>{itemCount > 0 ? itemCount : 3} tasks</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      <span>TOEFL iBT</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-indigo-700 uppercase">💡 Test Mode Tips</p>
        <ul className="text-xs text-indigo-900 space-y-1 list-inside list-disc">
          <li>Strict time limits: Once timer ends, essay is auto-submitted</li>
          <li>Copy/Paste disabled: Prevents external content</li>
          <li>AI feedback provides detailed comments on each task</li>
          <li>Review mode shows your submissions and AI analysis</li>
        </ul>
      </div>
    </div>
  );
}
