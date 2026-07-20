// apps/web/app/api/writing-2026/session/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SessionPayload = {
  testId: string;
  answers: Record<string, string>;
};

type SessionRow = {
  id: string;
  user_id: string | null;
  test_id: string;
  answers: Record<string, string>;
  created_at: string;
  updated_at: string;
};

// ✅ 공통: 로그인 체크 + supabase 인스턴스 반환
async function getAuthedSupabase() {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: uerr,
  } = await supabase.auth.getUser();

  if (uerr) {
    return {
      ok: false as const,
      status: 500,
      error: uerr.message,
      supabase,
      user: null as null,
    };
  }

  if (!user) {
    return {
      ok: false as const,
      status: 401,
      error: "unauthorized",
      supabase,
      user: null as null,
    };
  }

  return {
    ok: true as const,
    status: 200,
    error: null as null,
    supabase,
    user,
  };
}

// ✅ POST /api/writing-2026/session
// body: { testId: string; answers: Record<string, string> }
// → writing_2026_sessions에 insert 후 sessionId 리턴
export async function POST(req: NextRequest) {
  const auth = await getAuthedSupabase();
  if (!auth.ok || !auth.user) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { supabase, user } = auth;

  const body = await req.json().catch(() => null);

  if (
    !body ||
    typeof body.testId !== "string" ||
    typeof body.answers !== "object" ||
    body.answers == null
  ) {
    return NextResponse.json(
      { ok: false, error: "Invalid payload." },
      { status: 400 }
    );
  }

  const { testId, answers } = body as SessionPayload;

  const { data, error } = await supabase
    .from("writing_2026_sessions")
    .insert({
      user_id: user.id,
      test_id: testId,
      // 🧠 DB 스키마 기준: answers(jsonb) 컬럼 사용
      answers,
    })
    .select("id")
    .single();

  if (error) {
    console.error("writing_2026_sessions insert error", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, sessionId: data.id });
}

// ✅ GET /api/writing-2026/session
// → 현재 유저의 세션 목록 (최근 것부터)
export async function GET(req: NextRequest) {
  const auth = await getAuthedSupabase();
  if (!auth.ok || !auth.user) {
    return NextResponse.json(
      { ok: false, error: auth.error },
      { status: auth.status }
    );
  }

  const { supabase, user } = auth;

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam) || 20, 100) : 20;

  const { data, error } = await supabase
    .from("writing_2026_sessions")
    .select("id, user_id, test_id, answers, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("writing_2026_sessions select error", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    items: (data ?? []) as SessionRow[],
  });
}
