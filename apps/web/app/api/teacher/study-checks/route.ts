export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { ISO_DAY, getPerkSettings, grantMinutes, isStaffRole, kstToday } from "@/lib/workout/perk";

/**
 * 선생님의 "학원 학습 완료" 체크 → 학생의 게임 플레이 시간(분) 적립.
 *  GET    ?day=YYYY-MM-DD        학생 목록 + 그날의 체크/적립 현황
 *  POST   { profileId, day?, minutes?, note? }   체크(+ 적립). 같은 학생·날짜는 한 번만.
 *  DELETE ?profileId=&day=       체크 취소(+ 적립했던 분 회수)
 * 학생 ID는 로그인 계정 ID(profiles.id = academy_students.user_id/profile_id).
 */
async function requireStaff() {
  const authed = await getServerSupabase();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const { data: profile } = await authed.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !isStaffRole(profile.role as string)) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { user };
}

function resolveDay(raw: string | null | undefined): string {
  return raw && ISO_DAY.test(raw) ? raw : kstToday();
}

export async function GET(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;

  const day = resolveDay(new URL(req.url).searchParams.get("day"));
  const db = getServiceSupabase();

  const { data: roster, error } = await db.from("academy_students").select("id, user_id, profile_id, display_name, grade, school").eq("is_active", true).order("display_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (roster ?? []).map((r) => {
    const x = r as { id: string; user_id: string | null; profile_id: string | null; display_name: string | null; grade: string | null; school: string | null };
    return { academyId: String(x.id), profileId: x.user_id ?? x.profile_id ?? null, name: x.display_name ?? "(이름 없음)", grade: x.grade, school: x.school };
  });
  const ids = rows.map((r) => r.profileId).filter((v): v is string => !!v);

  const [checksRes, ledgerRes, settings] = await Promise.all([
    ids.length ? db.from("academy_study_checks").select("id, student_id, minutes_award, note, created_at").eq("day", day).in("student_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? db.from("game_perk_ledger").select("student_id, minutes").eq("day", day).in("student_id", ids) : Promise.resolve({ data: [] }),
    getPerkSettings(),
  ]);

  const checkBy = new Map((checksRes.data ?? []).map((c) => [c.student_id as string, c]));
  const balBy = new Map<string, number>();
  for (const l of ledgerRes.data ?? []) balBy.set(l.student_id as string, (balBy.get(l.student_id as string) ?? 0) + (l.minutes as number));

  const students = rows.map((r) => {
    const c = r.profileId ? checkBy.get(r.profileId) : undefined;
    return {
      ...r,
      checked: !!c,
      minutes: c ? ((c.minutes_award as number | null) ?? settings.academy_minutes) : 0,
      note: (c?.note as string | null) ?? "",
      balance: Math.max(0, r.profileId ? (balBy.get(r.profileId) ?? 0) : 0),
    };
  });

  return NextResponse.json({ ok: true, day, defaultMinutes: settings.academy_minutes, students });
}

export async function POST(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;

  const body = (await req.json().catch(() => ({}))) as { profileId?: string; day?: string; minutes?: number; note?: string };
  if (typeof body.profileId !== "string" || !body.profileId) return NextResponse.json({ error: "profileId 필요" }, { status: 400 });
  const day = resolveDay(body.day);
  const minutes = body.minutes === undefined || body.minutes === null ? null : Math.round(Number(body.minutes));
  if (minutes !== null && (!Number.isFinite(minutes) || minutes < 1 || minutes > 120)) return NextResponse.json({ error: "minutes는 1~120" }, { status: 400 });

  const db = getServiceSupabase();

  // 로그인 계정이 있는 학생만(프로필이 있어야 장부에 쓸 수 있다)
  const { data: prof } = await db.from("profiles").select("id").eq("id", body.profileId).maybeSingle();
  if (!prof) return NextResponse.json({ error: "로그인 계정이 없는 학생입니다" }, { status: 404 });

  // 이미 체크했으면 그대로 돌려준다(중복 적립 방지)
  const { data: existing } = await db.from("academy_study_checks").select("id, minutes_award").eq("student_id", body.profileId).eq("day", day).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, already: true });

  const { data: check, error: insErr } = await db
    .from("academy_study_checks")
    .insert({ student_id: body.profileId, day, checked_by: gate.user.id, minutes_award: minutes, note: body.note?.trim() || null })
    .select("id")
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const settings = await getPerkSettings();
  const award = minutes ?? settings.academy_minutes;
  const g = await grantMinutes({ studentId: body.profileId, minutes: award, reason: "academy_checked", refType: "academy_check", refId: check.id as string, grantedBy: gate.user.id, day });
  if ("error" in g) {
    // 적립에 실패하면 체크도 되돌려 서로 어긋나지 않게 한다
    await db.from("academy_study_checks").delete().eq("id", check.id);
    return NextResponse.json({ error: g.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, minutes: award });
}

export async function DELETE(req: Request) {
  const gate = await requireStaff();
  if ("error" in gate) return gate.error;

  const sp = new URL(req.url).searchParams;
  const profileId = sp.get("profileId");
  const day = resolveDay(sp.get("day"));
  if (!profileId) return NextResponse.json({ error: "profileId 필요" }, { status: 400 });

  const db = getServiceSupabase();
  const { data: check } = await db.from("academy_study_checks").select("id").eq("student_id", profileId).eq("day", day).maybeSingle();
  if (!check) return NextResponse.json({ ok: true, already: true });

  // 적립했던 분을 회수(장부는 지우지 않고 반대 부호로 남긴다)
  const { data: given } = await db.from("game_perk_ledger").select("minutes").eq("student_id", profileId).eq("reason", "academy_checked").eq("ref_id", check.id).maybeSingle();
  await db.from("academy_study_checks").delete().eq("id", check.id);
  if (given && (given.minutes as number) > 0) {
    await grantMinutes({ studentId: profileId, minutes: -(given.minutes as number), reason: "teacher_revoke", refType: "academy_check", grantedBy: gate.user.id, day });
  }
  return NextResponse.json({ ok: true });
}
