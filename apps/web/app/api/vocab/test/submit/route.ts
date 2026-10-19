export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { type TestSubmitRequest } from "@/models/vocab/test.types";
import { NextRequest, NextResponse } from "next/server";
import { isSessionExpired } from "@/lib/vocab/test/config";
import { finalizeSession } from "@/lib/vocab/test/finalize";

/**
 * POST /api/vocab/test/submit
 * 시험 제출 및 최종 채점 (이미 채점된 세션이면 저장된 결과만 반환)
 * 마감이 지난 뒤의 제출은 시간 만료(timeout)로 처리한다.
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookies) => {
            cookies.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const body: TestSubmitRequest = await req.json();
    const { session_id } = body;

    if (!session_id) {
      return NextResponse.json(
        { error: "Missing session_id" },
        { status: 400 }
      );
    }

    // 1. 세션 확인
    const { data: session } = await admin
      .from("vocab_test_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("student_id", user.id)
      .single();

    if (!session) {
      return NextResponse.json(
        { error: "Session not found or unauthorized" },
        { status: 404 }
      );
    }

    // 2~5. 채점 확정 (미응답은 오답, 중복 호출은 저장된 결과 반환)
    const result = await finalizeSession(
      admin,
      session_id,
      isSessionExpired(session) ? "timeout" : "submit"
    );

    if (!result) {
      return NextResponse.json(
        { error: "No questions found" },
        { status: 404 }
      );
    }

    const { finalized_now: _finalizedNow, ...response } = result;
    return NextResponse.json(response);
  } catch (error) {
    console.error("Test submit error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
