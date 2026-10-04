// apps/web/app/protected/teacher/session/notice-actions.ts
"use server";

import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/classes/requireStaff";
import { isMemberOn } from "@/lib/classes/sessionBoard";
import { normalizeKoreanMobile } from "@/lib/guardians/phone";
import { makeAttendanceDedupeKey, renderAttendanceMessage } from "@/lib/notifications/attendanceMessage";
import { noticeKindForStatus, pickGuardian, type AttendanceStatusLite } from "@/lib/notifications/guardianPick";

export type NoticeRow = {
  id: string;
  status: "draft" | "approved" | "sent" | "failed" | "cancelled";
  body: string;
  to_phone: string | null;
  to_phone_display: string | null;
  sent_at: string | null;
};

export type NoticeCandidate = {
  student_id: string;
  name: string;
  kind: "absent" | "late";
  guardian_phone_display: string | null; // null 이면 안내를 받을 번호가 없음
  guardian_relation: string | null;
  notice: NoticeRow | null; // 이미 만든 초안/발송 기록
};

type Result<T = {}> = { ok: boolean; error?: string } & Partial<T>;

const MAX_BODY = 2000;

function clean(s: unknown): string {
  return String(s ?? "").trim();
}

function displayName(p: { full_name?: string | null; name?: string | null; email?: string | null }): string {
  return clean(p.full_name) || clean(p.name) || clean(p.email) || "(이름 없음)";
}

function phoneDisplay(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const r = normalizeKoreanMobile(phone);
  return r.ok ? r.display : phone;
}

// 학원 이름은 문구 머리말에만 쓴다. 설정이 없으면 머리말을 생략한다.
const ACADEMY_NAME = process.env.NEXT_PUBLIC_ACADEMY_NAME || null;

/** 이 수업에서 결석·지각으로 확정된 학생과 학부모 안내 상태. 출석 기록은 항상 DB 기준이다. */
export async function listNoticeCandidatesAction(params: { sessionId: string }): Promise<Result<{ candidates: NoticeCandidate[] }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const { data: s, error: sErr } = await db.from("class_sessions").select("id, class_id, session_date").eq("id", params.sessionId).maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!s) return { ok: false, error: "수업을 찾을 수 없습니다." };

    const { data: att, error: aErr } = await db.from("attendance_records").select("student_id, status").eq("session_id", params.sessionId);
    if (aErr) throw new Error(aErr.message);

    const targets = ((att ?? []) as { student_id: string; status: AttendanceStatusLite }[])
      .map((a) => ({ student_id: a.student_id, kind: noticeKindForStatus(a.status) }))
      .filter((a): a is { student_id: string; kind: "absent" | "late" } => a.kind !== null);
    if (targets.length === 0) return { ok: true, candidates: [] };

    const ids = targets.map((t) => t.student_id);
    const [people, guardians, notices] = await Promise.all([
      db.from("profiles").select("id, full_name, name, email").in("id", ids),
      db.from("guardian_contacts").select("id, student_id, relation, phone, is_primary, notice_ok").in("student_id", ids),
      db
        .from("notification_outbox")
        .select("id, student_id, status, body, to_phone, sent_at, dedupe_key")
        .in(
          "dedupe_key",
          targets.map((t) => makeAttendanceDedupeKey(t.kind, params.sessionId, t.student_id))
        ),
    ]);
    if (people.error) throw new Error(people.error.message);
    if (guardians.error) throw new Error(guardians.error.message);
    if (notices.error) throw new Error(notices.error.message);

    const names = new Map((people.data ?? []).map((p: any) => [p.id as string, displayName(p)]));

    const candidates: NoticeCandidate[] = targets.map((t) => {
      const list = ((guardians.data ?? []) as any[]).filter((g) => g.student_id === t.student_id);
      const g = pickGuardian(list);
      const key = makeAttendanceDedupeKey(t.kind, params.sessionId, t.student_id);
      const n = ((notices.data ?? []) as any[]).find((x) => x.dedupe_key === key) ?? null;
      return {
        student_id: t.student_id,
        name: names.get(t.student_id) ?? "(이름 없음)",
        kind: t.kind,
        guardian_phone_display: g ? phoneDisplay(g.phone) : null,
        guardian_relation: g?.relation ?? null,
        notice: n
          ? {
              id: n.id,
              status: n.status,
              body: n.body,
              to_phone: n.to_phone ?? null,
              to_phone_display: phoneDisplay(n.to_phone),
              sent_at: n.sent_at ?? null,
            }
          : null,
      };
    });

    candidates.sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, "ko") : a.kind === "absent" ? -1 : 1));
    return { ok: true, candidates };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "학부모 안내 조회 실패" };
  }
}

/**
 * 결석·지각 학생의 안내 초안을 만든다 (교사가 버튼을 눌렀을 때만, 자동 아님).
 *  - 교사가 확정한 출석 기록만 대상
 *  - 받을 번호가 없는 학생은 건너뜀(skippedNoContact)
 *  - 이미 초안/발송된 학생은 건너뜀. 취소된 초안은 다시 초안으로 살린다.
 */
export async function createAttendanceDraftsAction(params: {
  sessionId: string;
  studentIds?: string[];
}): Promise<Result<{ created: number; skippedNoContact: number; alreadyDone: number }>> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();

    const { data: s, error: sErr } = await db
      .from("class_sessions")
      .select("id, class_id, session_date, start_time, status")
      .eq("id", params.sessionId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!s) return { ok: false, error: "수업을 찾을 수 없습니다." };
    if ((s as any).status === "cancelled") return { ok: false, error: "휴강 처리된 수업입니다." };

    const { data: cls } = await db.from("academy_classes").select("name").eq("id", (s as any).class_id).maybeSingle();
    const className = (cls as any)?.name ?? "";

    const { data: att, error: aErr } = await db.from("attendance_records").select("student_id, status, note").eq("session_id", params.sessionId);
    if (aErr) throw new Error(aErr.message);

    const wanted = params.studentIds ? new Set(params.studentIds) : null;
    const targets = ((att ?? []) as { student_id: string; status: AttendanceStatusLite; note: string | null }[])
      .filter((a) => !wanted || wanted.has(a.student_id))
      .map((a) => ({ ...a, kind: noticeKindForStatus(a.status) }))
      .filter((a): a is typeof a & { kind: "absent" | "late" } => a.kind !== null);
    if (targets.length === 0) return { ok: true, created: 0, skippedNoContact: 0, alreadyDone: 0 };

    // 이 날짜에 그 반 소속이었던 학생만 (임의 학생 ID 로 안내가 만들어지는 것을 막는다)
    const ids = targets.map((t) => t.student_id);
    const { data: mem, error: mErr } = await db
      .from("academy_class_students")
      .select("student_id, joined_on, left_on")
      .eq("class_id", (s as any).class_id)
      .in("student_id", ids);
    if (mErr) throw new Error(mErr.message);
    const memberOk = new Set(
      ((mem ?? []) as any[]).filter((m) => isMemberOn((s as any).session_date, m.joined_on, m.left_on)).map((m) => m.student_id as string)
    );

    const [people, guardians, existing] = await Promise.all([
      db.from("profiles").select("id, full_name, name, email").in("id", ids),
      db.from("guardian_contacts").select("id, student_id, phone, is_primary, notice_ok").in("student_id", ids),
      db
        .from("notification_outbox")
        .select("id, status, dedupe_key")
        .in(
          "dedupe_key",
          targets.map((t) => makeAttendanceDedupeKey(t.kind, params.sessionId, t.student_id))
        ),
    ]);
    if (people.error) throw new Error(people.error.message);
    if (guardians.error) throw new Error(guardians.error.message);
    if (existing.error) throw new Error(existing.error.message);

    const names = new Map((people.data ?? []).map((p: any) => [p.id as string, displayName(p)]));
    let created = 0;
    let skippedNoContact = 0;
    let alreadyDone = 0;

    for (const t of targets) {
      if (!memberOk.has(t.student_id)) continue;

      const g = pickGuardian(((guardians.data ?? []) as any[]).filter((x) => x.student_id === t.student_id));
      if (!g) {
        skippedNoContact += 1;
        continue;
      }

      const key = makeAttendanceDedupeKey(t.kind, params.sessionId, t.student_id);
      const prev = ((existing.data ?? []) as any[]).find((x) => x.dedupe_key === key);
      if (prev && prev.status !== "cancelled") {
        alreadyDone += 1; // 초안/승인/발송 완료/실패 — 다시 만들지 않는다
        continue;
      }

      const body = renderAttendanceMessage({
        kind: t.kind,
        studentName: names.get(t.student_id) ?? "",
        className,
        sessionDate: (s as any).session_date,
        startTime: (s as any).start_time,
        academyName: ACADEMY_NAME,
        note: t.note,
      });

      if (prev) {
        // 취소했던 안내를 다시 초안으로 되살림
        const { error } = await db
          .from("notification_outbox")
          .update({ status: "draft", body, guardian_id: g.id, to_phone: g.phone, approved_by: null, approved_at: null, sent_at: null, error: null, created_by: auth.userId })
          .eq("id", prev.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db.from("notification_outbox").insert({
          kind: t.kind === "absent" ? "attendance_absent" : "attendance_late",
          student_id: t.student_id,
          guardian_id: g.id,
          to_phone: g.phone,
          channel: "manual",
          body,
          status: "draft",
          dedupe_key: key,
          ref_session_id: params.sessionId,
          created_by: auth.userId,
        });
        if (error) {
          if (error.code === "23505") {
            alreadyDone += 1; // 동시에 다른 교사가 먼저 만든 경우
            continue;
          }
          throw new Error(error.message);
        }
      }
      created += 1;
    }

    return { ok: true, created, skippedNoContact, alreadyDone };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "안내 초안 생성 실패" };
  }
}

/** 초안 문구 수정 (초안/승인 상태에서만). 보낸 뒤에는 기록 보존을 위해 수정할 수 없다. */
export async function updateNoticeBodyAction(params: { id: string; body: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const body = clean(params.body);
    if (!body) return { ok: false, error: "문구를 입력하세요." };
    if (body.length > MAX_BODY) return { ok: false, error: `문구는 ${MAX_BODY}자 이하여야 합니다.` };

    const db = getServiceRoleClient();
    const { data, error } = await db
      .from("notification_outbox")
      .update({ body })
      .eq("id", params.id)
      .in("status", ["draft", "approved"])
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { ok: false, error: "이미 보냈거나 취소된 안내는 수정할 수 없습니다." };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "문구 저장 실패" };
  }
}

/**
 * '보냄 표시': 교사가 카톡/문자로 직접 보낸 뒤 누른다. 승인과 발송 기록을 한 번에 남기고,
 * 출석 기록의 notified_at 도 채운다. 이미 보낸 안내를 다시 눌러도 시각이 바뀌지 않는다.
 */
export async function markNoticeSentAction(params: { id: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const now = new Date().toISOString();

    const { data: updated, error } = await db
      .from("notification_outbox")
      .update({ status: "sent", approved_by: auth.userId, approved_at: now, sent_at: now })
      .eq("id", params.id)
      .in("status", ["draft", "approved", "failed"])
      .select("id, student_id, ref_session_id");
    if (error) throw new Error(error.message);
    if (!updated || updated.length === 0) return { ok: true }; // 이미 보냄 처리됨/취소됨 → 멱등

    const row = updated[0] as any;
    if (row.ref_session_id) {
      await db.from("attendance_records").update({ notified_at: now }).eq("session_id", row.ref_session_id).eq("student_id", row.student_id);
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "보냄 표시 실패" };
  }
}

/** 초안 취소 (보낸 뒤에는 취소할 수 없다). 취소해도 나중에 다시 초안을 만들 수 있다. */
export async function cancelNoticeAction(params: { id: string }): Promise<Result> {
  try {
    const auth = await requireStaff();
    if (auth.error) return { ok: false, error: auth.error };
    const db = getServiceRoleClient();
    const { data, error } = await db
      .from("notification_outbox")
      .update({ status: "cancelled" })
      .eq("id", params.id)
      .in("status", ["draft", "approved", "failed"])
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { ok: false, error: "이미 보낸 안내는 취소할 수 없습니다." };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "취소 실패" };
  }
}
