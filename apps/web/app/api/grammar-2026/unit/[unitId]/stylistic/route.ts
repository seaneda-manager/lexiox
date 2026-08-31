export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v: any) => (typeof v === "string" && UUID_RE.test(v) ? v : randomUUID());

export async function PUT(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;
    const { items } = await req.json();

    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = getServiceRoleClient();

    const { error: delError } = await supabase
      .from("grammar_2026_stylistic_items")
      .delete()
      .eq("unit_id", unitId);
    if (delError) throw new Error(delError.message);

    if (items.length > 0) {
      const rows = items.map((it: any) => ({
        id: asUuid(it.id),
        unit_id: unitId,
        order_index: it.order_index,
        skill: it.skill,
        prompt: it.prompt,
        options: it.options,
        explanation: it.explanation,
      }));
      const { error: insError } = await supabase
        .from("grammar_2026_stylistic_items")
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
      .from("grammar_2026_stylistic_items")
      .select("*")
      .eq("unit_id", unitId)
      .order("order_index");
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
