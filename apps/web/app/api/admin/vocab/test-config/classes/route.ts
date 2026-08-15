export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/vocab/test-config/classes
 * 모든 클래스 조회
 */
export async function GET() {
  try {
    // 실제 클래스 테이블명을 확인하고 수정해야 할 수 있음
    const { data, error } = await admin
      .from("academy_classes")
      .select("id, name")
      .order("name");

    if (error) {
      // 테이블이 없으면 빈 배열 반환
      console.warn("academy_classes not found:", error);
      return NextResponse.json([]);
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch classes:", error);
    return NextResponse.json([]);
  }
}
