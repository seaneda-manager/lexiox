export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

export async function PUT(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;
    const { drills } = await req.json();

    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = getServiceRoleClient();

    const { error: delError } = await supabase
      .from("grammar_2026_drills")
      .delete()
      .eq("unit_id", unitId);
    if (delError) throw new Error(delError.message);

    if (drills.length > 0) {
      const hasSource = drills.some((d: any) => d.source);
      const rows = drills.map((d: any) => ({
        id: d.id,
        unit_id: unitId,
        order_index: d.order_index,
        type: d.type,
        sentence: d.sentence,
        answer: d.answer,
        distractors: d.distractors,
        grammar_labels: d.grammar_labels,
        audio_url: d.audio_url ?? null,
        ...(hasSource ? { source: d.source === "manual" ? "manual" : "ai" } : {}),
      }));
      const { error: insError } = await supabase
        .from("grammar_2026_drills")
        .insert(rows);
      if (insError) throw new Error(insError.message);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("grammar_2026_drills")
      .select("*")
      .eq("unit_id", unitId)
      .order("order_index");
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
