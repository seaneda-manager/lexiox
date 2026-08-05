export const dynamic = 'force-dynamic';

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("vocab_tracks")
      .select("id, title, speed_timeout_seconds")
      .order("title", { ascending: true });

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
    }));

    return NextResponse.json({ tracks });
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
