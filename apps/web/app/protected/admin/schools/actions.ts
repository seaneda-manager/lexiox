// apps/web/app/protected/admin/schools/actions.ts
"use server";

import { getServiceRoleClient } from "@/lib/supabase/server";

export type School = {
  id: string;
  name: string;
  created_at: string;
  student_count: number;
};

export type ExamPeriod = {
  id: string;
  school_id: string;
  year: number;
  semester: number;
  exam_type: "midterm" | "final";
  start_date: string;
  end_date: string;
  prep_start_date: string;
  note: string | null;
};

function cleanStr(s: unknown): string {
  return String(s ?? "").trim();
}

/** 등록된 학교 목록 + 학교당 학생 수 */
export async function listSchoolsAction(): Promise<
  { ok: true; schools: School[] } | { ok: false; error: string }
> {
  try {
    const supabase = getServiceRoleClient();
    const { data: schools, error } = await supabase
      .from("schools")
      .select("id, name, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: counts, error: cErr } = await supabase
      .from("academy_students")
      .select("school_id")
      .not("school_id", "is", null);
    if (cErr) throw new Error(cErr.message);

    const countMap = new Map<string, number>();
    for (const row of counts ?? []) {
      const id = String((row as any).school_id);
      countMap.set(id, (countMap.get(id) ?? 0) + 1);
    }

    return {
      ok: true,
      schools: (schools ?? []).map((s: any) => ({
        ...s,
        student_count: countMap.get(String(s.id)) ?? 0,
      })),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "학교 목록 조회 실패" };
  }
}

/** 새 학교 등록 */
export async function createSchoolAction(params: { name: string }) {
  try {
    const name = cleanStr(params.name);
    if (!name) return { ok: false, error: "학교명을 입력하세요." };

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("schools")
      .insert({ name })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { ok: true, id: data.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "학교 등록 실패" };
  }
}

export async function deleteSchoolAction(params: { id: string }) {
  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase.from("schools").delete().eq("id", params.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "학교 삭제 실패" };
  }
}

/**
 * academy_students.school(자유텍스트)에 값은 있는데 school_id가 아직 안 걸린
 * 이름들 — Phase 0의 "기존 자유텍스트 매핑" 문제를 관리자가 한 번에 정리하도록.
 */
export async function listUnmatchedSchoolTextsAction(): Promise<
  { ok: true; names: { name: string; count: number }[] } | { ok: false; error: string }
> {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("academy_students")
      .select("school")
      .is("school_id", null)
      .not("school", "is", null);
    if (error) throw new Error(error.message);

    const counts = new Map<string, number>();
    for (const row of data ?? []) {
      const name = cleanStr((row as any).school);
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }

    const names = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { ok: true, names };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "미정규화 학교명 조회 실패" };
  }
}

/**
 * 자유텍스트 학교명 하나를 정규화: schools에 등록(이미 있으면 재사용)하고
 * 그 이름을 가진 모든 academy_students.school_id를 채운다.
 */
export async function normalizeSchoolTextAction(params: { name: string }) {
  try {
    const name = cleanStr(params.name);
    if (!name) return { ok: false, error: "학교명이 비어있습니다." };

    const supabase = getServiceRoleClient();

    let schoolId: string;
    const existing = await supabase.from("schools").select("id").eq("name", name).maybeSingle();
    if (existing.data?.id) {
      schoolId = existing.data.id;
    } else {
      const ins = await supabase.from("schools").insert({ name }).select("id").single();
      if (ins.error) throw new Error(ins.error.message);
      schoolId = ins.data.id;
    }

    const upd = await supabase
      .from("academy_students")
      .update({ school_id: schoolId })
      .eq("school", name)
      .is("school_id", null)
      .select("id");
    if (upd.error) throw new Error(upd.error.message);

    return { ok: true, schoolId, updatedCount: upd.data?.length ?? 0 };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "정규화 실패" };
  }
}

/** 학교별 시험기간 목록 */
export async function listExamPeriodsAction(params: {
  schoolId: string;
}): Promise<{ ok: true; periods: ExamPeriod[] } | { ok: false; error: string }> {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("school_exam_periods")
      .select("id, school_id, year, semester, exam_type, start_date, end_date, prep_start_date, note")
      .eq("school_id", params.schoolId)
      .order("start_date", { ascending: false });
    if (error) throw new Error(error.message);
    return { ok: true, periods: (data ?? []) as ExamPeriod[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "시험기간 조회 실패" };
  }
}

function addMonthsISO(dateISO: string, months: number): string {
  const d = new Date(dateISO + "T00:00:00Z");
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** 학교별 시험기간 등록 — prep_start_date 미입력 시 start_date-1개월로 자동계산 */
export async function createExamPeriodAction(params: {
  schoolId: string;
  year: number;
  semester: number;
  examType: "midterm" | "final";
  startDate: string;
  endDate: string;
  prepStartDate?: string;
  note?: string;
}) {
  try {
    if (!params.schoolId) return { ok: false, error: "학교를 선택하세요." };
    if (!params.startDate || !params.endDate) return { ok: false, error: "시작일/종료일을 입력하세요." };

    const prepStartDate = cleanStr(params.prepStartDate) || addMonthsISO(params.startDate, -1);

    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("school_exam_periods")
      .insert({
        school_id: params.schoolId,
        year: params.year,
        semester: params.semester,
        exam_type: params.examType,
        start_date: params.startDate,
        end_date: params.endDate,
        prep_start_date: prepStartDate,
        note: cleanStr(params.note) || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    return { ok: true, id: data.id };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "시험기간 등록 실패" };
  }
}

export async function deleteExamPeriodAction(params: {
  id: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase.from("school_exam_periods").delete().eq("id", params.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "시험기간 삭제 실패" };
  }
}
