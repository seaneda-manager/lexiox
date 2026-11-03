export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { getServiceSupabase } from "@/lib/supabase/service";

type Ctx = { params: Promise<{ id: string }> };

async function load(id: string) {
  let auth;
  try {
    auth = await requireTeacherOrAdmin();
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    const status = msg.startsWith("403") ? 403 : msg.startsWith("401") ? 401 : 500;
    return { error: NextResponse.json({ error: msg }, { status }) };
  }
  const db = getServiceSupabase();
  const { data: exam } = await db.from("vocab_teacher_exams").select("*").eq("id", id).maybeSingle();
  if (!exam) return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  if (auth.role !== "admin" && exam.created_by !== auth.user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { db, exam };
}

/** GET — 시험 상세 + 학생별 응시 결과 */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const r = await load(id);
  if (r.error) return r.error;
  const { db, exam } = r;

  const [{ data: targets }, { data: sessions }] = await Promise.all([
    db.from("vocab_teacher_exam_targets").select("student_id").eq("exam_id", id),
    db
      .from("vocab_test_sessions")
      .select("student_id, status, score, correct_count, total_count, submitted_at, started_at")
      .eq("exam_id", id)
      .order("started_at", { ascending: false }),
  ]);

  const authIds = (targets ?? []).map((t: any) => t.student_id as string);
  const names = new Map<string, string>();
  if (authIds.length > 0) {
    const { data: studs } = await db
      .from("academy_students")
      .select("display_name, auth_user_id, user_id, profile_id")
      .or(`auth_user_id.in.(${authIds.join(",")}),user_id.in.(${authIds.join(",")}),profile_id.in.(${authIds.join(",")})`);
    for (const s of studs ?? []) {
      const key = ((s as any).auth_user_id ?? (s as any).user_id ?? (s as any).profile_id) as string;
      names.set(key, (s as any).display_name);
      for (const alt of [(s as any).user_id, (s as any).profile_id]) if (alt) names.set(alt, (s as any).display_name);
    }
  }

  // 학생당 가장 최근 세션(채점 완료 우선)
  const latest = new Map<string, any>();
  for (const s of sessions ?? []) {
    const prev = latest.get((s as any).student_id);
    if (!prev || ((s as any).status === "graded" && prev.status !== "graded")) latest.set((s as any).student_id, s);
  }

  return NextResponse.json({
    exam,
    results: authIds.map(sid => {
      const s = latest.get(sid);
      return {
        student_id: sid,
        name: names.get(sid) ?? "(이름 없음)",
        status: s?.status ?? "not_started",
        score: s?.score ?? null,
        correct_count: s?.correct_count ?? null,
        total_count: s?.total_count ?? null,
        submitted_at: s?.submitted_at ?? null,
      };
    }),
  });
}

/** DELETE — 시험 삭제 (연결된 세션은 exam_id 만 null 로 남는다) */
export async function DELETE(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const r = await load(id);
  if (r.error) return r.error;
  const { error } = await r.db.from("vocab_teacher_exams").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
