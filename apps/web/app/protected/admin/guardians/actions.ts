// apps/web/app/protected/admin/guardians/actions.ts
"use server";

import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/classes/requireStaff";
import { normalizeKoreanMobile } from "@/lib/guardians/phone";

export type Guardian = {
  id: string;
  name: string | null;
  relation: string | null;
  phone: string; // 숫자만
  phone_display: string;
  is_primary: boolean;
  notice_ok: boolean;
  source: string;
};

export type StudentWithGuardians = {
  student_id: string;
  name: string;
  guardians: Guardian[];
};

export type ImportReport = {
  imported: number;
  alreadyExisted: number;
  invalid: { studentName: string; raw: string }[];
  noAccount: number; // parent_phone 은 있는데 로그인 계정(auth_user_id)이 없는 학생 수
};

type Result<T = {}> = { ok: boolean; error?: string } & Partial<T>;

function clean(s: unknown): string {
  return String(s ?? "").trim();
}

function displayName(p: { full_name?: string | null; name?: string | null; email?: string | null }): string {
  return clean(p.full_name) || clean(p.name) || clean(p.email) || "(이름 없음)";
}

function display(phone: string): string {
  const r = normalizeKoreanMobile(phone);
  return r.ok ? r.display : phone;
}

/** 활성 학생 전체 + 보호자 연락처 */
export async function listStudentsWithGuardiansAction(): Promise<Result<{ students: StudentWithGuardians[] }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const [stu, g] = await Promise.all([
      db.from("profiles").select("id, full_name, name, email, is_active").eq("role", "student"),
      db.from("guardian_contacts").select("id, student_id, name, relation, phone, is_primary, notice_ok, source"),
    ]);
    if (stu.error) throw new Error(stu.error.message);
    if (g.error) throw new Error(g.error.message);

    const byStudent = new Map<string, Guardian[]>();
    for (const row of g.data ?? []) {
      const r = row as any;
      const list = byStudent.get(r.student_id) ?? [];
      list.push({
        id: r.id,
        name: r.name ?? null,
        relation: r.relation ?? null,
        phone: r.phone,
        phone_display: display(r.phone),
        is_primary: !!r.is_primary,
        notice_ok: r.notice_ok !== false,
        source: r.source ?? "manual",
      });
      byStudent.set(r.student_id, list);
    }

    const students: StudentWithGuardians[] = (stu.data ?? [])
      .filter((p: any) => p.is_active !== false)
      .map((p: any) => ({
        student_id: p.id as string,
        name: displayName(p),
        guardians: (byStudent.get(p.id) ?? []).sort((a, b) => Number(b.is_primary) - Number(a.is_primary)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));

    return { ok: true, students };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "연락처 조회 실패" };
  }
}

export async function addGuardianAction(params: {
  studentId: string;
  name?: string;
  relation?: string;
  phone: string;
}): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };

    const phone = normalizeKoreanMobile(params.phone);
    if (!phone.ok) {
      return { ok: false, error: phone.reason === "empty" ? "전화번호를 입력하세요." : "올바른 휴대폰 번호가 아닙니다. (예: 010-1234-5678)" };
    }

    const db = getServiceRoleClient();
    const { count, error: cErr } = await db
      .from("guardian_contacts")
      .select("id", { count: "exact", head: true })
      .eq("student_id", params.studentId);
    if (cErr) throw new Error(cErr.message);

    const { error } = await db.from("guardian_contacts").insert({
      student_id: params.studentId,
      name: clean(params.name) || null,
      relation: clean(params.relation) || null,
      phone: phone.value,
      is_primary: (count ?? 0) === 0, // 첫 연락처는 주 연락처
      source: "manual",
      created_by: auth.userId,
    });
    if (error) {
      if (error.code === "23505") return { ok: false, error: "이 학생에 이미 등록된 번호입니다." };
      throw new Error(error.message);
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "연락처 추가 실패" };
  }
}

export async function updateGuardianAction(params: {
  id: string;
  name?: string;
  relation?: string;
  phone?: string;
  noticeOk?: boolean;
}): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };

    const patch: Record<string, unknown> = {};
    if (params.name !== undefined) patch.name = clean(params.name) || null;
    if (params.relation !== undefined) patch.relation = clean(params.relation) || null;
    if (params.noticeOk !== undefined) patch.notice_ok = params.noticeOk;
    if (params.phone !== undefined) {
      const phone = normalizeKoreanMobile(params.phone);
      if (!phone.ok) return { ok: false, error: "올바른 휴대폰 번호가 아닙니다. (예: 010-1234-5678)" };
      patch.phone = phone.value;
    }
    if (Object.keys(patch).length === 0) return { ok: true };

    const db = getServiceRoleClient();
    const { error } = await db.from("guardian_contacts").update(patch).eq("id", params.id);
    if (error) {
      if (error.code === "23505") return { ok: false, error: "이 학생에 이미 등록된 번호입니다." };
      throw new Error(error.message);
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "연락처 수정 실패" };
  }
}

/** 주 연락처 지정: 같은 학생의 기존 주 연락처를 먼저 해제해야 유니크 제약에 걸리지 않는다. */
export async function setPrimaryGuardianAction(params: { id: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const { data: g, error: gErr } = await db.from("guardian_contacts").select("student_id").eq("id", params.id).maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!g) return { ok: false, error: "연락처를 찾을 수 없습니다." };

    const off = await db.from("guardian_contacts").update({ is_primary: false }).eq("student_id", (g as any).student_id).eq("is_primary", true);
    if (off.error) throw new Error(off.error.message);
    const on = await db.from("guardian_contacts").update({ is_primary: true }).eq("id", params.id);
    if (on.error) throw new Error(on.error.message);
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "주 연락처 지정 실패" };
  }
}

/** 연락처 삭제. 발송함에는 발송 당시 번호(to_phone)가 남아 있어 기록은 유지된다. */
export async function deleteGuardianAction(params: { id: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const { data: g } = await db.from("guardian_contacts").select("student_id, is_primary").eq("id", params.id).maybeSingle();
    const { error } = await db.from("guardian_contacts").delete().eq("id", params.id);
    if (error) throw new Error(error.message);

    // 주 연락처를 지웠고 다른 연락처가 남아 있으면 하나를 주 연락처로 승격
    if (g && (g as any).is_primary) {
      const { data: rest } = await db
        .from("guardian_contacts")
        .select("id")
        .eq("student_id", (g as any).student_id)
        .order("created_at", { ascending: true })
        .limit(1);
      if (rest && rest.length > 0) {
        await db.from("guardian_contacts").update({ is_primary: true }).eq("id", (rest[0] as any).id);
      }
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "연락처 삭제 실패" };
  }
}

/**
 * 기존 academy_students.parent_phone 을 보호자 연락처로 1회 가져온다. 여러 번 눌러도 안전하다
 * (이미 같은 번호가 있으면 건너뜀). 원본 parent_phone 은 수정하지 않는다.
 */
export async function importLegacyParentPhonesAction(): Promise<Result<{ report: ImportReport }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const { data: legacy, error } = await db
      .from("academy_students")
      .select("id, auth_user_id, display_name, full_name, parent_phone")
      .not("parent_phone", "is", null);
    if (error) throw new Error(error.message);

    const report: ImportReport = { imported: 0, alreadyExisted: 0, invalid: [], noAccount: 0 };

    const { data: existing, error: eErr } = await db.from("guardian_contacts").select("student_id, phone, is_primary");
    if (eErr) throw new Error(eErr.message);
    const have = new Set((existing ?? []).map((r: any) => `${r.student_id}|${r.phone}`));
    const hasPrimary = new Set((existing ?? []).filter((r: any) => r.is_primary).map((r: any) => r.student_id as string));

    const rows: Record<string, unknown>[] = [];
    for (const s of (legacy ?? []) as any[]) {
      const raw = clean(s.parent_phone);
      if (!raw) continue;
      const studentName = clean(s.full_name) || clean(s.display_name) || "(이름 없음)";
      if (!s.auth_user_id) {
        report.noAccount += 1;
        continue;
      }
      const phone = normalizeKoreanMobile(raw);
      if (!phone.ok) {
        report.invalid.push({ studentName, raw });
        continue;
      }
      const key = `${s.auth_user_id}|${phone.value}`;
      if (have.has(key)) {
        report.alreadyExisted += 1;
        continue;
      }
      have.add(key);
      const primary = !hasPrimary.has(s.auth_user_id);
      if (primary) hasPrimary.add(s.auth_user_id);
      rows.push({
        student_id: s.auth_user_id,
        phone: phone.value,
        is_primary: primary,
        source: "imported",
        created_by: auth.userId,
      });
    }

    if (rows.length > 0) {
      const { error: iErr } = await db.from("guardian_contacts").insert(rows);
      if (iErr) throw new Error(iErr.message);
      report.imported = rows.length;
    }
    return { ok: true, report };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "가져오기 실패" };
  }
}
