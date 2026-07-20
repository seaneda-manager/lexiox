import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import HomeworkReviewClient from './HomeworkReviewClient';
import type { GradeResult } from '@/app/api/homework/grade/route';
import type { AnswerKeyItem } from '@/app/api/homework/grade/route';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function HomeworkReviewPage({ params }: Props) {
  const { id: homeworkId } = await params;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  // 숙제 정보 + 정답 키
  const { data: hw } = await supabase
    .from('photo_homework')
    .select('id, title, subject, answer_key_data')
    .eq('id', homeworkId)
    .maybeSingle();

  if (!hw) notFound();

  // 학생의 채점 결과
  const { data: sub } = await supabase
    .from('photo_homework_submissions')
    .select('ai_results, correct_count, total_count')
    .eq('homework_id', homeworkId)
    .eq('student_id', user.id)
    .maybeSingle();

  if (!sub) {
    // 아직 제출 안 함
    return (
      <main className="mx-auto max-w-lg space-y-6 pb-12">
        <header>
          <div className="text-xs text-neutral-400 mb-1">
            <Link href="/student/homework" className="hover:underline">숙제 목록</Link>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">{(hw as any).title}</h1>
        </header>
        <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-neutral-400">
          먼저 숙제를 제출하고 채점을 받아야 오답 교정을 시작할 수 있습니다.{' '}
          <Link href={`/student/homework/${homeworkId}/submit`} className="underline text-neutral-600">
            채점하러 가기
          </Link>
        </div>
      </main>
    );
  }

  const result   = (sub as any).ai_results as GradeResult | null;
  const wrongItems = (result?.items ?? []).filter((item) => !item.is_correct);

  if (wrongItems.length === 0) {
    return (
      <main className="mx-auto max-w-lg space-y-6 pb-12">
        <header>
          <div className="text-xs text-neutral-400 mb-1">
            <Link href="/student/homework" className="hover:underline">숙제 목록</Link>
          </div>
          <h1 className="text-xl font-bold text-neutral-900">{(hw as any).title}</h1>
        </header>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center space-y-2">
          <p className="text-2xl">🎉</p>
          <p className="text-sm font-semibold text-emerald-800">오답이 없습니다!</p>
          <p className="text-xs text-emerald-700">
            {(sub as any).correct_count}/{(sub as any).total_count}개 모두 정답입니다.
          </p>
        </div>
      </main>
    );
  }

  // 선생님 힌트 (answer_key_data.items[n].hint) 매핑
  const keyItems: AnswerKeyItem[] = (hw as any).answer_key_data?.items ?? [];
  const hintMap = new Map(keyItems.map((k) => [k.number, k.hint ?? null]));

  const wrongWithHints = wrongItems.map((item) => ({
    item,
    teacherHint: hintMap.get(item.number) ?? null,
  }));

  const scorePct = (sub as any).total_count > 0
    ? Math.round(((sub as any).correct_count / (sub as any).total_count) * 100)
    : 0;

  return (
    <main className="mx-auto max-w-lg space-y-6 pb-12">
      <header>
        <div className="text-xs text-neutral-400 mb-1">
          <Link href="/student/homework" className="hover:underline">숙제 목록</Link>
          {' / 오답 교정'}
        </div>
        <h1 className="text-xl font-bold text-neutral-900">{(hw as any).title}</h1>
        <p className="text-xs text-neutral-400 mt-0.5">
          점수 {scorePct}% · 오답 {wrongItems.length}개를 교정합니다
        </p>
      </header>

      {/* 안내 */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
        💡 답을 입력하고 <strong>확인</strong>을 누르세요.
        틀리면 힌트를 단계별로 볼 수 있습니다.
        끝까지 모르면 <strong>정답 보기</strong>로 확인하세요.
      </div>

      <HomeworkReviewClient
        homeworkId={homeworkId}
        subject={(hw as any).subject ?? 'mixed'}
        wrongItems={wrongWithHints}
      />
    </main>
  );
}
