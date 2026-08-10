// apps/web/lib/supabase/testAssignmentGroups.ts
//
// Full Test / Half Test: Reading -> Listening -> Speaking -> Writing 순서로
// 4개의 독립된 test_assignments row를 test_assignment_groups 아래로 묶는다.
// 각 영역의 응시/채점 플로우 자체는 건드리지 않고, "완료 직후 다음 영역이 뭔지"만
// 알려주는 얇은 조정 레이어다.
import { getServiceSupabase } from "./service";
import type { AssignableSection } from "./assignment-guard";

export const TOEFL_SECTION_ORDER: AssignableSection[] = [
  "reading",
  "listening",
  "speaking",
  "writing",
];

export const SECTION_START_PATH: Record<AssignableSection, string> = {
  reading: "/updated-reading",
  listening: "/updated-listening",
  speaking: "/speaking-2026",
  writing: "/updated-writing",
};

export const SECTION_LABEL: Record<AssignableSection, string> = {
  reading: "Reading",
  listening: "Listening",
  speaking: "Speaking",
  writing: "Writing",
};

const FK_COLUMN: Record<AssignableSection, string> = {
  reading: "reading_test_id",
  listening: "listening_test_id",
  speaking: "speaking_test_id",
  writing: "writing_test_id",
};

export function sectionStartHref(section: AssignableSection, assignmentId: string): string {
  return `${SECTION_START_PATH[section]}/assignments/${assignmentId}/start`;
}

export type AssignmentGroupKind = "full" | "half";

export async function createAssignmentGroup(params: {
  studentId: string;
  assignedBy: string | null;
  kind: AssignmentGroupKind;
  dueDate: string | null;
  testIds: Record<AssignableSection, string>;
}): Promise<{ groupId: string }> {
  const service = getServiceSupabase();

  const { data: group, error: groupError } = await service
    .from("test_assignment_groups")
    .insert({
      student_id: params.studentId,
      assigned_by: params.assignedBy,
      kind: params.kind,
      due_date: params.dueDate,
      status: "pending",
    })
    .select("id")
    .single();

  if (groupError || !group) {
    throw new Error(groupError?.message ?? "Failed to create test_assignment_groups row");
  }

  const rows = TOEFL_SECTION_ORDER.map((section, index) => ({
    student_id: params.studentId,
    assigned_by: params.assignedBy,
    sections: [section],
    [FK_COLUMN[section]]: params.testIds[section],
    due_date: params.dueDate,
    status: "pending",
    group_id: group.id,
    group_sequence: index + 1,
  }));

  const { error: assignmentsError } = await service.from("test_assignments").insert(rows);

  if (assignmentsError) {
    // group row만 남아 고아가 되는 걸 막기 위해 롤백한다.
    await service.from("test_assignment_groups").delete().eq("id", group.id);
    throw new Error(assignmentsError.message);
  }

  return { groupId: group.id as string };
}

export type NextSectionInfo = {
  assignmentId: string;
  section: AssignableSection;
  href: string;
} | null;

export type AdvanceGroupResult = {
  nextSection: NextSectionInfo;
  groupCompleted: boolean;
  groupId: string | null;
};

/**
 * 영역별 완료 API가 test_assignments.status를 'completed'로 갱신한 직후 호출한다.
 * 그룹에 속하지 않은(group_id null) 단독 배정이면 조용히 no-op으로 취급한다.
 */
export async function advanceGroupAfterCompletion(assignmentId: string): Promise<AdvanceGroupResult> {
  const service = getServiceSupabase();

  const { data: current, error: currentError } = await service
    .from("test_assignments")
    .select("id, group_id, group_sequence")
    .eq("id", assignmentId)
    .maybeSingle();

  if (currentError || !current || !current.group_id || current.group_sequence == null) {
    return { nextSection: null, groupCompleted: false, groupId: null };
  }

  const groupId = current.group_id as string;

  const { data: group } = await service
    .from("test_assignment_groups")
    .select("id, status")
    .eq("id", groupId)
    .maybeSingle();

  if (group && group.status === "pending") {
    await service
      .from("test_assignment_groups")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", groupId);
  }

  const { data: next } = await service
    .from("test_assignments")
    .select("id, sections")
    .eq("group_id", groupId)
    .eq("group_sequence", (current.group_sequence as number) + 1)
    .maybeSingle();

  if (next) {
    const section = (next.sections as string[])[0] as AssignableSection;
    return {
      nextSection: {
        assignmentId: next.id as string,
        section,
        href: sectionStartHref(section, next.id as string),
      },
      groupCompleted: false,
      groupId,
    };
  }

  await service
    .from("test_assignment_groups")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", groupId);

  return { nextSection: null, groupCompleted: true, groupId };
}
