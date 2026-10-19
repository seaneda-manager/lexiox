"use server";

import { revalidatePath } from "next/cache";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacher";

export type VoidResult = { ok: boolean; error?: string };

/**
 * 재응시 허용: 시험 세션을 무효 처리한다 (기록은 남기고 voided_at 만 찍는다).
 *  - 본시험이면 같은 배정에서 다시 응시할 수 있게 되고, 이 시험에서 만들어진 재학습 배정은 취소된다
 *  - 진행 중인 세션이면 종료(graded) 처리하여 새로 시작할 수 있게 한다
 * admin 은 모든 학생, teacher 는 자기 반 학생만 처리할 수 있다.
 */
export async function voidTestSessionAction(formData: FormData): Promise<VoidResult> {
  const sessionId = String(formData.get("session_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || "선생님 재응시 허용";
  if (!sessionId) return { ok: false, error: "session_id 가 필요해요." };

  let flags;
  try {
    flags = await requireTeacherOrAdmin();
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "권한이 없어요." };
  }

  const service = getServiceRoleClient();
  const { data: session } = await service
    .from("vocab_test_sessions")
    .select("id, student_id, status, voided_at")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return { ok: false, error: "시험 기록을 찾을 수 없어요." };
  if (session.voided_at) return { ok: true };

  if (!flags.isAdmin) {
    // 내 반 학생인지 확인 (academy_class_students.student_id 는 auth uid)
    const { data: myClasses } = await service
      .from("academy_classes")
      .select("id")
      .eq("teacher_id", flags.userId);
    const classIds = (myClasses ?? []).map((c: any) => c.id);
    const { data: membership } = classIds.length
      ? await service
          .from("academy_class_students")
          .select("class_id")
          .eq("student_id", session.student_id)
          .in("class_id", classIds)
          .limit(1)
          .maybeSingle()
      : { data: null };
    if (!membership) return { ok: false, error: "내 반 학생의 시험만 처리할 수 있어요." };
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    voided_at: now,
    voided_by: flags.userId,
    void_reason: reason,
    updated_at: now,
  };
  if (session.status !== "graded") patch.status = "graded";

  const { error } = await service.from("vocab_test_sessions").update(patch).eq("id", sessionId);
  if (error) return { ok: false, error: "무효 처리에 실패했어요." };

  // 이 시험 결과로 만들어진 재학습 배정은 취소
  await service
    .from("vocab_remedial_tasks")
    .update({ status: "cancelled", updated_at: now })
    .eq("source_session_id", sessionId)
    .in("status", ["open", "in_progress", "done"]);

  revalidatePath("/teacher/vocab-exams");
  return { ok: true };
}
