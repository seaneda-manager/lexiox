'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type Role = 'student' | 'teacher' | 'admin';
type Program = 'gap' | 'toefl' | 'lexiox' | null;

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  program: Program;
  created_at: string | null;
};

type UsersResp = {
  items: Profile[];
  nextCursor?: string | null;
  prevCursor?: string | null;
  total?: number;
};

const ROLE_LABEL: Record<Role, string> = {
  student: '학생',
  teacher: '선생님',
  admin: '관리자',
};

const ROLE_BADGE_CLASS: Record<Role, string> = {
  student: 'bg-blue-50 text-blue-700 ring-blue-100',
  teacher: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  admin: 'bg-amber-50 text-amber-800 ring-amber-100',
};

const PROGRAM_LABEL: Record<string, string> = {
  gap: 'GAP',
  toefl: 'TOEFL',
  lexiox: 'LEXiOX',
};

const PROGRAM_BADGE_CLASS: Record<string, string> = {
  gap: 'bg-purple-50 text-purple-700 ring-purple-100',
  toefl: 'bg-sky-50 text-sky-700 ring-sky-100',
  lexiox: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

export default function UsersManager() {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsersResp>({ items: [] });
  const [draftRole, setDraftRole] = useState<Record<string, Role>>({});
  const [draftProgram, setDraftProgram] = useState<Record<string, Program>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savingProgram, setSavingProgram] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const totalLabel = useMemo(() => {
    const t = data.total ?? data.items.length;
    return t > 0 ? `Total ${t} users` : '';
  }, [data.total, data.items.length]);

  const buildURL = useCallback(
    (c?: string) => {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const url = new URL('/api/admin/users', base || 'http://localhost');
      if (query.trim()) url.searchParams.set('q', query.trim());
      if (c) url.searchParams.set('cursor', c);
      return url.toString();
    },
    [query]
  );

  const fetchList = useCallback(
    async (c?: string) => {
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(buildURL(c), { cache: 'no-store', signal: ac.signal });
        if (!res.ok) throw new Error(await res.text());
        const json = (await res.json()) as UsersResp;
        setData(json);
        setCursor(c);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message || 'Failed to load users');
      } finally {
        setLoading(false);
        abortRef.current = null;
      }
    },
    [buildURL]
  );

  useEffect(() => {
    fetchList(undefined);
  }, [fetchList]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    fetchList(undefined);
  };

  // 검색어 변경 시 300ms 디바운스
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      fetchList(undefined);
      debounceRef.current = null;
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchList]);

  const applyRole = async (userId: string) => {
    const newRole = draftRole[userId];
    if (!newRole) return;

    const prev = data.items.find((it) => it.id === userId)?.role;

    setSaving((s) => ({ ...s, [userId]: true }));
    setError(null);
    setToast(null);

    setData((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === userId ? { ...it, role: newRole } : it)),
    }));

    try {
      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast('역할이 저장되었습니다.');
    } catch (e: any) {
      if (prev) {
        setData((d) => ({
          ...d,
          items: d.items.map((it) => (it.id === userId ? { ...it, role: prev } : it)),
        }));
      }
      setError(e?.message || 'Failed to set role');
    } finally {
      setSaving((s) => ({ ...s, [userId]: false }));
    }
  };

  const applyProgram = async (userId: string) => {
    // draftProgram[userId] may be undefined meaning "no change drafted"
    // We allow explicitly setting to null (no program)
    const key = userId;
    const hasDraft = key in draftProgram;
    if (!hasDraft) return;
    const newProgram = draftProgram[key];

    const prev = data.items.find((it) => it.id === userId)?.program;

    setSavingProgram((s) => ({ ...s, [userId]: true }));
    setError(null);
    setToast(null);

    setData((d) => ({
      ...d,
      items: d.items.map((it) => (it.id === userId ? { ...it, program: newProgram } : it)),
    }));

    try {
      const res = await fetch('/api/admin/set-program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, program: newProgram }),
      });
      if (!res.ok) throw new Error(await res.text());
      setToast('프로그램이 저장되었습니다.');
      // Remove from draft after save
      setDraftProgram((d) => {
        const next = { ...d };
        delete next[userId];
        return next;
      });
    } catch (e: any) {
      setData((d) => ({
        ...d,
        items: d.items.map((it) => (it.id === userId ? { ...it, program: prev ?? null } : it)),
      }));
      setError(e?.message || 'Failed to set program');
    } finally {
      setSavingProgram((s) => ({ ...s, [userId]: false }));
    }
  };

  const RoleSelect = ({ user }: { user: Profile }) => {
    const value = draftRole[user.id] ?? user.role;
    return (
      <div className="flex items-center gap-2">
        <select
          id={`role-${user.id}`}
          className="rounded border px-2 py-1 text-xs"
          value={value}
          onChange={(e) =>
            setDraftRole((d) => ({ ...d, [user.id]: e.target.value as Role }))
          }
        >
          <option value="student">학생 (student)</option>
          <option value="teacher">선생님 (teacher)</option>
          <option value="admin">관리자 (admin)</option>
        </select>
        <button
          className="rounded border px-3 py-1 text-xs disabled:opacity-50"
          disabled={!!saving[user.id] || value === user.role}
          onClick={() => applyRole(user.id)}
          aria-busy={!!saving[user.id]}
        >
          {saving[user.id] ? '...' : '저장'}
        </button>
      </div>
    );
  };

  const ProgramSelect = ({ user }: { user: Profile }) => {
    const hasDraft = user.id in draftProgram;
    const value = hasDraft ? draftProgram[user.id] : user.program;
    const isDirty = hasDraft && value !== user.program;

    return (
      <div className="flex items-center gap-2">
        <select
          id={`program-${user.id}`}
          className="rounded border px-2 py-1 text-xs"
          value={value ?? ''}
          onChange={(e) => {
            const v = e.target.value === '' ? null : (e.target.value as Program);
            setDraftProgram((d) => ({ ...d, [user.id]: v }));
          }}
        >
          <option value="">— 없음 —</option>
          <option value="gap">GAP</option>
          <option value="toefl">TOEFL</option>
          <option value="lexiox">LEXiOX</option>
        </select>
        <button
          className="rounded border px-3 py-1 text-xs disabled:opacity-50"
          disabled={!!savingProgram[user.id] || !isDirty}
          onClick={() => applyProgram(user.id)}
          aria-busy={!!savingProgram[user.id]}
        >
          {savingProgram[user.id] ? '...' : '저장'}
        </button>
      </div>
    );
  };

  const goPrev = () => {
    if (!data.prevCursor || loading) return;
    fetchList(data.prevCursor);
  };
  const goNext = () => {
    if (!data.nextCursor || loading) return;
    fetchList(data.nextCursor);
  };

  return (
    <div className="space-y-4">
      {/* 검색 영역 */}
      <form onSubmit={onSearch} className="flex flex-wrap items-center gap-2">
        <input
          className="min-w-[200px] flex-1 rounded border px-3 py-2 text-sm"
          placeholder="이름 / 이메일 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
        />
        <button
          type="submit"
          className="rounded border px-4 py-2 text-sm disabled:opacity-60"
          disabled={loading}
        >
          Search
        </button>
      </form>

      {/* 토스트 / 에러 */}
      <div aria-live="polite" className="min-h-5 text-xs">
        {toast && <div className="text-green-600">{toast}</div>}
        {error && <div className="text-red-600 whitespace-pre-wrap">{error}</div>}
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">User</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">Email</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">역할</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">프로그램</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">역할 변경</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">프로그램 변경</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-neutral-500">가입일</th>
            </tr>
          </thead>
          <tbody>
            {loading && data.items.length === 0 ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-t">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.items.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-neutral-500" colSpan={7}>
                  No users
                </td>
              </tr>
            ) : (
              data.items.map((u) => {
                const roleBadgeClass = ROLE_BADGE_CLASS[u.role];
                const programBadgeClass = u.program ? PROGRAM_BADGE_CLASS[u.program] : '';
                return (
                  <tr key={u.id} className="border-t">
                    <td className="px-3 py-2 align-middle">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-neutral-800">
                          {u.full_name ?? '-'}
                        </span>
                        <span className="text-[10px] text-neutral-400 truncate max-w-[160px]">
                          {u.id}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-sm text-neutral-800">{u.email ?? '-'}</span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1',
                          roleBadgeClass,
                        ].join(' ')}
                      >
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-middle">
                      {u.program ? (
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1',
                            programBadgeClass,
                          ].join(' ')}
                        >
                          {PROGRAM_LABEL[u.program]}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <RoleSelect user={u} />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <ProgramSelect user={u} />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <span className="text-xs text-neutral-600">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 + 총 개수 */}
      <div className="flex items-center justify-between text-xs text-neutral-600">
        <div>{totalLabel}</div>
        <div className="flex items-center gap-2">
          <button
            className="rounded px-3 py-1 border disabled:opacity-50"
            disabled={!data.prevCursor || loading}
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
