export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { advanceGroupAfterCompletion } from "@/lib/supabase/testAssignmentGroups";

export async function POST(req: Request) {
  try {
    const { assignmentId, recordings } = await req.json();
    if (!assignmentId) return NextResponse.json({ ok: false, error: "assignmentId required" }, { status: 400 });

    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

    const service = getServiceSupabase();

    // recordings 데이터 포함해서 업데이트
    const updateData: any = {
      status: "completed",
      completed_at: new Date().toISOString(),
    };

    if (recordings) {
      updateData.results_payload = {
        listenRepeat: recordings.listenRepeat || [],
        interview: recordings.interview || [],
      };
    }

    const { error } = await service
      .from("test_assignments")
      .update(updateData)
      .eq("id", assignmentId)
      .eq("student_id", user.id);

    if (error) throw error;

    const groupProgress = await advanceGroupAfterCompletion(assignmentId);

    return NextResponse.json({
      ok: true,
      nextSection: groupProgress.nextSection,
      groupCompleted: groupProgress.groupCompleted,
      groupId: groupProgress.groupId,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
