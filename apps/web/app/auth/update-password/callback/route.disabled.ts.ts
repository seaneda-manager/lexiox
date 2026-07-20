// apps/web/app/auth/update-password/callback/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export const dynamic = 'force-dynamic';

function safePath(p?: string | null, fallback = '/auth/update-password') {
  if (!p) return fallback;
  try {
    const u = new URL(p, 'http://local');
    if (u.origin !== 'http://local') return fallback;
  } catch {}
  return p.startsWith('/') ? p : fallback;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') ?? url.searchParams.get('redirect_to');
  const fallbackAfter = '/auth/update-password';

  if (!code) {
    return NextResponse.redirect(new URL('/auth/login?m=missing-code', url));
  }

  // ?뵩 以묒슂: ????낆뀑?낆뿉??cookies()媛 Promise????await ?꾩슂
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        // ?쇰? ?고?????낆뿉??set ?ㅻ쾭濡쒕뱶 異⑸룎???쇳븯?ㅺ퀬 object ?쒓렇?덉쿂 + any ?ъ슜
        set(name: string, value: string, options?: any) {
          try {
            cookieStore.set({ name, value, ...(options || {}) });
          } catch {
            /* ignore */
          }
        },
        remove(name: string, options?: any) {
          try {
            cookieStore.set({ name, value: '', ...(options || {}), maxAge: 0 });
          } catch {
            /* ignore */
          }
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  const dest = error
    ? `/auth/login?m=exchange-failed&err=${encodeURIComponent(error.message)}`
    : safePath(nextParam, fallbackAfter);

  return NextResponse.redirect(new URL(dest, url));
}




