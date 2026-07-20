// apps/web/lib/supabaseBrowser.ts
'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/supabase';

let _client: SupabaseClient /*<Database>*/ | null = null;

function _makeClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return createBrowserClient/*<Database>*/(url, anon);
}

export function getSupabaseBrowser() {
  if (_client) return _client;
  _client = _makeClient();
  return _client;
}

export function createSupabaseBrowser() {
  return getSupabaseBrowser();
}




