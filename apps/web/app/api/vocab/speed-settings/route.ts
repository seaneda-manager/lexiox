export const dynamic = 'force-dynamic';

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const trackId = searchParams.get("trackId");

    if (!trackId) {
      return NextResponse.json(
        { error: "trackId is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("vocab_tracks")
      .select("id, title, speed_timeout_seconds")
      .eq("id", trackId)
      .single();

    if (error) {
      console.error("Speed settings GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch speed settings", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      trackId: data?.id,
      trackName: data?.title,
      speedTimeoutSeconds: data?.speed_timeout_seconds ?? 15,
    });
  } catch (err) {
    console.error("Speed settings route error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { trackId, speedTimeoutSeconds, speedMode } = body;

    // 유효성 검사
    if (!trackId) {
      return NextResponse.json(
        { error: "trackId is required" },
        { status: 400 }
      );
    }

    const patch: Record<string, any> = {};

    if (speedTimeoutSeconds !== undefined) {
      if (typeof speedTimeoutSeconds !== "number" || speedTimeoutSeconds < 2 || speedTimeoutSeconds > 30) {
        return NextResponse.json(
          { error: "speedTimeoutSeconds must be a number between 2 and 30" },
          { status: 400 }
        );
      }
      patch.speed_timeout_seconds = speedTimeoutSeconds;
    }

    if (speedMode !== undefined) {
      if (speedMode !== "full" && speedMode !== "simple") {
        return NextResponse.json(
          { error: "speedMode must be 'full' or 'simple'" },
          { status: 400 }
        );
      }
      patch.speed_mode = speedMode;
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        { error: "speedTimeoutSeconds or speedMode is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from("vocab_tracks")
      .update(patch)
      .eq("id", trackId)
      .select("id, speed_timeout_seconds, speed_mode")
      .maybeSingle();

    if (error) {
      console.error("Speed settings PATCH error:", error);
      return NextResponse.json(
        { error: "Failed to update speed settings", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, row: data ?? null },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Speed settings route error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}
