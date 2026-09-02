export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

// GET /api/admin/grammar-quiz/elements — 문법 요소 카탈로그 전체
export async function GET() {
  try {
    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getServiceRoleClient();
    const { data, error } = await db
      .from("grammar_elements")
      .select("code, label_ko, label_en, category, order_index")
      .order("order_index");
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, elements: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
