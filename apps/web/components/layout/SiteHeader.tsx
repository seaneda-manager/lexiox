// apps/web/components/layout/SiteHeader.tsx
'use client';

import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto max-w-5xl px-4 h-12 flex items-center justify-between">
        <Link href="/" className="font-semibold">K-Prime</Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/home">Home</Link>
          <Link href="/admin/content/list">Admin</Link>
        </nav>
      </div>
    </header>
  );
}
