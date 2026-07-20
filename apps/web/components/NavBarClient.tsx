'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function NavBarClient() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 珥덇린 ?몄뀡 濡쒕뱶
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
    });
    // ?곹깭 蹂??援щ룆
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    // ?꾩옱 ?섏씠吏媛 蹂댄샇 ?쇱슦?몃㈃ 濡쒓렇???섏씠吏濡? ?꾨땲硫?洹몃?濡??덈줈怨좎묠
    if (pathname?.startsWith('/reading') || pathname?.startsWith('/listening')) {
      router.push('/auth/login');
    } else {
      router.refresh();
    }
  }

  return (
    <header className="w-full border-b">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold">?㎛ TOEFL Program</Link>

        {email ? (
          <div className="flex items-center gap-3">
            <span className="text-sm opacity-80">{email}</span>
            <button
              onClick={handleLogout}
              className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        ) : (
          <nav className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}





