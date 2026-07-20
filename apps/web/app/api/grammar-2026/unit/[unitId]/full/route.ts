import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

// 유닛 전체 데이터 (unit + segments + drills + stylistic) 한 번에 반환
export async function GET(_req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;
    const supabase = await getServerSupabase();

    const [unitRes, segmentsRes, drillsRes, stylisticRes] = await Promise.all([
      supabase.from("grammar_2026_units").select("*").eq("id", unitId).single(),
      supabase.from("grammar_2026_explanation_segments").select("*").eq("unit_id", unitId).order("order_index"),
      supabase.from("grammar_2026_drills").select("*").eq("unit_id", unitId).order("order_index"),
      supabase.from("grammar_2026_stylistic_items").select("*").eq("unit_id", unitId).order("order_index"),
    ]);

    if (unitRes.error) throw new Error(unitRes.error.message);

    return NextResponse.json({
      unit: unitRes.data,
      segments: segmentsRes.data ?? [],
      drills: drillsRes.data ?? [],
      stylistic_items: stylisticRes.data ?? [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
