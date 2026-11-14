// app/api/student/assignment-badges/route.ts
// 사이드바 배지용: 새로 배정되어 아직 시작하지 않은 Updated TOEFL 시험 개수(영역별).
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { ASSIGN_SKILLS, loadNewAssignments } from "@/lib/student/newAssignments";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const lists = await loadNewAssignments(supabase, user.id);
  const counts = Object.fromEntries(ASSIGN_SKILLS.map((s) => [s, lists[s].length]));
  return NextResponse.json({ ok: true, counts }, { headers: { "Cache-Control": "no-store" } });
}
