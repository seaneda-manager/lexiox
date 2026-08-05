// apps/web/app/(protected)/admin/_components/AdminShell.tsx
'use client';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      {/* Top Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-semibold text-gray-900 hover:text-gray-600">
            👨‍💼 Admin
          </Link>

          <div className="flex gap-6 text-sm">
            <Link
              href="/admin"
              className={`px-3 py-2 rounded-lg transition ${
                pathname === '/admin' || pathname === '/protected/admin'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              대시보드
            </Link>

            <Link
              href="/admin/problem-bank"
              className={`px-3 py-2 rounded-lg transition ${
                isActive('/admin/problem-bank')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📚 Problem Bank
            </Link>

            <Link
              href="/admin/daily-tests"
              className={`px-3 py-2 rounded-lg transition ${
                isActive('/admin/daily-tests')
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📝 Daily Tests
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="p-4 max-w-6xl w-full mx-auto">
        {children}
      </main>
    </>
  );
}




