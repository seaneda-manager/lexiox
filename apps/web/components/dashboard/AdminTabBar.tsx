'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type AdminTab =
  | '관리자'
  | 'LEXiOX-TOEFL'
  | 'LEXiOX-내신'
  | 'LEXiOX-Jr.'
  | 'LEXiOX-어휘'
  | '콘텐츠'
  | '선생님 도구';

const TABS: { key: AdminTab; label: string; color: string; activeColor: string }[] = [
  { key: '관리자',       label: 'Admin',        color: 'text-slate-500',   activeColor: 'border-slate-400 text-slate-700 bg-slate-50' },
  { key: 'LEXiOX-TOEFL', label: 'TOEFL',        color: 'text-blue-500',    activeColor: 'border-blue-400 text-blue-700 bg-blue-50' },
  { key: 'LEXiOX-내신',  label: '내신',         color: 'text-emerald-500', activeColor: 'border-emerald-400 text-emerald-700 bg-emerald-50' },
  { key: 'LEXiOX-Jr.',   label: 'Jr.',          color: 'text-orange-500',  activeColor: 'border-orange-400 text-orange-700 bg-orange-50' },
  { key: 'LEXiOX-어휘',  label: '어휘',         color: 'text-violet-500',  activeColor: 'border-violet-400 text-violet-700 bg-violet-50' },
  { key: '콘텐츠',       label: '콘텐츠',       color: 'text-sky-500',     activeColor: 'border-sky-400 text-sky-700 bg-sky-50' },
  { key: '선생님 도구',  label: '선생님 도구',  color: 'text-amber-500',   activeColor: 'border-amber-400 text-amber-700 bg-amber-50' },
];

// path prefix → which tab it belongs to
const PATH_TAB_MAP: [string, AdminTab][] = [
  ['/admin/content/updated-reading',  'LEXiOX-TOEFL'],
  ['/admin/content/listening/toefl', 'LEXiOX-TOEFL'],
  ['/admin/content/writing-2026',  'LEXiOX-TOEFL'],
  ['/admin/content/grammar-2026',  'LEXiOX-TOEFL'],
  ['/admin/landing',               'LEXiOX-TOEFL'],
  ['/admin/naesin',                'LEXiOX-내신'],
  ['/admin/hi-naesin',             'LEXiOX-내신'],
  ['/admin/content/listening/jr',  'LEXiOX-Jr.'],
  ['/admin/vocab',                 'LEXiOX-어휘'],
  ['/voca/admin',                  'LEXiOX-어휘'],
  ['/admin/content',               '콘텐츠'],
  ['/teacher',                     '선생님 도구'],
  ['/admin/students',              '선생님 도구'],
  ['/admin/homework',              '선생님 도구'],
];

function guessTabFromPath(pathname: string): AdminTab {
  for (const [prefix, tab] of PATH_TAB_MAP) {
    if (pathname.startsWith(prefix)) return tab;
  }
  return '관리자';
}

export default function AdminTabBar() {
  const pathname = usePathname();
  const [active, setActive] = useState<AdminTab>(() => guessTabFromPath(pathname));

  // sync tab when navigating
  useEffect(() => {
    setActive(guessTabFromPath(pathname));
  }, [pathname]);

  function select(tab: AdminTab) {
    setActive(tab);
    document.dispatchEvent(new CustomEvent('change-admin-tab', { detail: tab }));
  }

  // emit on mount so sidebar syncs to initial path
  useEffect(() => {
    document.dispatchEvent(new CustomEvent('change-admin-tab', { detail: active }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-0.5 border-b border-neutral-200 bg-white px-3 overflow-x-auto">
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => select(t.key)}
            className={[
              'flex shrink-0 items-center px-3.5 py-2 text-xs font-semibold transition-colors',
              'border-b-2 -mb-px',
              isActive
                ? `${t.activeColor} border-current`
                : `${t.color} border-transparent hover:border-neutral-200 hover:bg-neutral-50`,
            ].join(' ')}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
