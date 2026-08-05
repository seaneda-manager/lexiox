export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

export async function GET(
  req: Request,
  { params }: { params: { testId: string } }
) {
  try {
    const { testId } = params;

    if (!testId) {
      return NextResponse.json(
        { ok: false, error: "Test ID is required" },
        { status: 400 }
      );
    }

    // Fetch test data from listening_tests table
    // 'locked'는 정식 배정된 시험, 'active'는 admin이 생성 직후 미리보기/스모크 테스트로 바로 여는 경우
    const { data: test, error: testError } = await supabase
      .from("listening_tests")
      .select("*")
      .eq("id", testId)
      .in("status", ["locked", "active"])
      .single();

    if (testError || !test) {
      console.error("Test fetch error:", testError);
      return NextResponse.json(
        { ok: false, error: "Test not found or not available" },
        { status: 404 }
      );
    }

    // Parse JSON content if stored as string
    let testContent = test.content;
    if (typeof testContent === "string") {
      try {
        testContent = JSON.parse(testContent);
      } catch (e) {
        console.error("JSON parse error:", e);
        return NextResponse.json(
          { ok: false, error: "Invalid test data format" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      payload: testContent,
    });
  } catch (err: any) {
    console.error("STUDENT LISTENING TESTS ERROR:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
