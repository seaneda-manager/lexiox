'use client';

import { useFormStatus } from 'react-dom';
import { generateGrammarLessonAction } from '../../../grammar-lesson-actions';

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
    >
      {pending ? 'AI 생성 중… (1~2분 걸립니다)' : label}
    </button>
  );
}

export function GenerateLessonButton({
  unitId,
  contentId,
  hasLesson,
}: {
  unitId: string;
  contentId: string;
  hasLesson: boolean;
}) {
  return (
    <form
      action={generateGrammarLessonAction}
      onSubmit={(e) => {
        if (hasLesson && !confirm('이미 있는 레슨(수정·확정 내용 포함)이 AI 초안으로 덮어써지고, 초안 상태로 돌아갑니다. 계속할까요?')) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="content_id" value={contentId} />
      <input type="hidden" name="unit_id" value={unitId} />
      <Submit label={hasLesson ? '🤖 AI로 다시 생성(덮어쓰기)' : '🤖 AI로 레슨 생성'} />
    </form>
  );
}
