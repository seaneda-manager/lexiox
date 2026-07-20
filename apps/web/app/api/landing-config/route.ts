import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const LANDING_KEY = "landing_home_v1";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", LANDING_KEY)
      .maybeSingle();
    return NextResponse.json(data?.value ?? {}, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate" },
    });
  } catch {
    return NextResponse.json({});
  }
}
