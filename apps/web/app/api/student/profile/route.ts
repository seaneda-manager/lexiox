import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function createAuthedServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !anon) {
    throw new Error("Supabase env missing");
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

/**
 * GET /api/student/profile
 * 현재 학생의 ID와 할당된 단어장(book) ID를 반환
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAuthedServerClient();
    const { data: authUser } = await supabase.auth.getUser();

    if (!authUser?.user?.id) {
      return NextResponse.json(
        { ok: false, error: "NOT_LOGGED_IN" },
        { status: 401 }
      );
    }

    const userId = authUser.user.id;

    // 1) 학생 정보 조회
    const { data: studentData, error: studentError } = await supabase
      .from("academy_students")
      .select("id, user_id, auth_user_id")
      .eq("auth_user_id", userId)
      .maybeSingle();

    if (studentError) throw studentError;

    if (!studentData?.id) {
      return NextResponse.json(
        { ok: false, error: "STUDENT_NOT_FOUND" },
        { status: 404 }
      );
    }

    const studentId = studentData.id;

    // 2) 학생의 현재 단어장(vocab_tracks) 조회
    // 여기서는 학생이 할당받은 첫 번째 active track을 반환합니다.
    // 실제로는 student_vocab_plans 테이블을 참고하거나,
    // 다른 방식으로 현재 학습 중인 책을 결정해야 합니다.

    const { data: plans, error: plansError } = await supabase
      .from("student_vocab_plans")
      .select("track_id, is_active")
      .eq("student_id", studentId)
      .eq("is_active", true)
      .maybeSingle();

    if (plansError) throw plansError;

    const bookId = plans?.track_id;

    if (!bookId) {
      return NextResponse.json(
        {
          ok: false,
          error: "NO_ASSIGNED_BOOK",
          message: "할당된 단어장이 없습니다.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      studentId,
      bookId,
    });
  } catch (e: any) {
    console.error("[/api/student/profile] GET error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
