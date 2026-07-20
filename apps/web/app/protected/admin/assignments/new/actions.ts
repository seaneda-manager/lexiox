"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

type AssignmentKind = "scope" | "content" | "bundle" | "flow";
type Track = "naesin" | "junior" | "toefl" | "voca";
type Section =
  | "reading"
  | "listening"
  | "speaking"
  | "writing"
  | "grammar"
  | "vocab"
  | "-";
type AssignmentStatus = "draft" | "assigned" | "in_progress" | "completed" | "closed";
type StudentTaskStatus = "todo" | "in_progress" | "done";
type StudentTaskPriority = "low" | "medium" | "high";

function cleanStr(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function asBool(value: FormDataEntryValue | null): boolean {
  if (typeof value !== "string") return false;
  return value === "on" || value === "true" || value === "1";
}

function asUnknownString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isTrueValue(value: unknown): boolean {
  return value === true;
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function isMergedStudentRow(row: Record<string, unknown>): boolean {
  const mergedFlagCandidates = [
    row.is_merged,
    row.merged,
  ];

  if (mergedFlagCandidates.some(isTrueValue)) {
    return true;
  }

  const mergedStringCandidates = [
    asUnknownString(row.status),
    asUnknownString(row.student_status),
  ];

  if (mergedStringCandidates.some((value) => value?.toLowerCase() === "merged")) {
    return true;
  }

  const mergedReferenceCandidates = [
    row.merged_into_student_id,
    row.merged_to_student_id,
    row.merged_target_student_id,
    row.merged_student_id,
    row.primary_student_id,
    row.canonical_student_id,
  ];

  if (mergedReferenceCandidates.some(hasValue)) {
    return true;
  }

  const mergedDateCandidates = [row.merged_at];

  if (mergedDateCandidates.some(hasValue)) {
    return true;
  }

  return false;
}

function normalizeKind(value: string): AssignmentKind {
  if (value === "scope" || value === "content" || value === "bundle" || value === "flow") {
    return value;
  }
  return "content";
}

function normalizeTrack(value: string): Track {
  if (value === "naesin" || value === "junior" || value === "toefl" || value === "voca") {
    return value;
  }
  return "naesin";
}

function normalizeSection(value: string): Section {
  if (
    value === "reading" ||
    value === "listening" ||
    value === "speaking" ||
    value === "writing" ||
    value === "grammar" ||
    value === "vocab" ||
    value === "-"
  ) {
    return value;
  }
  return "-";
}

function normalizeAssignmentStatus(value: string): AssignmentStatus {
  if (
    value === "draft" ||
    value === "assigned" ||
    value === "in_progress" ||
    value === "completed" ||
    value === "closed"
  ) {
    return value;
  }
  return "assigned";
}

function normalizePriority(value: string): StudentTaskPriority {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function mapAssignmentStatusToTaskStatus(status: AssignmentStatus): StudentTaskStatus {
  if (status === "in_progress") return "in_progress";
  if (status === "completed" || status === "closed") return "done";
  return "todo";
}

function mapTrackToTaskKind(track: Track): string {
  switch (track) {
    case "naesin":
      return "NAESIN";
    case "junior":
      return "JUNIOR";
    case "toefl":
      return "TOEFL";
    case "voca":
      return "LINGO_VOCAB";
    default:
      return "NAESIN";
  }
}

function toDueAtKstIso(dueDate: string | null): string | null {
  if (!dueDate) return null;
  return new Date(`${dueDate}T23:59:00+09:00`).toISOString();
}

async function assertActiveStudent(
  supabase: Awaited<ReturnType<typeof getServerSupabase>>,
  studentId: string
) {
  const { data, error } = await supabase
    .from("academy_students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    throw new Error(`student lookup failed: ${error.message ?? "unknown error"}`);
  }

  if (!data) {
    throw new Error("student not found");
  }

  const row = data as Record<string, unknown>;
  const isActive = isTrueValue(row.is_active);
  const deactivatedAt = row.deactivated_at;
  const isMerged = isMergedStudentRow(row);

  if (!isActive) {
    throw new Error("inactive student cannot be assigned");
  }

  if (hasValue(deactivatedAt)) {
    throw new Error("deactivated student cannot be assigned");
  }

  if (isMerged) {
    throw new Error("merged student cannot be assigned");
  }

  return row;
}

export async function createAssignmentAction(formData: FormData) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = cleanStr(formData.get("title"));
  const description = cleanStr(formData.get("description"));
  const memo = cleanStr(formData.get("memo"));

  const kind = normalizeKind(cleanStr(formData.get("kind")));
  const track = normalizeTrack(cleanStr(formData.get("track")));
  const section = normalizeSection(cleanStr(formData.get("section")));
  const assignmentStatus = normalizeAssignmentStatus(cleanStr(formData.get("status")));
  const priority = normalizePriority(cleanStr(formData.get("priority")));

  const targetType = cleanStr(formData.get("target_type")) || "student";
  const studentIdManual = cleanStr(formData.get("student_id_manual"));
  const studentIdSelect = cleanStr(formData.get("student_id"));
  const studentId = studentIdManual || studentIdSelect;

  const dueDate = cleanStr(formData.get("due_date")) || null;
  const dueAt = toDueAtKstIso(dueDate);

  const reviewRequired = asBool(formData.get("review_required"));
  const retryAllowed = asBool(formData.get("retry_allowed"));

  if (!title) throw new Error("title is required");
  if (targetType !== "student") throw new Error("v1 only supports target_type=student");
  if (!studentId) throw new Error("student_id is required");

  await assertActiveStudent(supabase, studentId);

  const assignmentPayload = {
    title,
    start_at: new Date().toISOString(),
    due_at: dueAt,
    status: assignmentStatus,
    created_by: user.id,
    homework_id: null,
    target: {
      targetType: "student",
      studentId,
      kind,
      track,
      program: track,
      section: section === "-" ? null : section,
      priority,
      reviewRequired,
      retryAllowed,
      memo: memo || null,
      description: description || null,
      source: "admin_assignments_new_v1",
    },
  };

  const { data: assignmentRow, error: assignmentErr } = await supabase
    .from("assignments")
    .insert(assignmentPayload as never)
    .select("id")
    .single();

  if (assignmentErr || !(assignmentRow as { id?: string } | null)?.id) {
    throw new Error(`assignments insert failed: ${assignmentErr?.message ?? "unknown error"}`);
  }

  const assignmentId = String((assignmentRow as { id: string }).id);

  const taskPayload = {
    student_id: studentId,
    teacher_id: user.id,
    title,
    description: description || null,
    status: mapAssignmentStatusToTaskStatus(assignmentStatus),
    priority,
    kind: mapTrackToTaskKind(track),
    due_date: dueDate,
    due_at: dueAt,
    payload_json: {
      assignmentId,
      spec: {
        track,
        program: track,
        section: section === "-" ? null : section,
        kind: mapTrackToTaskKind(track),
        assignmentKind: kind,
        source: "admin_assignments_new_v1",
      },
      options: {
        reviewRequired,
        retryAllowed,
      },
      memo: memo || null,
    },
  };

  const { error: taskErr } = await supabase.from("student_tasks").insert(taskPayload as never);

  if (taskErr) {
    await supabase.from("assignments").delete().eq("id", assignmentId);
    throw new Error(`student_tasks insert failed: ${taskErr.message ?? "unknown error"}`);
  }

  revalidatePath("/admin/assignments");
  revalidatePath("/admin/results");
  revalidatePath("/dashboard/tasks");
  revalidatePath("/student");
  revalidatePath("/home/student");

  redirect("/admin/assignments");
}
