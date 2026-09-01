export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;
    const body = await req.json();

    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = ["status", "label_ko", "label_en", "description", "admin_note", "level", "order_index"];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    updates.updated_at = new Date().toISOString();

    const supabase = getServiceRoleClient();
    const { error } = await supabase
      .from("grammar_2026_units")
      .update(updates)
      .eq("id", unitId);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;

    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceRoleClient();
    // 자식 테이블(explanation_segments/drills/stylistic_items/unit_completions)은
    // on delete cascade. student_responses는 drills 통해 cascade. 유닛 행만 지우면 됨.
    const { error } = await supabase.from("grammar_2026_units").delete().eq("id", unitId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
