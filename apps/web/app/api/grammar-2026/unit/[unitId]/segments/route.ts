export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { insertDroppingMissing } from "@/lib/ai/grammarGen";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuid = (v: any) => (typeof v === "string" && UUID_RE.test(v) ? v : randomUUID());

export async function PUT(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;
    const { segments } = await req.json();

    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabase = getServiceRoleClient();

    // 기존 세그먼트 전체 삭제 후 재삽입 (순서 보장)
    const { error: delError } = await supabase
      .from("grammar_2026_explanation_segments")
      .delete()
      .eq("unit_id", unitId);
    if (delError) throw new Error(delError.message);

    if (segments.length > 0) {
      const rows = segments.map((s: any) => ({
        id: asUuid(s.id),
        unit_id: unitId,
        order_index: s.order_index,
        type: s.type,
        content: s.content,
        narration: s.narration ?? null,
        audio_url: s.audio_url ?? null,
        source: s.source === "manual" ? "manual" : "ai",
      }));
      // narration/audio_url/source 등 미마이그레이션 컬럼이 있어도 안 깨지게 (있는 만큼만 저장)
      const { error: insError } = await insertDroppingMissing(supabase, "grammar_2026_explanation_segments", rows);
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
      .from("grammar_2026_explanation_segments")
      .select("*")
      .eq("unit_id", unitId)
      .order("order_index");
    if (error) throw new Error(error.message);
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
