import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const { data, error } = await supabase
      .from("grammar_2026_units")
      .select("id, label_ko, label_en, level, order_index, status")
      .order("order_index");
    if (error) throw new Error(error.message);
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
