import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";

export async function POST(req: Request) {
  try {
    const { assignmentId } = await req.json();
    if (!assignmentId) return NextResponse.json({ ok: false, error: "assignmentId required" }, { status: 400 });

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const service = getServiceSupabase();
    const { error } = await service
      .from("test_assignments")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", assignmentId)
      .eq("student_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
