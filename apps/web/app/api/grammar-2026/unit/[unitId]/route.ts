import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;
    const body = await req.json();
    const supabase = await getServerSupabase();

    const allowed = ["status", "label_ko", "label_en", "description", "level", "order_index"];
    const updates: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) updates[key] = body[key];
    }
    updates.updated_at = new Date().toISOString();

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
