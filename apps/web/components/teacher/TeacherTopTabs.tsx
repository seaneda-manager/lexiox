// components/teacher/TeacherTopTabs.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function TeacherTopTabs() {
  const pathname = usePathname();

  const clean = (s: string) => (s || '/').replace(/\/+$/, '');
  const cur = clean(pathname);

  const tabs = [
    { href: '/(protected)/(teacher)/admin', label: 'Administration' },
    { href: '/(protected)/(teacher)/content', label: 'Contents Production' },
  ] as const;

  const isActive = (href: string) => {
    const tgt = clean(href);
    return cur === tgt || cur.startsWith(tgt + '/');
  };

  return (
    <nav role="tablist" aria-label="Teacher sections" className="flex items-center gap-2">
      {tabs.map((t) => {
        const active = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            prefetch
            role="tab"
            aria-selected={active}
            aria-current={active ? 'page' : undefined}
            data-active={active ? 'true' : 'false'}
            className={[
              'inline-flex items-center rounded-full border px-3 py-1 text-sm transition',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50',
              active ? 'border-black bg-black text-white' : 'border-gray-300 bg-white hover:bg-neutral-100',
            ].join(' ')}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}




