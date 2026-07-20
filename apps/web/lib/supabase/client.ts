// apps/web/lib/supabase/client.ts
"use client";

import { createBrowserClient as createBrowserClientSSR } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Browser Supabase client
 * - allows createBrowserClient() with 0 args
 * - keeps a singleton via getBrowserSupabase()
 */
export function createBrowserClient(
  url?: string,
  anonKey?: string,
): SupabaseClient<Database> {
  const u = (url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const k = (anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  if (!u || !k) {
    throw new Error(
      "Supabase env missing: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createBrowserClientSSR<Database>(u, k);
}

// ✅ Back-compat export expected by older code (ex: LoginForm.tsx)
let _browserClient: SupabaseClient<Database> | null = null;

export function getBrowserSupabase(): SupabaseClient<Database> {
  if (!_browserClient) _browserClient = createBrowserClient();
  return _browserClient;
}
