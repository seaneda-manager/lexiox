import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { MOCK_GRAMMAR_UNIT } from "@/models/grammar/mock";
import type { GrammarUnitFull } from "@/models/grammar/types";
import GrammarUnitEditorClient from "./_client/GrammarUnitEditorClient";

export const dynamic = "force-dynamic";

export default async function GrammarUnitAdminPage({
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

  // fallback to mock
  if (!data) {
    if (unitId === MOCK_GRAMMAR_UNIT.unit.id) {
      data = MOCK_GRAMMAR_UNIT;
    } else {
      notFound();
    }
  }

  return (
    <main className="flex flex-col h-[calc(100vh-60px)]">
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-5 py-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/admin/content/grammar-2026"
            className="text-[11px] text-gray-400 hover:text-gray-600">
            ← 유닛 목록
          </Link>
          <span className="text-gray-200">|</span>
          <div>
            <span className="font-semibold text-sm text-gray-900">{data.unit.label_ko}</span>
            <span className="ml-2 text-[11px] text-gray-400">{data.unit.id}</span>
          </div>
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium
          ${data.unit.status === "published" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {data.unit.status === "published" ? "Published" : "Draft"}
        </span>
      </div>

      <div className="flex-1 overflow-hidden">
        <GrammarUnitEditorClient data={data} />
      </div>
    </main>
  );
}
