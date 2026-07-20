import { createClient } from '@supabase/supabase-js';
import LandingRenderer from '@/components/landing/LandingRenderer';
import { VOCA_DEFAULT } from '@/components/landing/defaults';
import type { LandingPageConfig } from '@/components/landing/types';

async function getConfig(): Promise<LandingPageConfig> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return VOCA_DEFAULT;
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await supabase.from('site_settings').select('value').eq('key', 'landing_voca_v1').maybeSingle();
    if (data?.value && typeof data.value === 'object') return data.value as LandingPageConfig;
  } catch { /* fallback */ }
  return VOCA_DEFAULT;
}

export default async function VocaLandingPage() {
  const config = await getConfig();
  return <LandingRenderer config={config} />;
}

