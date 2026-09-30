import Link from 'next/link';
import type { ReactNode } from 'react';
import { getServerSupabase } from '@/lib/supabase/server';
import {
  GRAMMAR_LEVEL_LABEL,
  GRAMMAR_LESSON_LEVELS,
  GRAMMAR_QUESTION_KIND_LABEL,
  lessonCounts,
  validateGrammarLesson,
  type GrammarLesson,
  type GrammarLessonLevel,
} from '@/models/middle-naesin/grammar-lesson';
import { saveGrammarLessonAction, setGrammarLessonStatusAction } from '../../../../grammar-lesson-actions';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ unitId: string; contentId: string }>;
  searchParams: Promise<{ msg?: string; error?: string }>;
};

const LEVEL_STYLE: Record<GrammarLessonLevel, string> = {
  basic: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  intermediate: 'bg-amber-50 text-amber-700 border-amber-200',
  advanced: 'bg-rose-50 text-rose-700 border-rose-200',
};

function Badge({ level }: { level: GrammarLessonLevel }) {
  return (
    <span className={`mr-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${LEVEL_STYLE[level]}`}>
      {GRAMMAR_LEVEL_LABEL[level]}
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border bg-white p-5">
      <div className="text-sm font-bold text-neutral-700">{title}</div>
      {children}
    </section>
  );
}

export default async function GrammarLessonReviewPage({ params, searchParams }: Props) {
  const { unitId, contentId } = await params;
  const { msg, error } = await searchParams;
  const supabase = await getServerSupabase();

  const [{ data: unit }, { data: content }] = await Promise.all([
    supabase
      .from('middle_naesin_units')
      .select('publisher, grade, semester, lesson_number, lesson_title')
      .eq('id', unitId)
      .single(),
    supabase.from('middle_naesin_contents').select('id, title, extra_data').eq('id', contentId).single(),
  ]);
  if (!content) return <div className="p-8 text-red-600">문법 포인트를 찾을 수 없습니다.</div>;

  const rawLesson = (content.extra_data as { lesson?: unknown } | null)?.lesson;
  const validation = validateGrammarLesson(rawLesson);
  const lesson: GrammarLesson | null = validation.ok ? validation.lesson : null;
  const isFinal = lesson?.status === 'final';
  const counts = lesson ? lessonCounts(lesson) : null;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <header className="space-y-1">
        <Link href={`/admin/middle-naesin/units/${unitId}`} className="text-sm text-neutral-500 hover:text-neutral-800">
          ← 단원으로
        </Link>
        <div className="text-xs uppercase tracking-wide text-neutral-500">
          문법 레슨 검수 · {unit?.publisher} {unit?.semester}학기{' '}
          {unit?.lesson_number != null ? `Lesson ${unit.lesson_number}` : ''}
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">{content.title}</h1>
      </header>

      {msg && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">⚠️ {error}</div>
      )}

      {!lesson || !counts ? (
        <div className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <div className="font-semibold">레슨 데이터가 올바르지 않습니다.</div>
          <ul className="list-disc pl-5">
            {('errors' in validation ? validation.errors : []).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5">
            <div className="space-y-1">
              <span
                className={[
                  'rounded-full border px-3 py-1 text-sm font-semibold',
                  isFinal
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-amber-300 bg-amber-50 text-amber-700',
                ].join(' ')}
              >
                {isFinal ? '확정됨 · 학생에게 보임' : '초안 · 학생에게 보이지 않음'}
              </span>
              {lesson.finalizedAt && (
                <div className="text-xs text-neutral-400">확정: {new Date(lesson.finalizedAt).toLocaleString('ko-KR')}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/admin/middle-naesin/units/${unitId}/drill?section=grammar`}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
              >
                학생 화면처럼 풀어보기
              </Link>
              <form action={setGrammarLessonStatusAction}>
                <input type="hidden" name="content_id" value={contentId} />
                <input type="hidden" name="unit_id" value={unitId} />
                <input type="hidden" name="status" value={isFinal ? 'draft' : 'final'} />
                <button
                  type="submit"
                  className={[
                    'rounded-xl px-5 py-2 text-sm font-semibold text-white',
                    isFinal ? 'bg-neutral-500 hover:bg-neutral-600' : 'bg-emerald-700 hover:bg-emerald-800',
                  ].join(' ')}
                >
                  {isFinal ? '초안으로 되돌리기' : '✓ 검수 완료 · 확정'}
                </button>
              </form>
            </div>
          </section>

          <section className="rounded-2xl border bg-white p-5">
            <div className="mb-2 text-sm font-bold text-neutral-700">구성</div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-neutral-400">
                  <th className="py-1">단계</th>
                  {GRAMMAR_LESSON_LEVELS.map((lv) => (
                    <th key={lv}>{GRAMMAR_LEVEL_LABEL[lv]}</th>
                  ))}
                  <th>합계</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ['Drill 빈칸', counts.drillFill],
                    ['Drill 고치기+이유', counts.drillFix],
                    ['문제', counts.questions],
                  ] as const
                ).map(([label, c]) => (
                  <tr key={label} className="border-t">
                    <td className="py-1.5">{label}</td>
                    {GRAMMAR_LESSON_LEVELS.map((lv) => (
                      <td key={lv}>{c[lv]}</td>
                    ))}
                    <td className="font-semibold">{GRAMMAR_LESSON_LEVELS.reduce((a, lv) => a + c[lv], 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-xs text-neutral-400">
              설명 빈칸 {counts.blanks}개 · 문제 정답 위치(개수 세기 제외):{' '}
              {[0, 1, 2, 3]
                .map(
                  (i) =>
                    `${String.fromCharCode(65 + i)} ${
                      lesson.questions.filter((q) => q.kind !== 'count_wrong' && q.answerIndex === i).length
                    }`,
                )
                .join(' · ')}
            </div>
          </section>

          <Section title="1. 설명">
            <p className="text-sm font-medium">{lesson.explanation.summaryEn}</p>
            <p className="text-sm text-sky-800">{lesson.explanation.summaryKo}</p>
            <ol className="space-y-2">
              {lesson.explanation.rules.map((r, i) => (
                <li key={i} className="rounded-lg border p-3 text-sm">
                  <div className="font-medium">{r.en}</div>
                  <div className="text-xs text-neutral-500">{r.ko}</div>
                </li>
              ))}
            </ol>
            <div className="space-y-1.5">
              {lesson.explanation.examples.map((r, i) => (
                <div key={i} className="rounded-lg bg-emerald-50/50 p-3 text-sm">
                  <div>{r.en}</div>
                  <div className="text-xs text-neutral-500">{r.ko}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="2. 쓰기 깜지 (학생이 따라 쓸 원문)">
            <pre className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 font-sans text-sm">{lesson.cramText}</pre>
          </Section>

          <Section title={`3. 빈칸 채우기 (${lesson.blanks.length})`}>
            {lesson.blanks.map((b, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                {i + 1}. {b.text.replace('___', `[ ${b.answer} ]`)}
                {b.hint && <span className="ml-2 text-xs text-neutral-400">힌트 {b.hint}</span>}
              </div>
            ))}
          </Section>

          <Section title={`4-A. Drill 빈칸 (${lesson.drillFill.length})`}>
            {lesson.drillFill.map((f, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <Badge level={f.level} /> {i + 1}. {f.sentence.replace('___', `[ ${f.answer} ]`)}
                {f.choices && <span className="ml-2 text-xs text-neutral-400">보기: {f.choices.join(' / ')}</span>}
                {f.ko && <div className="text-xs text-neutral-500">{f.ko}</div>}
                {f.noteKo && <div className="text-xs text-neutral-400">💡 {f.noteKo}</div>}
              </div>
            ))}
          </Section>

          <Section title={`4-B. Drill 틀린 부분 고치기 + 이유 (${lesson.drillFix.length})`}>
            {lesson.drillFix.map((f, i) => (
              <div key={i} className="space-y-1 rounded-lg border p-3 text-sm">
                <div>
                  <Badge level={f.level} /> {i + 1}. {f.sentence}
                </div>
                <div className="text-xs">
                  틀린 곳: <b className="text-rose-600">{f.wrong}</b> → 정답:{' '}
                  <b className="text-emerald-700">{f.correct.map((c) => c || '(삭제)').join(' / ')}</b>
                </div>
                <ul className="text-xs text-neutral-600">
                  {f.reasonChoices.map((r, j) => (
                    <li key={j} className={j === f.reasonIndex ? 'font-semibold text-emerald-700' : ''}>
                      {j === f.reasonIndex ? '✓ ' : '· '}
                      {r}
                    </li>
                  ))}
                </ul>
                {f.ko && <div className="text-xs text-neutral-500">{f.ko}</div>}
              </div>
            ))}
          </Section>

          <Section title={`5. 문제 (${lesson.questions.length})`}>
            {lesson.questions.map((q, i) => (
              <div key={i} className="space-y-1.5 rounded-lg border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge level={q.level} />
                  <span className="text-xs text-neutral-500">{GRAMMAR_QUESTION_KIND_LABEL[q.kind]}</span>
                  <b>{i + 1}.</b>
                </div>
                <div className="whitespace-pre-wrap font-medium">{q.stem}</div>
                <ul className="space-y-0.5">
                  {q.choices.map((c, j) => (
                    <li
                      key={j}
                      className={['rounded px-2 py-1', j === q.answerIndex ? 'bg-emerald-50 font-semibold text-emerald-800' : ''].join(' ')}
                    >
                      {q.kind === 'count_wrong' ? '' : `${String.fromCharCode(65 + j)}. `}
                      {c.en}
                      {c.ko && <span className="ml-2 text-xs font-normal text-neutral-500">{c.ko}</span>}
                    </li>
                  ))}
                </ul>
                <div className="text-xs text-sky-800">💡 {q.explanationKo}</div>
              </div>
            ))}
          </Section>
        </>
      )}

      <section className="space-y-3 rounded-2xl border bg-white p-5">
        <div className="text-sm font-bold text-neutral-700">수정 (JSON)</div>
        <p className="text-xs text-neutral-500">
          고쳐서 저장하면 <b>초안 상태로 돌아갑니다</b>. 다시 위에서 확정해야 학생에게 보입니다. 형식이 틀리면 저장되지
          않고 어디가 틀렸는지 알려줍니다. (정답 위치는 questions[].answerIndex, 0부터 시작)
        </p>
        <form action={saveGrammarLessonAction} className="space-y-2">
          <input type="hidden" name="content_id" value={contentId} />
          <input type="hidden" name="unit_id" value={unitId} />
          <textarea
            name="lesson_json"
            defaultValue={JSON.stringify(rawLesson ?? {}, null, 2)}
            rows={24}
            className="w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-violet-200"
          />
          <button type="submit" className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800">
            초안으로 저장
          </button>
        </form>
      </section>
    </main>
  );
}
