export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, label_ko, label_en, description, level, order_index } = body;

    if (!id || !label_ko || !label_en) {
      return NextResponse.json({ error: "id, label_ko, label_en 필수" }, { status: 400 });
    }

    // 로그인 확인 후 service-role로 write (grammar_2026_units는 RLS select-only 정책)
    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceRoleClient();
    const { error } = await supabase.from("grammar_2026_units").insert({
      id, label_ko, label_en,
      description: description ?? null,
      level: level ?? "all",
      order_index: order_index ?? 0,
      status: "draft",
    });

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
