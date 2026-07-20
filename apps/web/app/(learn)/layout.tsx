// apps/web/app/(learn)/layout.tsx
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getSupabaseServer } from '@/lib/supabaseServer';

export default async function LearnRoot({ children }: { children: ReactNode }) {
  const supabase = await getSupabaseServer(); // ? await
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <html lang="ko">
      <body className="bg-gray-50 text-gray-800 antialiased">
        <div className="border-b bg-white">
          <div className="mx-auto max-w-6xl h-14 px-4 flex items-center justify-between">
            {/* 占쏙옙占쏙옙 占썲름: Home 占쏙옙 Programs占쏙옙 占싱듸옙 */}
            <Link href="/programs" className="font-semibold">Pier Learn</Link>

            <nav className="text-sm flex gap-3">
              {/* 占쏙옙慣占쏙옙占?占쏙옙: Programs, Contact占쏙옙 */}
              <Link href="/programs">Programs</Link>
              <Link href="/contact">Contact</Link>

              {/* 占싸깍옙占쏙옙 占쏙옙: 占싻쏙옙 占쌓븝옙 占쌩곤옙 占쏙옙占쏙옙 */}
              {session && (
                <>
                  <span className="text-gray-300">|</span>
                  <Link href="/learn/toefl/dashboard">Dashboard</Link>
                  <Link href="/learn/toefl/study">Study</Link>
                  <Link href="/learn/toefl/tests">Tests</Link>
                  <Link href="/learn/toefl/progress">Progress</Link>
                </>
              )}
            </nav>
          </div>
        </div>

        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}




