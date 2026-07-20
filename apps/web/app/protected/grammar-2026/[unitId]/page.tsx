import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { MOCK_GRAMMAR_UNIT } from "@/models/grammar/mock";
import type { GrammarUnitFull } from "@/models/grammar/types";
import GrammarUnitClient from "./_client/GrammarUnitClient";

export const dynamic = "force-dynamic";

export default async function GrammarUnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;

  let data: GrammarUnitFull | null = null;

  try {
    const supabase = await getServerSupabase();
    const [unitRes, segmentsRes, drillsRes, stylisticRes] = await Promise.all([
      supabase.from("grammar_2026_units").select("*").eq("id", unitId).single(),
      supabase.from("grammar_2026_explanation_segments").select("*").eq("unit_id", unitId).order("order_index"),
      supabase.from("grammar_2026_drills").select("*").eq("unit_id", unitId).order("order_index"),
      supabase.from("grammar_2026_stylistic_items").select("*").eq("unit_id", unitId).order("order_index"),
    ]);

    if (!unitRes.error && unitRes.data) {
      data = {
        unit: unitRes.data,
        segments: segmentsRes.data ?? [],
        drills: drillsRes.data ?? [],
        stylistic_items: stylisticRes.data ?? [],
      };
    }
  } catch {}

  // DB에 없으면 목업으로 fallback (개발용)
  if (!data) {
    if (unitId === MOCK_GRAMMAR_UNIT.unit.id) {
      data = MOCK_GRAMMAR_UNIT;
    } else {
      notFound();
    }
  }

  return <GrammarUnitClient data={data} />;
}
