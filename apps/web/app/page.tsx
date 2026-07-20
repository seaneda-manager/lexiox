import { createClient } from "@supabase/supabase-js";
import LandingPageClient from "@/components/landing/LandingPageClient";

// ISR: 60초마다 재생성 (on-demand revalidation으로 즉시 반영 가능)
export const revalidate = 60;

async function getLandingConfig(): Promise<Record<string, unknown> | undefined> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return undefined;

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "landing_home_v1")
      .maybeSingle();

    if (data?.value && typeof data.value === "object") {
      return data.value as Record<string, unknown>;
    }
  } catch {
    // 설정 로드 실패 시 기본값으로 폴백
  }
  return undefined;
}

export default async function LandingPage() {
  const savedConfig = await getLandingConfig();
  return <LandingPageClient savedConfig={savedConfig} />;
}
