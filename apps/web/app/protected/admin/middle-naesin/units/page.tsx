import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { gradeLabel, contentTypeLabel, contentTypeColor } from '@/models/middle-naesin';
import { toggleUnitPublishedAction } from '../actions';
import type { MiddleNaesinUnit } from '@/models/middle-naesin';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ grade?: string; publisher?: string; q?: string }>;

export default async function MiddleNaesinUnitsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await getServerSupabase();

  let query = supabase
    .from('middle_naesin_units')
    .select('*, middle_naesin_contents(id, content_type)')
    .order('grade')
    .order('publisher')
    .order('semester')
    .order('lesson_number');

  if (sp.grade)     query = query.eq('grade', sp.grade);
  if (sp.publisher) query = query.ilike('publisher', `%${sp.publisher}%`);

  const { data, error } = await query;
  if (error) return <div className="p-8 text-red-600">{error.message}</div>;

  const units = (data ?? []) as (MiddleNaesinUnit & { middle_naesin_contents: { id: string; content_type: string }[] })[];

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">Admin / 중학내신</div>
          <h1 className="text-2xl font-semibold text-neutral-900">단원 관리</h1>
        </div>
        <Link
          href="/admin/middle-naesin/units/new"
          className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 self-start"
        >
          + 단원 추가
        </Link>
      </header>

      {/* 필터 */}
      <section className="rounded-2xl border bg-white p-4">
        <form className="flex flex-wrap gap-3">
          <select name="grade" defaultValue={sp.grade ?? ''} className="rounded-xl border px-3 py-2 text-sm outline-none">
            <option value="">전체 학년</option>
            <option value="M1">중1</option>
            <option value="M2">중2</option>
            <option value="M3">중3</option>
          </select>
          <input name="publisher" defaultValue={sp.publisher ?? ''} placeholder="출판사 검색" className="rounded-xl border px-3 py-2 text-sm outline-none" />
          <button type="submit" className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50">적용</button>
        </form>
      </section>

      {units.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          등록된 단원이 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-500 border-b">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th>교과서 / 단원</th>
                <th>학년·학기</th>
                <th>콘텐츠</th>
                <th>공개</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => {
                const types = [...new Set(unit.middle_naesin_contents.map((c) => c.content_type))];
                return (
                  <tr key={unit.id} className="border-t hover:bg-neutral-50/40 [&>td]:px-4 [&>td]:py-3">
                    <td>
                      <div className="font-medium text-neutral-900">
                        {unit.publisher}
                        {unit.lesson_number != null && ` · Lesson ${unit.lesson_number}`}
                      </div>
                      {unit.lesson_title && (
                        <div className="mt-0.5 text-xs text-neutral-400">{unit.lesson_title}</div>
                      )}
                      {unit.school_name && (
                        <div className="mt-0.5 text-xs text-neutral-300">{unit.school_name}</div>
                      )}
                    </td>
                    <td className="text-xs text-neutral-500">
                      {gradeLabel(unit.grade)} · {unit.semester}학기
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {types.length === 0 ? (
                          <span className="text-xs text-neutral-300">없음</span>
                        ) : types.map((t) => (
                          <span key={t} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${contentTypeColor(t as never)}`}>
                            {contentTypeLabel(t as never)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <form action={toggleUnitPublishedAction}>
                        <input type="hidden" name="id" value={unit.id} />
                        <input type="hidden" name="is_published" value={String(!unit.is_published)} />
                        <button type="submit" className={[
                          'rounded-full border px-3 py-1 text-xs',
                          unit.is_published
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-500',
                        ].join(' ')}>
                          {unit.is_published ? '공개' : '비공개'}
                        </button>
                      </form>
                    </td>
                    <td>
                      <Link
                        href={`/admin/middle-naesin/units/${unit.id}`}
                        className="rounded-lg border px-3 py-1 text-xs hover:bg-neutral-50"
                      >
                        편집
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
