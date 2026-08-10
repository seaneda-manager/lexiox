export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { advanceGroupAfterCompletion } from "@/lib/supabase/testAssignmentGroups";

export async function POST(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { testId, sessionId, answers, assignmentId } = await req.json();
    if (!testId || !answers) return NextResponse.json({ error: "testId and answers required" }, { status: 400 });

    let result;

    if (sessionId) {
      // Revision: 기존 session 업데이트
      const { data, error } = await supabase
        .from("writing_2026_sessions")
        .update({ raw_answers: answers, grading_status: "ungraded" })
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (error) throw error;
      result = data;
    } else {
      // 새로운 session 생성
      const { data, error } = await supabase
        .from("writing_2026_sessions")
        .insert({ user_id: user.id, test_id: testId, raw_answers: answers, grading_status: "ungraded" })
        .select("id")
        .single();

      if (error) throw error;
      result = data;
    }

    // 배정을 통해 들어온 경우, 완료 처리
    let groupProgress: Awaited<ReturnType<typeof advanceGroupAfterCompletion>> | null = null;
    if (assignmentId) {
      const { error: assignmentError } = await supabase
        .from("test_assignments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", assignmentId)
        .eq("student_id", user.id);

      if (assignmentError) {
        console.error("Failed to mark writing assignment completed:", assignmentError);
      } else {
        groupProgress = await advanceGroupAfterCompletion(assignmentId);
      }
    }

    return NextResponse.json({
      sessionId: result.id,
      nextSection: groupProgress?.nextSection ?? null,
      groupCompleted: groupProgress?.groupCompleted ?? false,
      groupId: groupProgress?.groupId ?? null,
    });
  } catch (err: any) {
    const errorInfo = {
      name: err?.name,
      message: err?.message,
      code: err?.code,
      details: err?.details,
      status: err?.status,
    };
    console.error("writing save-session error:", JSON.stringify(errorInfo, null, 2));
    console.error("Raw error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: errorInfo },
      { status: 500 }
    );
  }
}
