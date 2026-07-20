'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Tab = {
  href: string;
  label: string;
  icon: string;
  match: (p: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: '/hi-naesin',
    label: '내신',
    icon: '📖',
    match: (p) => p.startsWith('/hi-naesin'),
  },
  {
    href: '/vocab',
    label: '단어',
    icon: '🔤',
    match: (p) => p.startsWith('/vocab') || p.startsWith('/hi-naesin/vocab'),
  },
  {
    href: '/student/homework',
    label: '숙제',
    icon: '✏️',
    match: (p) => p.startsWith('/student/homework'),
  },
  {
    href: '/student/lectures',
    label: '강의',
    icon: '🎬',
    match: (p) => p.startsWith('/student/lectures'),
  },
  {
    href: '/settings',
    label: '설정',
    icon: '⚙️',
    match: (p) => p.startsWith('/settings'),
  },
];

export default function MobileLexioxTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-neutral-200 bg-white md:hidden">
      <div className="flex">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                'flex flex-1 flex-col items-center gap-0.5 py-2 text-center transition-colors',
                active ? 'text-neutral-900' : 'text-neutral-400',
              ].join(' ')}
            >
              <span className="text-xl leading-tight">{tab.icon}</span>
              <span className={`text-[10px] font-semibold leading-tight ${active ? 'text-neutral-900' : 'text-neutral-400'}`}>
                {tab.label}
              </span>
              {active && (
                <span className="h-0.5 w-4 rounded-full bg-neutral-900" />
              )}
            </Link>
          );
        })}
      </div>
      {/* iOS safe area */}
      <div className="h-safe-bottom" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </nav>
  );
}
