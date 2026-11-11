export const dynamic = "force-dynamic";

// 선생님/관리자 피드백 저장·삭제. 대상(학생+분야+상세분야+문제)당 1개를 upsert 한다.
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

const SECTIONS = new Set(["reading", "listening", "speaking", "writing", "vocab", "grammar"]);

async function requireStaff() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  return role === "admin" || role === "teacher" ? user : null;
}

type Body = {
  studentId?: string;
  section?: string;
  subsection?: string;
  questionKey?: string;
  body?: string;
};

function parseTarget(b: Body | null) {
  if (!b?.studentId || !b.section || !SECTIONS.has(b.section)) return null;
  return {
    student_id: b.studentId,
    section: b.section,
    subsection: b.subsection ?? "",
    question_key: b.questionKey ?? "",
  };
}

export async function PUT(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const b = (await req.json().catch(() => null)) as Body | null;
  const target = parseTarget(b);
  const text = b?.body?.trim() ?? "";
  if (!target || !text || text.length > 4000) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const svc = getServiceSupabase();
  const { data, error } = await svc
    .from("student_performance_feedback")
    .upsert(
      { ...target, body: text, author_id: staff.id, updated_at: new Date().toISOString() },
      { onConflict: "student_id,section,subsection,question_key" },
    )
    .select("id, section, subsection, question_key, body, updated_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, feedback: data });
}

export async function DELETE(req: Request) {
  const staff = await requireStaff();
  if (!staff) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const b = (await req.json().catch(() => null)) as Body | null;
  const target = parseTarget(b);
  if (!target) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

  const svc = getServiceSupabase();
  const { error } = await svc
    .from("student_performance_feedback")
    .delete()
    .eq("student_id", target.student_id)
    .eq("section", target.section)
    .eq("subsection", target.subsection)
    .eq("question_key", target.question_key);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
