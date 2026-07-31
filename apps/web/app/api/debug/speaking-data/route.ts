import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const { data, error } = await supabase
    .from("speaking_results_2026")
    .select("id, test_id, task_id, user_id, script, audio_url, approx_words, approx_sentences, grading_status, ai_total_score, final_total_score, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    count: data?.length ?? 0,
    data: data ?? [],
    message: data && data.length > 0
      ? "✅ Data found!"
      : "⚠️ No speaking results found",
  });
}
