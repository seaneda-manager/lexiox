export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/** admin/teacher만 허용 (이 API는 service role로 동작하므로 반드시 직접 검사해야 한다) */
async function requireStaff(): Promise<NextResponse | null> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin" && me?.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// PUT 으로 바꿀 수 있는 컬럼만 허용
const EDITABLE_FIELDS = new Set([
  "coverage_ratio",
  "arrangement",
  "skip_learning_check",
  "hints_enabled",
  "max_hint_level",
  "max_words",
  "total_exam_interval_days",
]);

/**
 * GET /api/admin/vocab/test-config
 * Admin용 시험 설정 조회
 */
export async function GET() {
  const denied = await requireStaff();
  if (denied) return denied;
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
  const denied = await requireStaff();
  if (denied) return denied;
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
  const denied = await requireStaff();
  if (denied) return denied;
  try {
    const { id, field, value } = await req.json();

    if (!id || !field) {
      return NextResponse.json(
        { error: "Missing id or field" },
        { status: 400 }
      );
    }
    if (!EDITABLE_FIELDS.has(field)) {
      return NextResponse.json({ error: "Field not editable" }, { status: 400 });
    }
    if (field === "max_words" && value !== null) {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 1 || n > 500) {
        return NextResponse.json({ error: "max_words must be 1~500 or null" }, { status: 400 });
      }
    }
    if (field === "total_exam_interval_days" && value !== null) {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 7 || n > 180) {
        return NextResponse.json({ error: "total_exam_interval_days must be 7~180 or null" }, { status: 400 });
      }
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
