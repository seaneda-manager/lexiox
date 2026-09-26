'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type Role = 'student' | 'teacher' | 'admin';

type LoginEntry = {
  id: string;
  user_id: string;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles: { full_name: string | null; email: string | null; role: Role | null } | null;
};

type LoginHistoryResp = {
  items: LoginEntry[];
  nextCursor?: string | null;
  total?: number;
};

const ROLE_LABEL: Record<string, string> = {
  student: '학생',
  teacher: '선생님',
  admin: '관리자',
};

const ROLE_BADGE_CLASS: Record<string, string> = {
  student: 'bg-blue-50 text-blue-700 ring-blue-100',
  teacher: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  admin: 'bg-amber-50 text-amber-800 ring-amber-100',
};

function describeDevice(ua: string | null): string {
  if (!ua) return '-';
  const isMobile = /Mobile|Android|iPhone/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';

  const kind = isTablet ? '태블릿' : isMobile ? '모바일' : 'PC';
  return `${os} · ${browser} (${kind})`;
}

export default function LoginHistoryManager() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LoginHistoryResp>({ items: [] });
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([undefined]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const buildURL = useCallback(
    (cursor?: string) => {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const url = new URL('/api/admin/login-history', base || 'http://localhost');
      if (query.trim()) url.searchParams.set('q', query.trim());
      if (cursor) url.searchParams.set('cursor', cursor);
      return url.toString();
    },
    [query]
  );

  const fetchList = useCallback(
    async (cursor?: string) => {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildURL(cursor), { cache: 'no-store', signal: ac.signal });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as LoginHistoryResp;
        setData(json);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Failed to load login history');
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [buildURL]
  );

  useEffect(() => {
    setCursorStack([undefined]);
    fetchList(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      setCursorStack([undefined]);
      fetchList(undefined);
      debounceRef.current = null;
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchList]);

  const goNext = () => {
    if (!data.nextCursor || loading) return;
    setCursorStack((s) => [...s, data.nextCursor!]);
    fetchList(data.nextCursor);
  };

  const goPrev = () => {
    if (cursorStack.length <= 1 || loading) return;
    const next = cursorStack.slice(0, -1);
    setCursorStack(next);
    fetchList(next[next.length - 1]);
  };

  const totalLabel = data.total ? `Total ${data.total}건` : '';

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => e.preventDefault()} className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[200px] flex-1 rounded border px-3 py-2 text-sm"
          placeholder="이름 / 이메일 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search login history"
        />
      </form>

      <div aria-live="polite" className="min-h-5 text-xs">
        {error && <div className="text-red-600 whitespace-pre-wrap">{error}</div>}
      </div>

      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">User</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">Email</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">역할</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">로그인 시각</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">IP</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">기기</th>
            </tr>
          </thead>
          <tbody>
            {loading && data.items.length === 0 ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-t">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.items.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-neutral-500" colSpan={6}>
                  로그인 기록이 없습니다.
                </td>
              </tr>
            ) : (
              data.items.map((entry) => {
                const role = entry.profiles?.role ?? undefined;
                const roleBadgeClass = role ? ROLE_BADGE_CLASS[role] : '';
                return (
                  <tr key={entry.id} className="border-t">
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-neutral-800">
                          {entry.profiles?.full_name ?? '-'}
                        </span>
                        <span className="text-[10px] text-neutral-400 truncate max-w-[160px]">
                          {entry.user_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-sm text-neutral-800">
                        {entry.profiles?.email ?? entry.email ?? '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {role ? (
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1',
                            roleBadgeClass,
                          ].join(' ')}
                        >
                          {ROLE_LABEL[role]}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-xs text-neutral-600">
                        {new Date(entry.created_at).toLocaleString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-xs text-neutral-600">{entry.ip_address ?? '-'}</span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-xs text-neutral-600" title={entry.user_agent ?? ''}>
                        {describeDevice(entry.user_agent)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-600">
        <div>{totalLabel}</div>
        <div className="flex items-center gap-2">
          <button
            className="rounded px-3 py-1 border disabled:opacity-50"
            disabled={cursorStack.length <= 1 || loading}
            onClick={goPrev}
          >
            Prev
          </button>
          <button
            className="rounded px-3 py-1 border disabled:opacity-50"
            disabled={!data.nextCursor || loading}
            onClick={goNext}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
