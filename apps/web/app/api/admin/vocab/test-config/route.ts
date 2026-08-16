export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/vocab/test-config
 * Admin용 시험 설정 조회
 */
export async function GET() {
  try {
    const { data, error } = await admin
      .from("vocab_test_configs")
      .select("*")
      .order("scope");

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch configs" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/vocab/test-config/create
 * 범위별 설정 생성
 */
export async function POST(req: NextRequest) {
  try {
    const { scope, scope_id } = await req.json();

    const { data, error } = await admin
      .from("vocab_test_configs")
      .insert({
        scope,
        scope_id,
        coverage_ratio: 70,
        arrangement: "grouped",
        skip_learning_check: false,
      })
      .select();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to create config:", error);
    return NextResponse.json(
      { error: "Failed to create config" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/vocab/test-config
 * Admin용 시험 설정 업데이트
 */
export async function PUT(req: NextRequest) {
  try {
    const { id, field, value } = await req.json();

    if (!id || !field) {
      return NextResponse.json(
        { error: "Missing id or field" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("vocab_test_configs")
      .update({
        [field]: value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update config:", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
