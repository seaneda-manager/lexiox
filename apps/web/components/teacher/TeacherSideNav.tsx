'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Section = 'admin' | 'content';

export function TeacherSideNav({ section }: { section: Section }) {
  const pathname = usePathname();

  const items =
    section === 'admin'
      ? [
          { href: '/teacher/admin', label: 'Dashboard' },
          { href: '/teacher/admin/users', label: 'Users & Roles' },
          { href: '/teacher/admin/classes', label: 'Classes' },
          { href: '/teacher/admin/logs', label: 'Logs' },
          { href: '/teacher/admin/settings', label: 'Settings' },
        ]
            : [
          { href: '/content', label: 'Overview' },
          { href: '/reading/admin', label: 'Reading Editor' },
          { href: '/content/listening/editor', label: 'Listening Editor' },
          { href: '/content/speaking/editor', label: 'Speaking Editor' },
          { href: '/content/writing/editor', label: 'Writing Editor' },
          { href: '/content/vocab/editor', label: 'Vocab Editor' },
          { href: '/content/grammar/editor', label: 'Grammar Editor' },
        ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <aside className="w-56 shrink-0 space-y-2">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={isActive(it.href) ? 'page' : undefined}
          className={[
            'block w-full rounded-md border px-3 py-2 text-sm',
            isActive(it.href) ? 'bg-black text-white border-black' : 'bg-white border-gray-300',
          ].join(' ')}
        >
          {it.label}
        </Link>
      ))}
    </aside>
  );
}