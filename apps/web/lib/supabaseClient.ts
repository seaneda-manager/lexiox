// apps/web/lib/supabaseClient.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/** 釉뚮씪?곗? ?꾩슜 Supabase ?대씪?댁뼵??(?깃??? */
export function getSupabaseBrowser(): SupabaseClient {
  if (_client) return _client;

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
  return _client;
}

/** ?몄쓽??湲곕낯 ?몄뒪?댁뒪 */
export const supabase = getSupabaseBrowser();




