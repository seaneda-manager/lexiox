import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { skill, level, focus_type, title, body: passageBody, source_notes, is_published, questions } = body;

  if (!skill || !level || !passageBody) {
    return NextResponse.json({ error: "skill, level, body 필수" }, { status: 400 });
  }

  // 지문 저장
  const { data: passage, error: pErr } = await supabase
    .from("toefl_practice_passages")
    .insert({ skill, level, focus_type, title, body: passageBody, source_notes, is_published: !!is_published })
    .select("id")
    .single();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  // 문제 저장
  if (questions?.length) {
    const qRows = (questions as any[])
      .filter((q) => q.stem?.trim())
      .map((q, i) => ({
        passage_id: passage.id,
        order_num: i + 1,
        stem: q.stem,
        choices: q.choices ?? [],
        explanation: q.explanation || null,
      }));

    if (qRows.length) {
      const { error: qErr } = await supabase.from("toefl_practice_questions").insert(qRows);
      if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ id: passage.id });
}
