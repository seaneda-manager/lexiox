import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

const STEP_COLUMN: Record<string, string> = {
  lecture:  "lecture_done",
  practice: "practice_done",
  test:     "test_done",
  review:   "review_done",
  drill:    "drill_done",
};

export async function POST(req: NextRequest) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chapterId, level, step } = await req.json();

  const col = STEP_COLUMN[step];
  if (!chapterId || !level || !col) {
    return NextResponse.json({ error: "chapterId, level, step 필수" }, { status: 400 });
  }

  const { error } = await supabase
    .from("toefl_student_progress")
    .upsert(
      {
        student_id: user.id,
        chapter_id: chapterId,
        level,
        [col]: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "student_id,chapter_id,level" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
