import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get("id");

    if (!assignmentId) {
      return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    }

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const { data: assignment } = await supabase
      .from("test_assignments")
      .select("id, status, results_payload, speaking_test_id, created_at, completed_at")
      .eq("id", assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (!assignment) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      assignment: {
        id: assignment.id,
        status: assignment.status,
        results: assignment.results_payload,
        speakingTestId: assignment.speaking_test_id,
        createdAt: assignment.created_at,
        completedAt: assignment.completed_at,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
