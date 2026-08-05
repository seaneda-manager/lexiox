export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reading/conversion-table?testId=xxx&section=reading
 * POST /api/admin/reading/conversion-table (업데이트/생성)
 *
 * Conversion Table 조회 및 관리
 */

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const testId = searchParams.get("testId") || "default";
    const section = searchParams.get("section") || "reading";

    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("score_conversion_tables")
      .select("*")
      .eq("test_id", testId)
      .eq("section", section)
      .order("raw_score", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      testId,
      section,
      table: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { testId, section, rows, description } = body;

    if (!testId || !section || !Array.isArray(rows)) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: testId, section, rows" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // 1. 기존 데이터 삭제
    await supabase
      .from("score_conversion_tables")
      .delete()
      .eq("test_id", testId)
      .eq("section", section);

    // 2. 새 데이터 삽입
    const insertRows = rows.map((row: any) => ({
      test_id: testId,
      section,
      raw_score: row.rawScore,
      scaled_score: row.scaledScore,
      description: row.description || description,
    }));

    const { data, error } = await supabase
      .from("score_conversion_tables")
      .insert(insertRows)
      .select("*");

    if (error) {
      console.error("[admin/reading/conversion-table] insert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      testId,
      section,
      count: data?.length || 0,
      table: data || [],
    });
  } catch (error: any) {
    console.error("[admin/reading/conversion-table] error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message },
      { status: 500 }
    );
  }
}
