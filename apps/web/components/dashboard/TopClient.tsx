// apps/web/components/dashboard/TopClient.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

export type TopClientItem = {
  id: string;
  name: string;
  email?: string;
  totalSessions?: number;
  avgScore?: number;
  lastActiveAt?: string | Date;
  progressPct?: number;
  href?: string;
};

type Props = {
  title?: string;
  items: TopClientItem[];
  initialSortBy?: 'name' | 'totalSessions' | 'avgScore' | 'lastActiveAt' | 'progressPct';
  initialSortDir?: 'asc' | 'desc';
  initialPageSize?: number;
  /** Next 15 규칙 회피: 함수 prop은 *Action 접미사 */
  buildHrefAction?: (item: TopClientItem) => string;
  scoreMax?: number;
  accent?: boolean;
  searchPlaceholder?: string;
};

export default function TopClient({
  title = 'Top Clients',
  items,
  initialSortBy = 'avgScore',
  initialSortDir = 'desc',
  initialPageSize = 10,
  buildHrefAction,
  scoreMax = 30,
  accent = true,
  searchPlaceholder = 'Search by name or email...',
}: Props) {
  // 기본 링크 빌더
  const linkFor = buildHrefAction
    ? buildHrefAction
    : (item: TopClientItem) => `/student/${encodeURIComponent(item.id)}`;

  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState<Props['initialSortBy']>(initialSortBy);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  const filtered = useMemo(() => {
    const key = q.trim().toLowerCase();
    if (!key) return items;
    return items.filter((it) => {
      const name = (it.name || '').toLowerCase();
      const email = (it.email || '').toLowerCase();
      return name.includes(key) || email.includes(key);
    });
  }, [items, q]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'name': {
          const an = (a.name || '').toLowerCase();
          const bn = (b.name || '').toLowerCase();
          if (an === bn) return 0;
          return an < bn ? -1 * dir : 1 * dir;
        }
        case 'totalSessions': {
          const av = a.totalSessions ?? -Infinity;
          const bv = b.totalSessions ?? -Infinity;
          if (av === bv) return 0;
          return av < bv ? -1 * dir : 1 * dir;
        }
        case 'avgScore': {
          const av = a.avgScore ?? -Infinity;
          const bv = b.avgScore ?? -Infinity;
          if (av === bv) return 0;
          return av < bv ? -1 * dir : 1 * dir;
        }
        case 'progressPct': {
          const av = a.progressPct ?? -Infinity;
          const bv = b.progressPct ?? -Infinity;
          if (av === bv) return 0;
          return av < bv ? -1 * dir : 1 * dir;
        }
        case 'lastActiveAt':
        default: {
          const ad = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : -Infinity;
          const bd = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : -Infinity;
          if (ad === bd) return 0;
          return ad < bd ? -1 * dir : 1 * dir;
        }
      }
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const top = sorted.slice(0, pageSize);

  const toggleSort = (key: Props['initialSortBy']) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex grow flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/50 sm:w-72"
              aria-label="Search top clients"
            />
            {q !== '' && (
              <button
                type="button"
                onClick={() => setQ('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs text-white/70 hover:bg-white/10"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-white/70">
            Show
            <select
              className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            rows
          </label>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr>
              <Th onClick={() => toggleSort('name')} active={sortBy === 'name'} dir={sortDir}>
                Name
              </Th>
              <Th onClick={() => toggleSort('avgScore')} active={sortBy === 'avgScore'} dir={sortDir}>
                Avg Score
              </Th>
              <Th
                onClick={() => toggleSort('totalSessions')}
                active={sortBy === 'totalSessions'}
                dir={sortDir}
              >
                Sessions
              </Th>
              <Th
                onClick={() => toggleSort('progressPct')}
                active={sortBy === 'progressPct'}
                dir={sortDir}
              >
                Progress
              </Th>
              <Th
                onClick={() => toggleSort('lastActiveAt')}
                active={sortBy === 'lastActiveAt'}
                dir={sortDir}
              >
                Last Active
              </Th>
              <Th className="w-20">Link</Th>
            </tr>
          </thead>

          <tbody>
            {top.length === 0 ? (
              <tr>
                <Td colSpan={6}>
                  <div className="py-8 text-center text-white/70">No clients found.</div>
                </Td>
              </tr>
            ) : (
              top.map((it) => {
                const score = it.avgScore ?? 0;
                const pct = clamp0to100(it.progressPct ?? 0);
                const last = it.lastActiveAt ? formatRelative(it.lastActiveAt) : '-';
                const href = it.href && it.href.length > 0 ? it.href : linkFor(it); // ?? 제거
                return (
                  <tr key={it.id} className="hover:bg-white/5">
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-medium">{it.name}</span>
                        {it.email ? <span className="text-xs text-white/60">{it.email}</span> : null}
                      </div>
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 tabular-nums ${accent ? scoreBadgeClass(score, scoreMax) : 'bg-white/10'
                          }`}
                        title={`Out of ${scoreMax}`}
                      >
                        {Number.isFinite(score) ? score.toFixed(1) : '-'}
                      </span>
                    </Td>
                    <Td>{it.totalSessions ?? 0}</Td>
                    <Td>
                      <Progress value={pct} />
                    </Td>
                    <Td>
                      <span className="tabular-nums">{last}</span>
                    </Td>
                    <Td>
                      <Link
                        href={href}
                        className="inline-flex rounded-lg border border-white/15 px-2 py-1 text-xs hover:bg-white/10"
                      >
                        View
                      </Link>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- small UI helpers ---------- */

function Th({
  children,
  className = '',
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  active?: boolean;
  dir?: 'asc' | 'desc';
}) {
  return (
    <th
      className={`select-none border-b border-white/10 bg-black/30 px-3 py-2 text-left font-semibold ${onClick ? 'cursor-pointer hover:bg-black/40' : ''
        } ${className}`}
      onClick={onClick}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <div className="flex items-center gap-1">
        {children}
        {active ? <span className="text-[10px] opacity-70">{dir === 'asc' ? '▲' : '▼'}</span> : null}
      </div>
    </th>
  );
}

function Td({
  children,
  className = '',
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td className={`border-t border-white/10 px-3 py-3 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}

function Progress({ value }: { value: number }) {
  const pct = clamp0to100(value);
  return (
    <div className="h-2 w-full rounded-full bg-white/10">
      <div
        className="h-2 rounded-full"
        style={{
          width: `${pct}%`,
          background:
            pct >= 80
              ? 'linear-gradient(90deg, #22c55e, #16a34a)'
              : pct >= 50
                ? 'linear-gradient(90deg, #facc15, #eab308)'
                : 'linear-gradient(90deg, #f97316, #ea580c)',
        }}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        role="progressbar"
      />
    </div>
  );
}

/* ---------- utils ---------- */

function clamp0to100(n: number) {
  if (!Number.isFinite(n)) return 0;
  const r = Math.round(n);
  if (r < 0) return 0;
  if (r > 100) return 100;
  return r;
}

function scoreBadgeClass(score: number, max: number) {
  if (!Number.isFinite(score)) return 'bg-white/10';
  const safeMax = max > 0 ? max : 1;
  const ratio = score / safeMax;
  if (ratio >= 0.8) return 'bg-green-600/30 text-green-200';
  if (ratio >= 0.6) return 'bg-yellow-600/30 text-yellow-100';
  return 'bg-orange-600/30 text-orange-100';
}

function formatRelative(d: string | Date) {
  const ts = new Date(d).getTime();
  if (!Number.isFinite(ts)) return '-';
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const date = new Date(ts);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(
    date.getDate()
  ).padStart(2, '0')}`;
}
