// apps/web/app/auth/callback/page.tsx
'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const hasCode = !!code;
    const hasAccessToken = url.hash.includes('access_token');

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    (async () => {
      try {
        if (hasCode) {
          // ???ш린??code瑜??섍꺼以섏빞 ??
          await supabase.auth.exchangeCodeForSession(code!);
          router.replace('/'); // ?먰븯??寃쎈줈
          return;
        }

        if (hasAccessToken) {
          const target = new URL('/auth/reset-finish', url.origin);
          target.hash = url.hash;
          target.search = url.search;
          window.location.replace(target.toString());
          return;
        }

        router.replace('/auth/login?error=callback');
      } catch {
        router.replace('/auth/login?error=callback');
      }
    })();
  }, [router]);

  return <p className="p-4 text-center">Signing you in…</p>;
}





