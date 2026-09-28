import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { upsertContentAction } from '../../../../../actions';
import { contentTypeLabel } from '@/models/middle-naesin';
import type { MiddleNaesinContent } from '@/models/middle-naesin';

export const dynamic = 'force-dynamic';

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ unitId: string; contentId: string }>;
}) {
  const { unitId, contentId } = await params;
  const supabase = await getServerSupabase();
  const { data, error } = await supabase
    .from('middle_naesin_contents')
    .select('*')
    .eq('id', contentId)
    .eq('unit_id', unitId)
    .single();

  if (error || !data) {
    return <div className="p-8 text-red-600">콘텐츠를 찾을 수 없습니다.</div>;
  }

  const c = data as MiddleNaesinContent;
  const isVocab = c.content_type === 'vocab_en_en';
  const isVocabKo = c.content_type === 'vocab_ko';
  const isGrammar = c.content_type === 'grammar_point';
  const isPastExam = c.content_type === 'past_exam';
  const grammarExtraRaw = (c.extra_data as { quizRaw?: string | { drill?: string; practice?: string; test?: string } } | null)?.quizRaw;
  const grammarQuizByStage =
    typeof grammarExtraRaw === 'string'
      ? { drill: '', practice: grammarExtraRaw, test: '' }
      : { drill: grammarExtraRaw?.drill ?? '', practice: grammarExtraRaw?.practice ?? '', test: grammarExtraRaw?.test ?? '' };

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            중학내신 / {contentTypeLabel(c.content_type)} 수정
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">콘텐츠 수정</h1>
        </div>
        <Link
          href={`/admin/middle-naesin/units/${unitId}`}
          className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          돌아가기
        </Link>
      </header>

      <form action={upsertContentAction} className="space-y-5">
        <input type="hidden" name="id" value={c.id} />
        <input type="hidden" name="unit_id" value={unitId} />
        <input type="hidden" name="content_type" value={c.content_type} />
        <input type="hidden" name="sort_order" value={String(c.sort_order ?? 0)} />

        <section className="rounded-2xl border bg-white p-5 space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">제목 (선택)</label>
            <input
              name="title"
              defaultValue={c.title ?? ''}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200"
            />
          </div>

          {!isVocab && !isVocabKo && !isGrammar && !isPastExam && (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-500">
                  {c.content_type === 'main_text' || c.content_type === 'dialogue'
                    ? '지문 원문 *'
                    : 'More Reading 지문 *'}
                </label>
                <textarea
                  name="body_text"
                  rows={10}
                  defaultValue={c.body_text ?? ''}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-500">전체 해석 (선택)</label>
                <textarea
                  name="translation_ko"
                  rows={5}
                  defaultValue={c.translation_ko ?? ''}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y"
                />
              </div>
            </>
          )}

          {isVocab && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-500">
                영영 단어 목록 — "word | definition | example" 한 줄 형식, 또는 "word: definition" 줄 다음
                "(한글 뜻)" 괄호 줄 형식 둘 다 지원
              </label>
              <textarea
                name="body_text"
                rows={10}
                defaultValue={c.body_text ?? ''}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y font-mono"
              />
            </div>
          )}

          {isVocabKo && (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-500">
                단어 목록 (한 줄에 하나: word: 한글 뜻)
              </label>
              <textarea
                name="body_text"
                rows={10}
                defaultValue={c.body_text ?? ''}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y font-mono"
              />
            </div>
          )}

          {isGrammar && (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-500">영어 설명/규칙 + 예문</label>
                <textarea
                  name="body_text"
                  rows={6}
                  defaultValue={c.body_text ?? ''}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-500">한글 설명</label>
                <textarea
                  name="translation_ko"
                  rows={4}
                  defaultValue={c.translation_ko ?? ''}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-500">
                  Drill 문제 (반복 연습, 선택 · 한 줄에 하나: 질문 | 보기1 | 보기2 | 보기3 | 정답번호 | 해설(선택))
                </label>
                <textarea
                  name="quiz_drill_raw"
                  rows={4}
                  defaultValue={grammarQuizByStage.drill}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-500">Practice 문제 (응용, 선택 · 같은 형식)</label>
                <textarea
                  name="quiz_practice_raw"
                  rows={4}
                  defaultValue={grammarQuizByStage.practice}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-500">Test 문제 (평가, 선택 · 같은 형식)</label>
                <textarea
                  name="quiz_test_raw"
                  rows={4}
                  defaultValue={grammarQuizByStage.test}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y font-mono"
                />
              </div>
            </>
          )}

          {isPastExam && (
            <>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-500">기출 지문/내용</label>
                <textarea
                  name="body_text"
                  rows={8}
                  defaultValue={c.body_text ?? ''}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-500">해설 / 풀이</label>
                <textarea
                  name="translation_ko"
                  rows={5}
                  defaultValue={c.translation_ko ?? ''}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 resize-y"
                />
              </div>
            </>
          )}
        </section>

        <div className="flex justify-end gap-3">
          <Link
            href={`/admin/middle-naesin/units/${unitId}`}
            className="rounded-xl border px-5 py-2.5 text-sm hover:bg-neutral-50"
          >
            취소
          </Link>
          <button
            type="submit"
            className="rounded-xl bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            저장
          </button>
        </div>
      </form>
    </main>
  );
}
