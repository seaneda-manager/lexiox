export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { GRAMMAR_ELEMENT_SEED } from "@/lib/grammar/quizElements";

// POST /api/admin/grammar-quiz/elements/seed — 카탈로그 upsert
export async function POST() {
  try {
    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getServiceRoleClient();
    const rows = GRAMMAR_ELEMENT_SEED.map((e, i) => ({
      code: e.code,
      label_ko: e.label_ko,
      label_en: e.label_en,
      category: e.category,
      order_index: i,
    }));

    const { error } = await db.from("grammar_elements").upsert(rows, { onConflict: "code" });
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, seeded: rows.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
