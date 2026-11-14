// lib/student/newAssignments.ts
// 학생에게 새로 배정되어 아직 시작하지 않은(pending) Updated TOEFL 시험을 영역별로 모은다. 서버 전용.
// "새 시험" = 배정됨 + 시작 전(status pending, started_at 없음) + 만료 전. 시작하면 자동으로 빠진다.
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type AssignSkill = "reading" | "listening" | "speaking" | "writing";
export const ASSIGN_SKILLS: AssignSkill[] = ["reading", "listening", "speaking", "writing"];

/** 각 영역의 배정 목록 페이지 */
export const ASSIGN_LIST_HREF: Record<AssignSkill, string> = {
  reading: "/updated-reading/assignments",
  listening: "/updated-listening/assignments",
  speaking: "/speaking-2026/assignments",
  writing: "/updated-writing/assignments",
};

const TEST_REL: Record<AssignSkill, { col: string; rel: string }> = {
  reading: { col: "reading_test_id", rel: "reading_tests!test_assignments_reading_test_id_fkey" },
  listening: { col: "listening_test_id", rel: "listening_tests" },
  speaking: { col: "speaking_test_id", rel: "speaking_tests!test_assignments_speaking_test_id_fkey" },
  writing: { col: "writing_test_id", rel: "writing_tests!test_assignments_writing_test_id_fkey" },
};

export interface NewAssignment {
  id: string;
  skill: AssignSkill;
  label: string;
  assignedAt: string | null;
  dueDate: string | null;
}

async function loadOne(supabase: SupabaseClient, userId: string, skill: AssignSkill): Promise<NewAssignment[]> {
  const { col, rel } = TEST_REL[skill];
  const { data, error } = await supabase
    .from("test_assignments")
    .select(`id, status, due_date, assigned_at, expires_at, started_at, ${col}, ${rel} ( id, label )`)
    .eq("student_id", userId)
    .contains("sections", [skill])
    .eq("status", "pending")
    .is("started_at", null)
    .order("assigned_at", { ascending: false });
  if (error || !data) return [];

  const now = Date.now();
  return (data as any[])
    .filter((a) => !a.expires_at || new Date(a.expires_at).getTime() > now)
    .map((a) => {
      const t = Array.isArray(a[rel.split("!")[0]]) ? a[rel.split("!")[0]][0] : a[rel.split("!")[0]];
      return {
        id: a.id as string,
        skill,
        label: (t?.label as string | undefined) ?? "시험",
        assignedAt: (a.assigned_at as string | null) ?? null,
        dueDate: (a.due_date as string | null) ?? null,
      };
    });
}

/** 영역별 새 배정 목록. skills 를 생략하면 4개 영역 전부. */
export async function loadNewAssignments(
  supabase: SupabaseClient,
  userId: string,
  skills: AssignSkill[] = ASSIGN_SKILLS,
): Promise<Record<AssignSkill, NewAssignment[]>> {
  const out = { reading: [], listening: [], speaking: [], writing: [] } as Record<AssignSkill, NewAssignment[]>;
  const lists = await Promise.all(skills.map((s) => loadOne(supabase, userId, s)));
  skills.forEach((s, i) => {
    out[s] = lists[i];
  });
  return out;
}
