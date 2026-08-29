export const dynamic = 'force-dynamic';

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // speed_mode 포함해 조회. 미마이그레이션 DB면 컬럼 없이 재시도.
    let data: any[] | null = null;
    let error: { message: string } | null = null;

    {
      const res = await supabase
        .from("vocab_tracks")
        .select("id, title, speed_timeout_seconds, speed_mode")
        .order("title", { ascending: true });
      data = res.data as any[] | null;
      error = res.error;
    }

    if (error) {
      const res = await supabase
        .from("vocab_tracks")
        .select("id, title, speed_timeout_seconds")
        .order("title", { ascending: true });
      data = res.data as any[] | null;
      error = res.error;
    }

    if (error) {
      console.error("Tracks list GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch tracks", details: error.message },
        { status: 500 }
      );
    }

    const tracks = (data || []).map((t: any) => ({
      id: t.id,
      name: t.title || t.id,
      speedTimeoutSeconds: t.speed_timeout_seconds ?? 15,
      speedMode: t.speed_mode === "full" ? "full" : "simple",
    }));

    return NextResponse.json({ tracks }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("Tracks list route error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}
