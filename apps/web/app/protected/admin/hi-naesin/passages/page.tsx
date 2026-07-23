import React from 'react';
import Link from 'next/link';
import { getServerSupabase } from '@/lib/supabase/server';
import { toggleHiNaesinPassagePublishedAction, bulkUpdateSchoolByTitleKeywordAction } from './actions';
import { sourceTypeLabel, gradeLabel } from '@/models/hi-naesin';
import type { HiNaesinPassageRow } from '@/models/hi-naesin';
import BulkMetaPanel from './_components/BulkMetaPanel';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{
  source_type?: string;
  grade?: string;
  q?: string;
  bulk?: string;
  tab?: string;
}>;

export default async function HiNaesinPassageListPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tab = sp.tab ?? 'list';
  const supabase = await getServerSupabase();

  let query = supabase
    .from('hi_naesin_passages')
    .select(
      'id, source_type, grade, exam_year, exam_month, question_number, school_name, textbook_name, unit_label, book_name, book_unit, title, passage_text, translation_ko, word_count, topic_tags, is_published, created_at, updated_at',
    )
    .order('updated_at', { ascending: false });

  if (sp.source_type) query = query.eq('source_type', sp.source_type);
  if (sp.grade) query = query.eq('grade', sp.grade);
  if (sp.q) query = query.ilike('title', `%${sp.q}%`);

  const { data, error } = await query;

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          불러오기 실패: {error.message}
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as HiNaesinPassageRow[];
  const bulkCount = sp.bulk ? Number(sp.bulk) : null;

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500">
            Admin / 고등내신
          </div>
          <h1 className="text-2xl font-semibold text-neutral-900">지문 관리</h1>
          <p className="mt-1 text-sm text-neutral-500">
            고등 내신 지문 라이브러리 — 모의고사 · 교과서 · 외부교재
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <Link
            href="/admin/hi-naesin/passages?tab=bulk"
            className={`rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50 ${tab === 'bulk' ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : ''}`}
          >
            📋 일괄 메타 편집
          </Link>
          <Link
            href="/admin/hi-naesin/passages/bulk-new"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            챕터 일괄 등록
          </Link>
          <Link
            href="/admin/hi-naesin/passages/new"
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            새 지문 추가
          </Link>
        </div>
      </header>

      {/* 빠른 일괄 학교 설정 */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold text-amber-700 mb-2">빠른 학교 일괄 설정 — 제목 키워드 기준</p>
        <form
          action={async (fd: FormData) => {
            'use server';
            const keyword = (fd.get('keyword') as string)?.trim();
            const school = (fd.get('school') as string)?.trim();
            if (keyword && school) await bulkUpdateSchoolByTitleKeywordAction(keyword, school);
          }}
          className="flex flex-wrap gap-2 items-end"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs text-amber-700">제목 키워드</label>
            <input name="keyword" defaultValue="수능스타트" className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm outline-none w-36" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-amber-700">학교명</label>
            <input name="school" defaultValue="신송고등학교" className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm outline-none w-36" />
          </div>
          <button type="submit" className="rounded-lg bg-amber-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-amber-700">
            일괄 적용
          </button>
        </form>
      </section>

      {bulkCount !== null && bulkCount > 0 && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800">
          ✓ 지문 {bulkCount}개가 등록됐습니다. 각 지문을 클릭해서 Drill을 추가하세요.
        </div>
      )}

      {/* 필터 */}
      <section className="rounded-2xl border bg-white p-4">
        <form className="flex flex-wrap gap-3">
          <input
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="제목 검색"
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          />
          <select
            name="source_type"
            defaultValue={sp.source_type ?? ''}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 출처</option>
            <option value="mock_exam">모의고사</option>
            <option value="textbook">교과서</option>
            <option value="external_book">외부교재</option>
          </select>
          <select
            name="grade"
            defaultValue={sp.grade ?? ''}
            className="rounded-xl border px-3 py-2 text-sm outline-none"
          >
            <option value="">전체 학년</option>
            <option value="M1">중1</option>
            <option value="M2">중2</option>
            <option value="M3">중3</option>
            <option value="H1">고1</option>
            <option value="H2">고2</option>
            <option value="H3">고3</option>
          </select>
          <button
            type="submit"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-neutral-50"
          >
            적용
          </button>
        </form>
      </section>

      {/* 일괄 메타 편집 탭 */}
      {tab === 'bulk' && (
        <BulkMetaPanel passages={rows.map((r) => ({
          id: r.id,
          title: r.title,
          grade: r.grade,
          school_name: r.school_name ?? null,
          exam_year: r.exam_year ?? null,
          exam_month: r.exam_month ?? null,
        }))} />
      )}

      {/* 목록 — 출처별 그룹 */}
      {tab !== 'bulk' && rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-neutral-400">
          등록된 지문이 없습니다.
        </div>
      ) : tab !== 'bulk' ? (
        <div className="space-y-6">
          {(['mock_exam', 'textbook', 'external_book'] as const)
            .map((src) => ({
              src,
              items: rows.filter((r) => r.source_type === src),
            }))
            .filter(({ items }) => items.length > 0)
            .map(({ src, items }) => {
              const srcBadge =
                src === 'mock_exam'
                  ? 'border-sky-200 bg-sky-50 text-sky-700'
                  : src === 'textbook'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-violet-200 bg-violet-50 text-violet-700';

              // 교과서/외부교재는 교재명으로 한 번 더 그룹핑
              const subGroups: { label: string; items: HiNaesinPassageRow[] }[] = [];
              if (src === 'mock_exam') {
                // 연도+월로 그룹
                const map = new Map<string, HiNaesinPassageRow[]>();
                for (const r of items) {
                  const key = [r.exam_year, r.exam_month ? `${r.exam_month}월` : null]
                    .filter(Boolean).join(' ') || '기타';
                  if (!map.has(key)) map.set(key, []);
                  map.get(key)!.push(r);
                }
                for (const [label, groupItems] of map) {
                  subGroups.push({ label, items: groupItems });
                }
              } else if (src === 'textbook') {
                const map = new Map<string, HiNaesinPassageRow[]>();
                for (const r of items) {
                  const key = [r.textbook_name, r.unit_label].filter(Boolean).join(' / ') || '기타';
                  if (!map.has(key)) map.set(key, []);
                  map.get(key)!.push(r);
                }
                for (const [label, groupItems] of map) {
                  subGroups.push({ label, items: groupItems });
                }
              } else {
                const map = new Map<string, HiNaesinPassageRow[]>();
                for (const r of items) {
                  const key = [r.book_name, r.book_unit].filter(Boolean).join(' / ') || '기타';
                  if (!map.has(key)) map.set(key, []);
                  map.get(key)!.push(r);
                }
                for (const [label, groupItems] of map) {
                  subGroups.push({ label, items: groupItems });
                }
              }

              return (
                <section key={src} className="overflow-hidden rounded-2xl border bg-white">
                  {/* 출처 헤더 */}
                  <div className="flex items-center gap-2 border-b bg-neutral-50 px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${srcBadge}`}>
                      {sourceTypeLabel(src)}
                    </span>
                    <span className="text-sm text-neutral-400">{items.length}개 지문</span>
                  </div>

                  <table className="min-w-full text-sm">
                    <thead className="bg-neutral-50/50 text-left text-neutral-500">
                      <tr className="[&>th]:px-4 [&>th]:py-2 border-b">
                        <th>제목 / 정보</th>
                        <th>학년</th>
                        <th>공개</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {subGroups.map(({ label, items: groupItems }) => (
                        <React.Fragment key={label}>
                          {/* 서브 그룹 헤더 (교재명/연도) */}
                          {subGroups.length > 1 && (
                            <tr key={`sub-${label}`} className="bg-neutral-50/60 border-t">
                              <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-neutral-500">
                                {label}
                              </td>
                            </tr>
                          )}
                          {groupItems.map((row) => {
                            const hint = buildHint(row);
                            return (
                              <tr key={row.id} className="border-t hover:bg-neutral-50/40 [&>td]:px-4 [&>td]:py-3">
                                <td>
                                  <div className="font-medium text-neutral-900">
                                    {row.title ?? hint}
                                  </div>
                                  {row.title && (
                                    <div className="mt-0.5 text-xs text-neutral-400">{hint}</div>
                                  )}
                                </td>
                                <td className="text-xs text-neutral-500">
                                  {gradeLabel(row.grade as never)}
                                </td>
                                <td>
                                  <form action={toggleHiNaesinPassagePublishedAction}>
                                    <input type="hidden" name="id" value={row.id} />
                                    <input type="hidden" name="is_published" value={String(!row.is_published)} />
                                    <button
                                      type="submit"
                                      className={[
                                        'rounded-full border px-3 py-1 text-xs',
                                        row.is_published
                                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                          : 'border-neutral-200 bg-neutral-50 text-neutral-500',
                                      ].join(' ')}
                                    >
                                      {row.is_published ? '공개' : '비공개'}
                                    </button>
                                  </form>
                                </td>
                                <td>
                                  <Link
                                    href={`/admin/hi-naesin/passages/${row.id}/edit`}
                                    className="rounded-lg border px-3 py-1 text-xs hover:bg-neutral-50"
                                  >
                                    편집
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
        </div>
      ) : null}
    </main>
  );
}

function buildHint(row: HiNaesinPassageRow): string {
  if (row.source_type === 'mock_exam') {
    const parts = [
      row.exam_year,
      row.exam_month ? `${row.exam_month}월` : null,
      row.question_number ? `${row.question_number}번` : null,
    ].filter(Boolean);
    return parts.join(' ') || '모의고사';
  }
  if (row.source_type === 'textbook') {
    return [row.school_name, row.textbook_name, row.unit_label]
      .filter(Boolean)
      .join(' / ') || '교과서';
  }
  return [row.book_name, row.book_unit].filter(Boolean).join(' / ') || '외부교재';
}
