'use client';

import { useCallback, useEffect, useState } from 'react';

type Entry = {
  id: string;
  user_id: string;
  action: string;
  path: string | null;
  ip_address: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null; role: string | null } | null;
};

const ACTION_LABEL: Record<string, string> = {
  login: '로그인',
  page_view: '페이지 이동',
};

const ROLE_LABEL: Record<string, string> = { student: '학생', teacher: '선생님', admin: '관리자' };

export default function ActivityLogManager() {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('');
  const [items, setItems] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [stack, setStack] = useState<(string | undefined)[]>([undefined]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL('/api/admin/activity-log', window.location.origin);
        if (query.trim()) url.searchParams.set('q', query.trim());
        if (action) url.searchParams.set('action', action);
        if (cursor) url.searchParams.set('cursor', cursor);
        const res = await fetch(url.toString(), { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setItems(json.items ?? []);
        setNextCursor(json.nextCursor ?? null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load activity log');
      } finally {
        setLoading(false);
      }
    },
    [query, action]
  );

  useEffect(() => {
    setStack([undefined]);
    const t = setTimeout(() => load(undefined), 300);
    return () => clearTimeout(t);
  }, [load]);

  const next = () => {
    if (!nextCursor) return;
    setStack((s) => [...s, nextCursor]);
    load(nextCursor);
  };
  const prev = () => {
    if (stack.length <= 1) return;
    const s = stack.slice(0, -1);
    setStack(s);
    load(s[s.length - 1]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[200px] flex-1 rounded border px-3 py-2 text-sm"
          placeholder="이름 / 이메일 / 경로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="rounded border px-3 py-2 text-sm"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="">전체 활동</option>
          {Object.entries(ACTION_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {error && <div className="text-xs text-red-600 whitespace-pre-wrap">{error}</div>}

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['시각', 'User', '역할', '활동', '경로', 'IP'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-neutral-500" colSpan={6}>
                  {loading ? '불러오는 중…' : '활동 기록이 없습니다.'}
                </td>
              </tr>
            ) : (
              items.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2 text-xs text-neutral-600 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-3 py-2">
                    <div className="text-sm font-medium text-neutral-800">{e.profiles?.full_name ?? '-'}</div>
                    <div className="text-[10px] text-neutral-400">{e.profiles?.email ?? e.user_id}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-neutral-600">
                    {e.profiles?.role ? ROLE_LABEL[e.profiles.role] ?? e.profiles.role : '-'}
                  </td>
                  <td className="px-3 py-2 text-xs">{ACTION_LABEL[e.action] ?? e.action}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600 font-mono">{e.path ?? '-'}</td>
                  <td className="px-3 py-2 text-xs text-neutral-600">{e.ip_address ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 text-xs">
        <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={stack.length <= 1 || loading} onClick={prev}>Prev</button>
        <button className="rounded border px-3 py-1 disabled:opacity-50" disabled={!nextCursor || loading} onClick={next}>Next</button>
      </div>
    </div>
  );
}
