// apps/web/app/components/SiteHeader.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

export default function SiteHeader() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const linkCls = (href: string) =>
    `hover:underline ${isActive(href) ? 'font-semibold underline' : ''}`;

  return (
    <header className="border-b">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/">
          <Image src="/lexiox.png" alt="LEXiOX" height={96} width={320} className="h-24 w-auto" priority />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/listening/study" className="hover:underline">Listening Study</Link>
          <Link href="/listening/test" className="hover:underline">Listening Test</Link>
          <Link href="/reading/study" className={linkCls('/reading/study')}>Study</Link>
          <Link href="/reading/test" className={linkCls('/reading/test')}>Test</Link>
          <Link href="/reading/review" className={linkCls('/reading/review')}>Review</Link>
          <Link href="/auth/login" className="px-3 py-1 rounded border">Login</Link>
        </nav>
      </div>
    </header>
  );
}





