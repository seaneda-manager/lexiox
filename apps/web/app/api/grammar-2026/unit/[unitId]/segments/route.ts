export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

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
      // narration/audio_url/source는 마이그레이션(20260829000003·4) 적용 후에만 존재.
      // 하나라도 값이 있을 때만 컬럼 포함 → 미적용 DB에서도 기존 저장이 안 깨진다.
      const hasLecture = segments.some((s: any) => s.narration || s.audio_url);
      const hasSource = segments.some((s: any) => s.source);
      const rows = segments.map((s: any) => ({
        id: s.id,
        unit_id: unitId,
        order_index: s.order_index,
        type: s.type,
        content: s.content,
        ...(hasLecture ? { narration: s.narration ?? null, audio_url: s.audio_url ?? null } : {}),
        ...(hasSource ? { source: s.source === "manual" ? "manual" : "ai" } : {}),
      }));
      const { error: insError } = await supabase
        .from("grammar_2026_explanation_segments")
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
