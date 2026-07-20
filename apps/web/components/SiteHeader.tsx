'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SiteHeader() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setEmail(data.user?.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (mounted) setEmail(session?.user?.email ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-5xl h-16 px-4 flex items-center justify-between">
        <Link href="/">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LEXiOX.png" alt="LEXiOX" className="h-10 w-auto" />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {email ? (
            <>
              <span className="hidden sm:inline text-gray-600">{email}</span>
              <Link href="/dashboard" className="hover:underline">Dashboard</Link>
              <Link href="/auth/logout" className="underline">Logout</Link>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="underline">Login</Link>
              <Link href="/auth/forgot-password" className="hover:underline">Reset</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}





