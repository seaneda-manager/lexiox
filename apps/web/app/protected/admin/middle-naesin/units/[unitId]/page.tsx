import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import {
  gradeLabel,
  contentTypeLabel,
  contentTypeColor,
  MIDDLE_NAESIN_CONTENT_TYPES,
} from '@/models/middle-naesin';
import type { MiddleNaesinUnit, MiddleNaesinContent } from '@/models/middle-naesin';
import { upsertContentAction } from '../../actions';
import { assignUnitAction, removeAssignmentAction } from './assign-actions';
import { DeleteContentButton } from './_components/DeleteContentButton';

export const dynamic = 'force-dynamic';

type Assignment = {
  id: string;
  student_id: string;
  due_at: string | null;
  note: string | null;
  assigned_at: string;
};

type Student = { id: string; full_name: string | null; email: string | null };

export default async function UnitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { unitId } = await params;
  const { tab = 'content' } = await searchParams;
  const supabase = await getServerSupabase();

  const [
    { data: unit, error: unitErr },
    { data: contents },
    { data: assignmentsData },
    { data: studentsData },
  ] = await Promise.all([
    supabase.from('middle_naesin_units').select('*').eq('id', unitId).single(),
    supabase
      .from('middle_naesin_contents')
      .select('*')
      .eq('unit_id', unitId)
      .order('sort_order')
      .order('content_type'),
    supabase
      .from('middle_naesin_assignments')
      .select('id, student_id, due_at, note, assigned_at')
      .eq('unit_id', unitId)
      .order('assigned_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email').eq('role', 'student').order('full_name'),
  ]);

  if (unitErr || !unit) return <div className="p-8 text-red-600">단원을 찾을 수 없습니다.</div>;

  const u = unit as MiddleNaesinUnit;
  const items = (contents ?? []) as MiddleNaesinContent[];
  const assignments = (assignmentsData ?? []) as Assignment[];
  const students = (studentsData ?? []) as Student[];
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const existingTypes = new Set(items.map((c) => c.content_type));

  const tabs = [
    { key: 'content', label: '콘텐츠' },
    { key: 'assign',  label: `배정 (${assignments.length})` },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      {/* 단원 헤더 */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">중학내신 / 단원</div>
          <h1 className="mt-1 text-xl font-semibold text-neutral-900">
            {u.publisher} · {gradeLabel(u.grade)} {u.semester}학기
            {u.lesson_number != null && ` · Lesson ${u.lesson_number}`}
          </h1>
          {u.lesson_title && <p className="mt-0.5 text-sm text-neutral-500">"{u.lesson_title}"</p>}
          {u.school_name && <p className="text-xs text-neutral-400">{u.school_name}</p>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/admin/middle-naesin/units/${unitId}/edit`}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            단원 수정
          </Link>
          <Link
            href={`/admin/middle-naesin/units/${unitId}/preview`}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            미리보기
          </Link>
          <Link
            href={`/admin/middle-naesin/units/${unitId}/drill`}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            드릴 →
          </Link>
        </div>
      </header>

      {/* 탭 */}
      <nav className="flex gap-1 border-b">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/middle-naesin/units/${unitId}?tab=${t.key}`}
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

      {/* ── 탭: 콘텐츠 ── */}
      {tab === 'content' && (
      <div className="space-y-6">
        {MIDDLE_NAESIN_CONTENT_TYPES.map((type) => {
          const typeItems = items.filter((c) => c.content_type === type);
          const colorClass = contentTypeColor(type);

          return (
            <section key={type} className="rounded-2xl border bg-white overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b bg-neutral-50 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}>
                    {contentTypeLabel(type)}
                  </span>
                  <span className="text-xs text-neutral-400">{typeItems.length}개</span>
                </div>
              </div>

              {/* 기존 콘텐츠 */}
              {typeItems.map((item) => (
                <div key={item.id} className="border-b px-5 py-4 space-y-2">
                  {item.title && (
                    <div className="text-sm font-medium text-neutral-800">{item.title}</div>
                  )}
                  {item.body_text && (
                    <pre className="whitespace-pre-wrap text-sm text-neutral-700 font-sans leading-relaxed">
                      {item.body_text}
                    </pre>
                  )}
                  {item.translation_ko && (
                    <p className="text-xs text-neutral-400 leading-relaxed">{item.translation_ko}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Link
                      href={`/admin/middle-naesin/units/${unitId}/contents/${item.id}/edit`}
                      className="rounded-lg border px-3 py-1 text-xs hover:bg-neutral-50"
                    >
                      수정
                    </Link>
                    <DeleteContentButton id={item.id} unitId={unitId} />
                  </div>
                </div>
              ))}

              {/* 콘텐츠 추가 폼 */}
              <ContentAddForm unitId={unitId} contentType={type} />
            </section>
          );
        })}
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
                  return (
                    <div key={a.id} className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-800 truncate">
                          {stu?.full_name ?? stu?.email ?? a.student_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {a.due_at && `마감 ${new Date(a.due_at).toLocaleDateString('ko-KR')}`}
                          {a.note && ` · ${a.note}`}
                        </p>
                      </div>
                      <form action={removeAssignmentAction.bind(null, unitId, a.id)}>
                        <button
                          type="submit"
                          className="ml-4 shrink-0 rounded-lg border border-red-200 px-3 py-1 text-xs text-red-500 hover:bg-red-50"
                        >
                          취소
                        </button>
                      </form>
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
              <form action={assignUnitAction.bind(null, unitId)} className="space-y-4">
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

                <div className="space-y-1">
                  <label className="block text-xs font-medium text-neutral-600">마감일 (선택)</label>
                  <input
                    type="date"
                    name="due_at"
                    className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
                  />
                </div>

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

function ContentAddForm({ unitId, contentType }: { unitId: string; contentType: string }) {
  const isVocab = contentType === 'vocab_en_en';
  const isPastExam = contentType === 'past_exam';

  return (
    <form action={upsertContentAction} className="px-5 py-4 space-y-3 bg-neutral-50/50">
      <input type="hidden" name="unit_id" value={unitId} />
      <input type="hidden" name="content_type" value={contentType} />
      <input type="hidden" name="sort_order" value="0" />

      <div className="space-y-1">
        <label className="block text-xs font-medium text-neutral-500">제목 (선택)</label>
        <input
          name="title"
          placeholder={
            contentType === 'main_text'    ? '예: Story 1' :
            contentType === 'dialogue'     ? '예: Scene A' :
            contentType === 'more_reading' ? '예: Reading Plus' :
            contentType === 'vocab_en_en'  ? '예: Unit 3 Vocabulary' :
            '예: 2024년 1학기 기말'
          }
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 bg-white"
        />
      </div>

      {!isVocab && !isPastExam && (
        <>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">
              {contentType === 'main_text' || contentType === 'dialogue' ? '지문 원문 *' : 'More Reading 지문 *'}
            </label>
            <textarea
              name="body_text"
              rows={8}
              placeholder="영어 지문을 붙여넣으세요."
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 bg-white resize-y font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">전체 해석 (선택)</label>
            <textarea
              name="translation_ko"
              rows={4}
              placeholder="한국어 해석 (없으면 비워도 됩니다)"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 bg-white resize-y"
            />
          </div>
        </>
      )}

      {isVocab && (
        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-500">
            영영 단어 목록 (한 줄에 하나: word | definition | example)
          </label>
          <textarea
            name="body_text"
            rows={8}
            placeholder={"curious | eager to know or learn something | She was curious about the new student.\nfrightened | feeling fear | He was frightened by the loud noise."}
            className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 bg-white resize-y font-mono"
          />
        </div>
      )}

      {isPastExam && (
        <>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">기출 지문/내용</label>
            <textarea
              name="body_text"
              rows={6}
              placeholder="기출 지문 또는 문제 내용을 입력하세요."
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 bg-white resize-y font-mono"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-500">해설 / 풀이</label>
            <textarea
              name="translation_ko"
              rows={4}
              placeholder="문제 풀이 및 해설을 입력하세요."
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-200 bg-white resize-y"
            />
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="rounded-xl bg-neutral-800 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
        >
          + 추가
        </button>
      </div>
    </form>
  );
}
