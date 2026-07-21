import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import {
  sourceTypeLabel, gradeLabel,
  drillTypeLabel, HI_NAESIN_DRILL_TYPES,
  variantTypeLabel, defaultStem, HI_NAESIN_VARIANT_TYPES,
} from '@/models/hi-naesin';
import type {
  HiNaesinPassageRow, HiNaesinDrillRow,
  HiNaesinVariantQuestionRow, HiNaesinVariantChoiceRow,
} from '@/models/hi-naesin';
import {
  updateHiNaesinPassageAction,
  addHiNaesinDrillAction,
  deleteHiNaesinDrillAction,
  addHiNaesinVariantQuestionAction,
  deleteHiNaesinVariantQuestionAction,
  saveHiNaesinVariantChoicesAction,
  toggleVariantPublishAction,
} from './actions';
import {
  generateSentencePairsAction,
  updateSentencePairAction,
  generateDrillsFromSentencesAction,
  generateGrammarDrillsAction,
  generateThoughtUnitDrillsAction,
  generateStructureDrillsAction,
} from './sentence-actions';
import {
  assignPassageAction,
  removeAssignmentAction,
  updateEnabledDrillTypesAction,
} from './assign-actions';
import { startHiNaesinDrillSessionAction } from '@/app/protected/hi-naesin/passages/actions';

export const dynamic = 'force-dynamic';

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  tab?: string;
  ok?: string;    // '2step' | '3step' | '4step'
  err?: string;   // error message
  t?: string; w?: string; fb?: string; v?: string; g?: string; d?: string;
  ta?: string; wa?: string; tc?: string;
}>;

export default async function HiNaesinPassageEditPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { tab = 'passage', ok, err, t, w, fb, v, g, d, ta, wa, tc } = await searchParams;
  const supabase = await getServerSupabase();

  const questionIds = (
    await supabase
      .from('hi_naesin_variant_questions')
      .select('id')
      .eq('passage_id', id)
  ).data?.map((q) => q.id) ?? [];

  const [
    { data: passageData },
    { data: drillsData },
    { data: questionsData },
    { data: choicesData },
    { data: sentencesData },
    { data: assignmentsData },
    { data: studentsData },
  ] = await Promise.all([
    supabase.from('hi_naesin_passages').select('*').eq('id', id).single(),
    supabase.from('hi_naesin_drills').select('*').eq('passage_id', id).order('drill_type').order('order_index'),
    supabase.from('hi_naesin_variant_questions').select('*').eq('passage_id', id).order('order_index'),
    questionIds.length > 0
      ? supabase.from('hi_naesin_variant_choices').select('*').in('question_id', questionIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from('hi_naesin_passage_sentences').select('*').eq('passage_id', id).order('order_index'),
    supabase.from('hi_naesin_assignments').select('id, student_id, assignment_type, status, due_at, note, assigned_at, enabled_drill_types').eq('passage_id', id).order('assigned_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
  ]);

  if (!passageData) notFound();

  const passage = passageData as HiNaesinPassageRow;
  const drills = (drillsData ?? []) as HiNaesinDrillRow[];
  const questions = (questionsData ?? []) as HiNaesinVariantQuestionRow[];
  const choices = (choicesData ?? []) as HiNaesinVariantChoiceRow[];
  const sentences = (sentencesData ?? []) as Array<{
    id: string; order_index: number; sentence_en: string; sentence_ko: string | null;
  }>;

  const choicesByQuestion: Record<string, HiNaesinVariantChoiceRow[]> = {};
  for (const c of choices) {
    if (!choicesByQuestion[c.question_id]) choicesByQuestion[c.question_id] = [];
    choicesByQuestion[c.question_id].push(c);
  }

  const assignments = (assignmentsData ?? []) as Array<{
    id: string; student_id: string; assignment_type: string;
    status: string; due_at: string | null; note: string | null; assigned_at: string;
    enabled_drill_types: string[] | null;
  }>;
  const students = (studentsData ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>;
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const tabs = [
    { key: 'passage',   label: '지문 정보' },
    { key: 'sentences', label: `문장 매칭 (${sentences.length})` },
    { key: 'drill',     label: `Drill (${drills.length})` },
    { key: 'variant',   label: `변형문제 (${questions.length})` },
    { key: 'assign',    label: `배정 (${assignments.length})` },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-8">
      {/* 헤더 */}
      <header className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Admin / 고등내신 / 지문 편집
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">
            {passage.title ?? '(제목 없음)'}
          </h1>
          <div className="mt-1 flex gap-2 text-xs text-neutral-500">
            <span>{sourceTypeLabel(passage.source_type as never)}</span>
            <span>·</span>
            <span>{gradeLabel(passage.grade as never)}</span>
            <span>·</span>
            <span>{passage.is_published ? '공개' : '비공개'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <form action={startHiNaesinDrillSessionAction}>
            <input type="hidden" name="passage_id" value={id} />
            <button
              type="submit"
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-100"
            >
              👁 드릴 미리보기
            </button>
          </form>
          <Link
            href={`/admin/hi-naesin/passages/${id}/analyze`}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 hover:bg-indigo-100"
          >
            지문 분석
          </Link>
          <Link
            href="/admin/hi-naesin/passages"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            목록으로
          </Link>
        </div>
      </header>

      {/* 탭 */}
      <nav className="flex gap-1 border-b">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/hi-naesin/passages/${id}/edit?tab=${t.key}`}
            className={[
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px',
              tab === t.key
                ? 'border-neutral-900 text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {/* ── 결과 배너 ── */}
      {ok === '2step' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✓ 기본 Drill 생성 완료 —
          빈칸 <strong>{fb ?? 0}</strong>개 · 단어 <strong>{v ?? 0}</strong>개
          {Number(v) === 0 && <span className="ml-2 text-xs text-emerald-600">(단어: 지문에 <code>* word: 뜻</code> 형식 주석 필요)</span>}
        </div>
      )}
      {ok === '3step' && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          ✓ AI 문법/연결어 Drill 생성 완료 — <strong>{g ?? 0}</strong>개
          {d && <span className="ml-2 text-xs text-violet-500 font-mono">[{decodeURIComponent(d)}]</span>}
          {Number(g) === 0 && <span className="ml-2 text-xs text-violet-600">(AI 응답 없음 — 잠시 후 재시도)</span>}
        </div>
      )}
      {ok === '4step' && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
          ✓ AI 생각단위 배열 Drill 생성 완료 —
          해석 배열 <strong>{ta ?? 0}</strong>개 · 작문 배열 <strong>{wa ?? 0}</strong>개 ·
          해석 3지선다 <strong>{tc ?? 0}</strong>개 · 자유해석 <strong>{t ?? 0}</strong>개 · 자유작문 <strong>{w ?? 0}</strong>개
          {Number(ta) === 0 && <span className="ml-2 text-xs text-sky-600">(AI 응답 없음 — 잠시 후 재시도)</span>}
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          ✗ 오류: {decodeURIComponent(err)}
        </div>
      )}

      {/* ── 탭: 지문 정보 ── */}
      {tab === 'passage' && (
        <form
          action={updateHiNaesinPassageAction.bind(null, id)}
          className="space-y-4 rounded-2xl border bg-white p-5"
        >
          <Field label="제목" name="title" defaultValue={passage.title ?? ''} />

          {/* ── 시험 범위 메타데이터 ── */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="col-span-2 text-xs font-semibold text-indigo-700">시험 범위 정보 (예상문제 생성기에서 필터로 사용)</p>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">학교명</label>
              <input
                name="school_name"
                defaultValue={passage.school_name ?? ''}
                placeholder="예: 한국고등학교"
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">학년</label>
              <select
                name="grade"
                defaultValue={passage.grade ?? ''}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">선택 안 함</option>
                <option value="H1">고1</option>
                <option value="H2">고2</option>
                <option value="H3">고3</option>
                <option value="M1">중1</option>
                <option value="M2">중2</option>
                <option value="M3">중3</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">연도</label>
              <input
                name="exam_year"
                type="number"
                defaultValue={passage.exam_year ?? new Date().getFullYear()}
                min={2020}
                max={2035}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-neutral-600">시험 시기</label>
              <select
                name="exam_month"
                defaultValue={String(passage.exam_month ?? '')}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">선택 안 함</option>
                <option value="4">1학기 중간 (4월)</option>
                <option value="7">1학기 기말 (7월)</option>
                <option value="10">2학기 중간 (10월)</option>
                <option value="12">2학기 기말 (12월)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">지문 원문 *</label>
            <textarea
              name="passage_text"
              required
              rows={10}
              defaultValue={passage.passage_text}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300 resize-y"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-600">전체 해석</label>
            <textarea
              name="translation_ko"
              rows={6}
              defaultValue={passage.translation_ko ?? ''}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300 resize-y"
            />
          </div>

          <Field
            label="토픽 태그 (쉼표 구분)"
            name="topic_tags"
            defaultValue={(passage.topic_tags ?? []).join(', ')}
          />

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-neutral-900 px-6 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              저장
            </button>
          </div>
        </form>
      )}

      {/* ── 탭: 문장 매칭 ── */}
      {tab === 'sentences' && (
        <div className="space-y-4">
          {/* 실행 버튼 */}
          <section className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4">
            <form action={generateSentencePairsAction.bind(null, id)}>
              <button
                type="submit"
                className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                1단계: 문장 분리 & 자동 매칭
              </button>
            </form>

            {sentences.length > 0 && (
              <form action={generateDrillsFromSentencesAction.bind(null, id)}>
                <button
                  type="submit"
                  className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  2단계: 해석/작문/빈칸/단어 생성
                </button>
              </form>
            )}

            {sentences.length > 0 && (
              <form action={generateGrammarDrillsAction.bind(null, id)}>
                <button
                  type="submit"
                  className="rounded-xl border border-violet-300 bg-violet-50 px-5 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                >
                  3단계: AI 문법/연결어 생성
                </button>
              </form>
            )}

            {sentences.length > 0 && (
              <form action={generateThoughtUnitDrillsAction.bind(null, id)}>
                <button
                  type="submit"
                  className="rounded-xl border border-sky-300 bg-sky-50 px-5 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                >
                  4단계: AI 생각단위 배열 생성
                </button>
              </form>
            )}

            {sentences.length > 0 && (
              <form action={generateStructureDrillsAction.bind(null, id)}>
                <button
                  type="submit"
                  className="rounded-xl border border-indigo-300 bg-indigo-50 px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  5단계: AI 구조분석(지칭추론) 생성
                </button>
              </form>
            )}

            {sentences.length > 0 && (
              <span className="text-xs text-neutral-500">
                {sentences.length}문장 매칭됨
              </span>
            )}
          </section>

          <p className="text-xs text-neutral-500 px-1">
            매칭이 틀린 경우 한국어 칸을 직접 수정하세요. 수정 후 2단계 실행하면 반영됩니다.
          </p>

          {/* 문장 쌍 목록 */}
          {sentences.length > 0 && (
            <section className="overflow-hidden rounded-2xl border bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-neutral-50 text-left">
                  <tr className="[&>th]:px-4 [&>th]:py-2 [&>th]:text-xs [&>th]:font-medium [&>th]:text-neutral-500">
                    <th className="w-6">#</th>
                    <th>영어</th>
                    <th>한국어</th>
                    <th className="w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {sentences.map((s) => (
                    <tr key={s.id} className="border-t align-top">
                      <td className="px-4 py-2 text-xs text-neutral-400">{s.order_index + 1}</td>
                      <td className="px-4 py-2">
                        <p className="text-sm text-neutral-800 leading-relaxed">{s.sentence_en}</p>
                      </td>
                      <td className="px-4 py-2">
                        <form action={updateSentencePairAction.bind(null, id, s.id)}>
                          <input type="hidden" name="sentence_en" value={s.sentence_en} />
                          <div className="flex gap-2">
                            <input
                              name="sentence_ko"
                              defaultValue={s.sentence_ko ?? ''}
                              placeholder="한국어 해석"
                              className="w-full rounded-lg border px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-neutral-300"
                            />
                            <button
                              type="submit"
                              className="shrink-0 rounded-lg border px-2 py-1 text-xs hover:bg-neutral-50"
                            >
                              저장
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {sentences.length === 0 && (
            <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-neutral-400">
              1단계 버튼을 눌러 문장을 분리하세요.
            </div>
          )}
        </div>
      )}

      {/* ── 탭: Drill ── */}
      {tab === 'drill' && (
        <div className="space-y-4">
          {/* 타입별 그룹 표시 */}
          {drills.length > 0 && <DrillGroupList drills={drills} passageId={id} />}

          {/* Drill 추가 */}
          <section className="rounded-2xl border bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900">Drill 추가</h2>
            <form action={addHiNaesinDrillAction.bind(null, id)} className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-600">Drill 종류</label>
                <select
                  name="drill_type"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                >
                  {HI_NAESIN_DRILL_TYPES.map((t) => (
                    <option key={t} value={t}>{drillTypeLabel(t)}</option>
                  ))}
                </select>
              </div>

              <DrillPayloadGuide />

              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-600">
                  Payload (JSON)
                </label>
                <textarea
                  name="payload_json"
                  rows={8}
                  placeholder='{"sentenceEn": "...", "answerKo": "..."}'
                  className="w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-neutral-300 resize-y"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                추가
              </button>
            </form>
          </section>
        </div>
      )}

      {/* ── 탭: 변형문제 ── */}
      {tab === 'variant' && (
        <div className="space-y-4">
          {/* 기존 변형문제 목록 */}
          {questions.map((q) => {
            const qChoices = (choicesByQuestion[q.id] ?? []).sort(
              (a, b) => a.order_index - b.order_index,
            );
            return (
              <div key={q.id} className="rounded-2xl border bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-900">
                      {variantTypeLabel(q.question_type as never)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${q.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {q.is_published ? '공개' : '비공개'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <form action={toggleVariantPublishAction.bind(null, id, q.id, q.is_published)}>
                      <button
                        type="submit"
                        className={`rounded-lg border px-3 py-1 text-xs ${q.is_published ? 'border-neutral-200 text-neutral-600 hover:bg-neutral-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}
                      >
                        {q.is_published ? '비공개로' : '공개'}
                      </button>
                    </form>
                    <form action={deleteHiNaesinVariantQuestionAction.bind(null, id, q.id)}>
                      <button
                        type="submit"
                        className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        삭제
                      </button>
                    </form>
                  </div>
                </div>

                <div className="text-xs text-neutral-500">
                  {q.stem ?? defaultStem(q.question_type as never)}
                </div>

                <pre className="overflow-x-auto rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700">
                  {JSON.stringify(q.payload, null, 2)}
                </pre>

                {/* 보기 입력 */}
                <form
                  action={saveHiNaesinVariantChoicesAction.bind(null, id, q.id)}
                  className="space-y-2 border-t pt-3"
                >
                  <div className="text-xs font-medium text-neutral-600">보기 (5지선다)</div>
                  {[1, 2, 3, 4, 5].map((i) => {
                    const existing = qChoices.find((c) => c.order_index === i);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="w-5 text-xs text-neutral-400">①②③④⑤'[i-1]</span>
                        <input
                          name={`choice_${i}`}
                          defaultValue={existing?.text ?? ''}
                          placeholder={`보기 ${i}`}
                          className="flex-1 rounded-xl border px-3 py-1.5 text-sm outline-none"
                        />
                        <label className="flex items-center gap-1 text-xs text-neutral-500">
                          <input
                            type="radio"
                            name="correct"
                            value={String(i)}
                            defaultChecked={existing?.is_correct ?? false}
                          />
                          정답
                        </label>
                      </div>
                    );
                  })}
                  <button
                    type="submit"
                    className="rounded-xl border px-4 py-1.5 text-xs hover:bg-neutral-50"
                  >
                    보기 저장
                  </button>
                </form>
              </div>
            );
          })}

          {/* 변형문제 추가 */}
          <section className="rounded-2xl border bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900">변형문제 추가</h2>
            <form
              action={addHiNaesinVariantQuestionAction.bind(null, id)}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-600">문제 종류</label>
                <select
                  name="question_type"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                >
                  {HI_NAESIN_VARIANT_TYPES.map((t) => (
                    <option key={t} value={t}>{variantTypeLabel(t)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-600">
                  지시문 (비워두면 기본값 사용)
                </label>
                <input
                  name="stem"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                />
              </div>

              <VariantPayloadGuide />

              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-600">
                  Payload (JSON)
                </label>
                <textarea
                  name="payload_json"
                  rows={8}
                  placeholder="{}"
                  className="w-full rounded-xl border px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-neutral-300 resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-neutral-600">해설 (선택)</label>
                <textarea
                  name="explanation"
                  rows={3}
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-y"
                />
              </div>

              <button
                type="submit"
                className="rounded-xl bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                추가
              </button>
            </form>
          </section>
        </div>
      )}

      {/* ── 탭: 배정 ── */}
      {tab === 'assign' && (
        <div className="space-y-5">

          {/* 현재 배정 목록 */}
          <section className="rounded-2xl border bg-white p-5 space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900">
              현재 배정 학생 ({assignments.length}명)
            </h2>
            {assignments.length === 0 ? (
              <p className="text-sm text-neutral-400">아직 배정된 학생이 없습니다.</p>
            ) : (
              <div className="divide-y rounded-xl border overflow-hidden">
                {assignments.map((a) => {
                  const stu = studentMap.get(a.student_id);
                  const typeLabel = a.assignment_type === 'drill' ? 'Drill' : a.assignment_type === 'variant' ? '변형문제' : 'Full';
                  const statusColor =
                    a.status === 'submitted' ? 'text-emerald-600' :
                    a.status === 'started'   ? 'text-amber-600' :
                    'text-neutral-500';
                  const isDrill = a.assignment_type === 'drill' || a.assignment_type === 'full';
                  const enabledTypes = a.enabled_drill_types; // null = 전체
                  const ALL_DRILL_TYPES = [
                    { key: 'vocab',          label: '단어' },
                    { key: 'translation',    label: '해석' },
                    { key: 'fill_blank',     label: '빈칸' },
                    { key: 'writing',        label: '작문' },
                    { key: 'grammar_choice', label: '문법' },
                  ] as const;
                  return (
                    <div key={a.id} className="px-4 py-3 hover:bg-neutral-50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-800 truncate">
                            {stu?.full_name ?? stu?.email ?? a.student_id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-neutral-400">
                            {typeLabel} · <span className={statusColor}>{a.status}</span>
                            {a.due_at && ` · 마감 ${new Date(a.due_at).toLocaleDateString('ko-KR')}`}
                          </p>
                          {a.note && <p className="text-xs text-neutral-400 truncate">{a.note}</p>}
                        </div>
                        <form action={removeAssignmentAction.bind(null, id, a.id)}>
                          <button
                            type="submit"
                            className="ml-4 shrink-0 rounded-lg border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50"
                          >
                            취소
                          </button>
                        </form>
                      </div>

                      {/* Drill 타입 토글 */}
                      {isDrill && (
                        <div className="flex flex-wrap gap-1.5 pl-0.5">
                          {ALL_DRILL_TYPES.map(({ key, label }) => {
                            const isOn = enabledTypes === null || enabledTypes.includes(key);
                            // 켜기: null이면 해당 타입 제외한 나머지로 변경 / 배열이면 추가
                            const nextOn = enabledTypes === null
                              ? ALL_DRILL_TYPES.map(t => t.key).filter(k => k !== key)  // 나머지 전부 켜고 이것만 끄기
                              : enabledTypes.filter(k => k !== key);                     // 목록에서 제거
                            const nextOff = enabledTypes === null
                              ? null                                                       // 이미 전체 켜짐
                              : [...enabledTypes, key];                                   // 목록에 추가
                            const nextTypes = isOn ? nextOn : nextOff;
                            // nextTypes가 전체와 같으면 null로 정규화
                            const allKeys = ALL_DRILL_TYPES.map(t => t.key);
                            const normalized = (nextTypes !== null && allKeys.every(k => nextTypes.includes(k)))
                              ? null : nextTypes;
                            return (
                              <form
                                key={key}
                                action={updateEnabledDrillTypesAction.bind(null, id, a.id, normalized)}
                              >
                                <button
                                  type="submit"
                                  className={[
                                    'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                                    isOn
                                      ? 'border-neutral-900 bg-neutral-900 text-white'
                                      : 'border-neutral-300 bg-white text-neutral-400 line-through',
                                  ].join(' ')}
                                >
                                  {label}
                                </button>
                              </form>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 새 배정 */}
          <section className="rounded-2xl border bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-neutral-900">학생 배정</h2>
            {students.length === 0 ? (
              <p className="text-sm text-neutral-400">등록된 학생이 없습니다.</p>
            ) : (
              <form action={assignPassageAction.bind(null, id)} className="space-y-4">
                {/* 학생 목록 */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-600">학생 선택 (복수 가능)</label>
                  <div className="max-h-52 overflow-y-auto rounded-xl border divide-y">
                    {students.map((s) => {
                      const alreadyAssigned = assignments.some((a) => a.student_id === s.id);
                      return (
                        <label key={s.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-neutral-50 select-none">
                          <input type="checkbox" name="student_ids" value={s.id} defaultChecked={alreadyAssigned} className="rounded" />
                          <span className="flex-1 text-sm text-neutral-800">
                            {s.full_name ?? s.email ?? s.id.slice(0, 8)}
                          </span>
                          {alreadyAssigned && (
                            <span className="text-xs text-emerald-600">배정됨</span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* 타입 */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-neutral-600">유형</label>
                    <select name="assignment_type" className="w-full rounded-xl border px-3 py-2 text-sm outline-none">
                      <option value="full">Full (Drill + 변형)</option>
                      <option value="drill">Drill만</option>
                      <option value="variant">변형문제만</option>
                    </select>
                  </div>

                  {/* 마감일 */}
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-neutral-600">마감일 (선택)</label>
                    <input
                      type="date"
                      name="due_at"
                      className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                    />
                  </div>
                </div>

                {/* 메모 */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-600">메모 (선택)</label>
                  <input
                    name="note"
                    placeholder="예: 3단원 복습, 시험 전 필수"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-neutral-900 px-6 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  배정
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}

function Field({
  label, name, defaultValue, placeholder,
}: {
  label: string; name: string; defaultValue?: string; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-neutral-600">{label}</label>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300"
      />
    </div>
  );
}

// ── 드릴 타입별 그룹 목록 ────────────────────────────────────────────────

const DRILL_TYPE_ORDER = [
  'vocab', 'translation_arrange', 'translation', 'translation_choice',
  'fill_blank', 'writing_arrange', 'writing', 'grammar_choice', 'summary',
] as const;

function DrillGroupList({
  drills,
  passageId,
}: {
  drills: HiNaesinDrillRow[];
  passageId: string;
}) {
  const grouped: Record<string, HiNaesinDrillRow[]> = {};
  for (const d of drills) {
    if (!grouped[d.drill_type]) grouped[d.drill_type] = [];
    grouped[d.drill_type].push(d);
  }

  const typesWithDrills = DRILL_TYPE_ORDER.filter((t) => (grouped[t]?.length ?? 0) > 0);
  // 알려지지 않은 타입도 표시
  const extraTypes = Object.keys(grouped).filter((t) => !DRILL_TYPE_ORDER.includes(t as never));

  return (
    <>
      {[...typesWithDrills, ...extraTypes].map((t) => (
        <section key={t}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
            {drillTypeLabel(t as never)} ({grouped[t].length})
          </h3>
          <div className="space-y-2">
            {grouped[t].map((drill) => (
              <div key={drill.id} className="rounded-2xl border bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <DrillPreview drill={drill} />
                  <form
                    action={deleteHiNaesinDrillAction.bind(null, passageId, drill.id)}
                    className="shrink-0"
                  >
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function DrillPayloadGuide() {
  return (
    <details className="rounded-xl border bg-neutral-50 p-3 text-xs text-neutral-600">
      <summary className="cursor-pointer font-medium">Payload 형식 가이드</summary>
      <div className="mt-2 space-y-2 font-mono">
        <div><strong className="font-sans">해석:</strong> {`{"sentenceEn":"...","answerKo":"..."}`}</div>
        <div><strong className="font-sans">해석 배열:</strong> {`{"sentenceEn":"...","chunks":[{"id":"k0","ko":"..."},{"id":"k1","ko":"..."}]}`}</div>
        <div><strong className="font-sans">작문 배열:</strong> {`{"koPrompt":"...","chunks":[{"id":"k0","en":"..."},{"id":"k1","en":"..."}]}`}</div>
        <div><strong className="font-sans">해석 3지선다:</strong> {`{"sentenceEn":"...","options":[{"key":"a","text":"..."},{"key":"b","text":"..."},{"key":"c","text":"..."}],"correct":"a","explanation":"..."}`}</div>
        <div><strong className="font-sans">빈칸 넣기:</strong> {`{"sentenceTemplate":"The ____ fox","answer":"quick","sentenceKo":"..."}`}</div>
        <div><strong className="font-sans">작문:</strong> {`{"koPrompt":"...","answerEn":"...","hintWords":["word"],"grammarHints":["관계절"],"wordCount":10}`}</div>
        <div><strong className="font-sans">문법 고르기:</strong> {`{"sentenceTemplate":"She ____ daily.","optionA":"go","optionB":"goes","optionC":"went","optionD":"going","correct":"b","explanation":"설명","grammarCategory":"수 일치"}`}</div>
        <div><strong className="font-sans">연결어:</strong> {`{"sentenceTemplate":"____, results improved.","optionA":"However","optionB":"Therefore","optionC":"Moreover","optionD":"For example","correct":"b","grammarCategory":"연결어","contextBefore":"앞 문장"}`}</div>
      </div>
    </details>
  );
}

// ── 드릴 미리보기 (타입별) ──────────────────────────────────

function DrillPreview({ drill }: { drill: { drill_type: string; order_index: number; payload: Record<string, unknown> } }) {
  const p = drill.payload;
  const idx = <span className="text-[10px] text-neutral-400 shrink-0">#{drill.order_index}</span>;

  if (drill.drill_type === 'vocab') {
    return (
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2">
          {idx}
          {p.isExpression && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">표현</span>
          )}
        </div>
        <p className="text-sm font-semibold text-neutral-800">{String(p.word ?? '')}</p>
        <p className="text-xs text-blue-600">{String(p.meaningKo ?? '')}</p>
        {p.exampleSentence && (
          <p className="text-xs italic text-neutral-400">{String(p.exampleSentence)}</p>
        )}
      </div>
    );
  }

  if (drill.drill_type === 'translation') {
    return (
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2">{idx}</div>
        <p className="text-sm text-neutral-800">{String(p.sentenceEn ?? '')}</p>
        <p className="text-xs text-neutral-500">→ {String(p.answerKo ?? '')}</p>
      </div>
    );
  }

  if (drill.drill_type === 'fill_blank') {
    return (
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2">{idx}</div>
        <p className="text-sm text-neutral-800">{String(p.sentenceTemplate ?? '')}</p>
        <p className="text-xs font-semibold text-emerald-600">정답: {String(p.answer ?? '')}</p>
        {p.sentenceKo && <p className="text-xs text-blue-500">{String(p.sentenceKo)}</p>}
      </div>
    );
  }

  if (drill.drill_type === 'writing') {
    return (
      <div className="flex-1 space-y-1 min-w-0">
        <div className="flex items-center gap-2">{idx}</div>
        <p className="text-sm text-neutral-600">{String(p.koPrompt ?? '')}</p>
        <p className="text-xs text-emerald-700">→ {String(p.answerEn ?? '')}</p>
        {Array.isArray(p.hintWords) && p.hintWords.length > 0 && (
          <p className="text-xs text-blue-500">힌트: {(p.hintWords as string[]).join(', ')}</p>
        )}
        {Array.isArray(p.grammarHints) && p.grammarHints.length > 0 && (
          <p className="text-xs text-violet-500">문법: {(p.grammarHints as string[]).join(' / ')}</p>
        )}
      </div>
    );
  }

  if (drill.drill_type === 'translation_arrange' || drill.drill_type === 'writing_arrange') {
    const chunks = Array.isArray(p.chunks) ? (p.chunks as Array<{ text?: string; ko?: string; en?: string }>) : [];
    const source = drill.drill_type === 'translation_arrange' ? String(p.sentenceEn ?? '') : String(p.koPrompt ?? '');
    return (
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">{idx}</div>
        <p className="text-sm text-neutral-800">{source}</p>
        <div className="flex flex-wrap gap-1">
          {chunks.map((c, i) => (
            <span key={i} className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-700">
              {String(c.ko ?? c.en ?? '')}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (drill.drill_type === 'translation_choice') {
    const opts = Array.isArray(p.options) ? (p.options as Array<{ key: string; text: string }>) : [];
    const correctKey = String(p.correct ?? '');
    return (
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">{idx}</div>
        <p className="text-sm font-medium text-neutral-800">{String(p.sentenceEn ?? '')}</p>
        <div className="space-y-1">
          {opts.map((o) => (
            <p key={o.key} className={[
              'rounded-lg border px-2 py-1 text-xs',
              o.key === correctKey
                ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-700'
                : 'border-neutral-200 text-neutral-600',
            ].join(' ')}>
              {o.key.toUpperCase()}. {o.text}
            </p>
          ))}
        </div>
        {p.explanation && <p className="text-xs text-neutral-400">{String(p.explanation)}</p>}
      </div>
    );
  }

  if (drill.drill_type === 'grammar_choice') {
    const opts = [
      { k: 'A', v: p.optionA }, { k: 'B', v: p.optionB },
      { k: 'C', v: p.optionC }, { k: 'D', v: p.optionD },
    ].filter(o => o.v);
    const correctKey = String(p.correct ?? '').toUpperCase();
    return (
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          {idx}
          {p.grammarCategory && (
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              {String(p.grammarCategory)}
            </span>
          )}
        </div>
        {p.contextBefore && (
          <p className="text-xs italic text-neutral-400">{String(p.contextBefore)}</p>
        )}
        <p className="text-sm font-medium text-neutral-800">{String(p.sentenceTemplate ?? '')}</p>
        <div className="grid grid-cols-2 gap-1">
          {opts.map(o => (
            <span key={o.k} className={[
              'rounded-lg border px-2 py-1 text-xs',
              o.k === correctKey
                ? 'border-emerald-300 bg-emerald-50 font-semibold text-emerald-700'
                : 'border-neutral-200 text-neutral-600',
            ].join(' ')}>
              {o.k}. {String(o.v)}
            </span>
          ))}
        </div>
        {p.explanation && (
          <p className="text-xs text-neutral-400">{String(p.explanation)}</p>
        )}
      </div>
    );
  }

  if (drill.drill_type === 'identify_categorize') {
    const targets = Array.isArray(p.targets) ? (p.targets as Array<Record<string, unknown>>) : [];
    const modeLabel = p.mode === 'reference' ? '지칭추론' : p.mode === 'modifier' ? '수식관계' : '청킹';
    return (
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2">
          {idx}
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            {modeLabel} · depth {String(p.depth ?? 1)}
          </span>
        </div>
        <p className="text-sm font-medium text-neutral-800">{String(p.sentence ?? '')}</p>
        {targets.map((t, i) => (
          <div key={i} className="rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-600">
            {t.anchor ? <span className="text-neutral-400">“{String(t.anchor)}” → </span> : null}
            <span className="font-semibold text-emerald-700">{String(t.span ?? '')}</span>
            {t.category ? <span className="ml-1 text-indigo-600">[{String(t.category)}]</span> : null}
          </div>
        ))}
      </div>
    );
  }

  // fallback
  return (
    <pre className="flex-1 overflow-x-auto rounded-lg bg-neutral-50 p-2 text-xs text-neutral-600 min-w-0">
      {JSON.stringify(p, null, 2)}
    </pre>
  );
}

function VariantPayloadGuide() {
  return (
    <details className="rounded-xl border bg-neutral-50 p-3 text-xs text-neutral-600">
      <summary className="cursor-pointer font-medium">Payload 형식 가이드</summary>
      <div className="mt-2 space-y-2">
        <div><strong>지문 배열:</strong> {`{"fixedSegment":{"text":"..."},"segments":[{"id":"A","text":"..."},{"id":"B","text":"..."},{"id":"C","text":"..."}],"correctOrder":["B","A","C"]}`}</div>
        <div><strong>빈칸 추론(단어/문장):</strong> {`{"markedPassage": "The ____ of the story..."}`}</div>
        <div><strong>어울리지 않는 문장:</strong> {`{"numberedPassage": "① ... ② ... ③ ...", "irrelevantIndex": 3}`}</div>
        <div><strong>요약 빈칸:</strong> {`{"summaryTemplate": "A (A) animal...", "blankLabels": ["(A)","(B)"]}`}</div>
        <div><strong>Fact / Negative Fact:</strong> {`{}`} (보기만 입력)</div>
      </div>
    </details>
  );
}
