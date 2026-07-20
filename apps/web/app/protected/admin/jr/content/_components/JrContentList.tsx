import React from 'react';
import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabaseServer';
import { getUserAndProfile } from '@/lib/getUserAndProfile';
import { redirect } from 'next/navigation';
import { Edit, Plus } from 'lucide-react';

type ContentType = 'reading' | 'grammar' | 'listening' | 'speaking-writing';

interface JrContentListProps {
  type: ContentType;
  title: string;
  icon: string;
  tableName: string;
}

const CONFIG: Record<ContentType, {
  label: string;
  maxLevel: number;
  hasTextbook: boolean;
}> = {
  reading: { label: 'Reading', maxLevel: 5, hasTextbook: true },
  grammar: { label: 'Grammar', maxLevel: 5, hasTextbook: true },
  listening: { label: 'Listening', maxLevel: 5, hasTextbook: true },
  'speaking-writing': { label: 'Speaking-Writing', maxLevel: 5, hasTextbook: true },
};

export default async function JrContentList(
  props: JrContentListProps & {
    searchParams: Promise<{
      level?: string;
      textbook?: string;
      status?: string;
      q?: string;
    }>;
  }
) {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== 'admin') redirect('/login');

  const sp = await props.searchParams;
  const supabase = await getSupabaseServer();
  const config = CONFIG[props.type];

  let query = supabase
    .from(props.tableName)
    .select('id, title, level, textbook, status, ai_score, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (sp.level) query = query.eq('level', parseInt(sp.level));
  if (sp.textbook) query = query.ilike('textbook', `%${sp.textbook}%`);
  if (sp.status) query = query.eq('status', sp.status);
  if (sp.q) query = query.ilike('title', `%${sp.q}%`);

  const { data, error } = await query;

  if (error) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          오류: {error.message}
        </div>
      </main>
    );
  }

  const rows = data ?? [];

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      {/* Header */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Admin / Jr Learning
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {props.icon} {props.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Jr Learning {config.label} 콘텐츠 관리
          </p>
        </div>
        <Link
          href={`/admin/jr/content/${props.type}/new`}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 self-start"
        >
          <Plus className="w-4 h-4" />
          콘텐츠 추가
        </Link>
      </header>

      {/* Filters */}
      <section className="rounded-lg border bg-white p-4">
        <form className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-semibold text-slate-900 mb-1">
              검색
            </label>
            <input
              name="q"
              defaultValue={sp.q ?? ''}
              placeholder="제목으로 검색..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="w-32">
            <label className="block text-xs font-semibold text-slate-900 mb-1">
              레벨
            </label>
            <select
              name="level"
              defaultValue={sp.level ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">전체</option>
              {Array.from({ length: config.maxLevel }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Level {i + 1}
                </option>
              ))}
            </select>
          </div>

          {config.hasTextbook && (
            <div className="w-40">
              <label className="block text-xs font-semibold text-slate-900 mb-1">
                교재
              </label>
              <input
                name="textbook"
                defaultValue={sp.textbook ?? ''}
                placeholder="교재명..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          <div className="w-40">
            <label className="block text-xs font-semibold text-slate-900 mb-1">
              상태
            </label>
            <select
              name="status"
              defaultValue={sp.status ?? ''}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">전체</option>
              <option value="PUBLISHED">공개</option>
              <option value="AWAITING_REVIEW">검토 대기</option>
              <option value="REJECTED">거절</option>
            </select>
          </div>

          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 font-medium"
          >
            적용
          </button>
        </form>
      </section>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-slate-400">
          등록된 콘텐츠가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">
                  제목
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">
                  레벨
                </th>
                {config.hasTextbook && (
                  <th className="px-4 py-3 text-left font-semibold text-slate-900">
                    교재
                  </th>
                )}
                <th className="px-4 py-3 text-left font-semibold text-slate-900">
                  AI 점수
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-900">
                  상태
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row: any) => {
                const status = row.status || 'PUBLISHED';
                const statusDisplay =
                  status === 'PUBLISHED'
                    ? '공개'
                    : status === 'AWAITING_REVIEW'
                    ? '검토'
                    : '거절';
                const statusBg =
                  status === 'PUBLISHED'
                    ? 'bg-green-100 text-green-700'
                    : status === 'AWAITING_REVIEW'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700';
                const scoreBg = !row.ai_score
                  ? 'bg-slate-100 text-slate-700'
                  : row.ai_score >= 85
                  ? 'bg-green-100 text-green-700'
                  : row.ai_score >= 70
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700';

                return (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {row.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-2 py-1 text-xs font-semibold">
                        L{row.level}
                      </span>
                    </td>
                    {config.hasTextbook && (
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {row.textbook || '-'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {row.ai_score !== null ? (
                        <span
                          className={`inline-block rounded px-2 py-1 text-xs font-semibold ${scoreBg}`}
                        >
                          {row.ai_score}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-semibold ${statusBg}`}
                      >
                        {statusDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/jr/content/${props.type}/${row.id}`}
                        className="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        <Edit className="w-3 h-3" />
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
