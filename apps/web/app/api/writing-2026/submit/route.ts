// apps/web/app/api/writing-2026/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SavePayload = {
  testId: string;
  answers: Record<string, string>;
};

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
    error: uerr,
  } = await supabase.auth.getUser();

  if (uerr) {
    return NextResponse.json(
      { ok: false, error: uerr.message },
      { status: 500 }
    );
  }

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  let body: SavePayload;
  try {
    body = (await req.json()) as SavePayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { testId, answers } = body || {};
  if (!testId || !answers || typeof answers !== "object") {
    return NextResponse.json(
      { ok: false, error: "Missing testId or answers" },
      { status: 400 }
    );
  }

  // 1) 세션 생성
  const { data: session, error: serr } = await supabase
    .from("writing_2026_sessions")
    .insert({
      user_id: user.id,
      test_id: testId,
    })
    .select("id")
    .single();

  if (serr || !session) {
    return NextResponse.json(
      { ok: false, error: serr?.message || "Failed to create session" },
      { status: 500 }
    );
  }

  const sessionId = session.id as string;

  // 2) 답안 bulk insert
  const rows = Object.entries(answers)
    .filter(([_, content]) => typeof content === "string" && content.trim() !== "")
    .map(([item_key, content]) => ({
      session_id: sessionId,
      item_key,
      content,
    }));

  if (rows.length > 0) {
    const { error: aerr } = await supabase
      .from("writing_2026_answers")
      .insert(rows);

    if (aerr) {
      return NextResponse.json(
        { ok: false, error: aerr.message },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, sessionId });
}
