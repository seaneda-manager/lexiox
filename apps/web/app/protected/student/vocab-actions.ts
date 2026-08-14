"use server";

/**
 * Vocab Day 완료 Action
 * 학생이 Day를 완료했을 때 호출
 * → 현재 Day를 completed로 표시
 * → 다음 Day 자동 배정
 */
export async function completeVocabDayAction(params: {
  assignmentId: string;
  trackId: string;
  dayIndex: number;
  studyTimeSeconds?: number;
}) {
  try {
    const res = await fetch("/api/vocab/complete-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error ?? "Failed to complete day",
      };
    }

    return {
      ok: true,
      completed: data.completed,
      nextDay: data.nextDay,
      nextAssignmentId: data.nextAssignmentId,
    };
  } catch (e: any) {
    console.error("[completeVocabDayAction]", e);
    return {
      ok: false,
      error: e?.message ?? "Failed to complete day",
    };
  }
}

/**
 * Vocab Day 상태 조회
 */
export async function getVocabDayStatusAction(params: {
  trackId: string;
  studentId?: string;
}) {
  try {
    const res = await fetch(
      `/api/vocab/status?trackId=${params.trackId}${
        params.studentId ? `&studentId=${params.studentId}` : ""
      }`
    );

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error ?? "Failed to get status",
      };
    }

    return {
      ok: true,
      currentDay: data.currentDay,
      totalDays: data.totalDays,
      completedDays: data.completedDays,
      nextAvailableDay: data.nextAvailableDay,
    };
  } catch (e: any) {
    console.error("[getVocabDayStatusAction]", e);
    return {
      ok: false,
      error: e?.message ?? "Failed to get status",
    };
  }
}
