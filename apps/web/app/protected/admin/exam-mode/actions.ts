// apps/web/app/protected/admin/exam-mode/actions.ts
"use server";

import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { revertExamModeHold } from "@/lib/examMode/applyExamMode";

export type ExamModeRequestRow = {
  id: string;
  school_exam_period_id: string;
  status: "scheduled" | "held" | "canceled" | "resumed";
  notified_at: string | null;
  held_at: string | null;
  canceled_at: string | null;
  resumed_at: string | null;
  school_name: string;
  year: number;
  semester: number;
  exam_type: "midterm" | "final";
  start_date: string;
  end_date: string;
  prep_start_date: string;
};

/** 진행 중/예정인 exam-mode 요청 전부(취소·완료된 것도 최근 것 위주로 같이 보여줌) */
export async function listExamModeRequestsAction() {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("exam_mode_requests")
      .select(
        `id, school_exam_period_id, status, notified_at, held_at, canceled_at, resumed_at,
         school_exam_periods(year, semester, exam_type, start_date, end_date, prep_start_date, schools(name))`
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const rows: ExamModeRequestRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      school_exam_period_id: r.school_exam_period_id,
      status: r.status,
      notified_at: r.notified_at,
      held_at: r.held_at,
      canceled_at: r.canceled_at,
      resumed_at: r.resumed_at,
      school_name: r.school_exam_periods?.schools?.name ?? "(알 수 없는 학교)",
      year: r.school_exam_periods?.year,
      semester: r.school_exam_periods?.semester,
      exam_type: r.school_exam_periods?.exam_type,
      start_date: r.school_exam_periods?.start_date,
      end_date: r.school_exam_periods?.end_date,
      prep_start_date: r.school_exam_periods?.prep_start_date,
    }));

    return { ok: true, rows };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "조회 실패" };
  }
}

/** 예정된 홀드를 취소하거나, 이미 걸린 홀드를 즉시 되돌린다 */
export async function cancelOrRevertExamModeAction(params: { schoolExamPeriodId: string }) {
  try {
    const sessionSupabase = await getServerSupabase();
    const {
      data: { user },
    } = await sessionSupabase.auth.getUser();

    const result = await revertExamModeHold(params.schoolExamPeriodId, user?.id ?? null, "canceled");
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "취소 실패" };
  }
}
