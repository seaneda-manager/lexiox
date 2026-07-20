import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import LandingRenderer from '@/components/landing/LandingRenderer';
import { TOEFL_DEFAULT } from '@/components/landing/defaults';
import type { LandingPageConfig } from '@/components/landing/types';

async function getConfig(): Promise<LandingPageConfig> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return TOEFL_DEFAULT;
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'landing_toefl_v1').maybeSingle();
    if (data?.value && typeof data.value === 'object') return data.value as LandingPageConfig;
  } catch { /* fallback */ }
  return TOEFL_DEFAULT;
}

export default async function ToeflLandingPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/toefl/home');

  const config = await getConfig();
  return <LandingRenderer config={config} />;
}

