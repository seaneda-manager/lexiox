export const dynamic = "force-dynamic";

// 학생 집중 이벤트 기록 (탭/창 이탈, 전체화면 이탈).
// GET  → { enforce } : 학생 계정에서만 전체화면/기록을 적용한다 (선생님·관리자 미리보기는 제외)
// POST → 이벤트 1건 기록. 실패해도 학습을 막지 않는다.

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

const EVENTS = new Set(["tab_hidden", "window_blur", "fullscreen_exit"]);

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ enforce: false });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return NextResponse.json({ enforce: (me as any)?.role === "student" });
}

export async function POST(req: Request) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const event = String(body?.event ?? "");
    const context = String(body?.context ?? "").slice(0, 60);
    if (!EVENTS.has(event) || !context) return NextResponse.json({ ok: false }, { status: 400 });
    const d = Number(body?.durationMs);
    const duration_ms = Number.isFinite(d) && d >= 0 ? Math.min(Math.round(d), 86_400_000) : null;

    const { error } = await supabase
      .from("student_focus_events")
      .insert({ user_id: user.id, context, event, duration_ms });
    if (error) return NextResponse.json({ ok: false }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
