// apps/web/lib/supabaseServer.ts
import { getServerSupabase } from './supabase/server';

export async function getSupabaseServer() {
  return getServerSupabase();
}
