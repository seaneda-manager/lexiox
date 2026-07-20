// apps/web/lib/supabase/service.ts
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function resolveServiceKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_KEY_ADMIN ||
    ""
  );
}

/** Server-only service role client (NO cookies) */
export function getServiceSupabase(): SupabaseClient {
  if (_client) return _client;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";

  const key = resolveServiceKey();

  if (!url) throw new Error("Missing env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)");
  if (!key) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_KEY)");

  _client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return _client;
}

/** Alias (some files might import this name) */
export function getServiceSupabaseAdmin(): SupabaseClient {
  return getServiceSupabase();
}

/** If you want explicit throw semantics */
export function getServiceSupabaseOrThrow(): SupabaseClient {
  return getServiceSupabase();
}

/** Optional helper: reads env and creates a fresh client (rarely needed) */
export function createServiceSupabaseClient(): SupabaseClient {
  const url = mustEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = mustEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export default getServiceSupabase;
