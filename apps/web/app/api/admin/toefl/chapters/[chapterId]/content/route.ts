import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ chapterId: string }> }
) {
  const { chapterId } = await params;
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "teacher") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { level, content_type, title, content_ref_table, content_ref_id, notes } = body;

  if (!level || !content_type) {
    return NextResponse.json({ error: "level, content_type 필수" }, { status: 400 });
  }

  // 같은 타입의 현재 최대 order_num 조회
  const { data: existing } = await supabase
    .from("toefl_chapter_content")
    .select("order_num")
    .eq("chapter_id", chapterId)
    .eq("level", level)
    .eq("content_type", content_type)
    .order("order_num", { ascending: false })
    .limit(1);

  const nextOrder = ((existing?.[0]?.order_num ?? 0) as number) + 1;

  const { data, error } = await supabase
    .from("toefl_chapter_content")
    .insert({
      chapter_id: chapterId,
      level,
      content_type,
      order_num: nextOrder,
      title,
      content_ref_table,
      content_ref_id,
      notes,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id });
}
