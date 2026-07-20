import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId");

    if (!testId) {
      return NextResponse.json(
        { ok: false, error: "Missing testId" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("reading_question_explanations")
      .select("*")
      .eq("test_id", testId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      explanations: data,
    });
  } catch (err: any) {
    console.error("[admin/reading/explanations] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
