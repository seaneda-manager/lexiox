export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getBalance, getPerkSettings, grantMinutes, isStaffRole, kstToday } from "@/lib/workout/perk";

/**
 * 게임 플레이 시간(보상) 상태/차감.
 *  GET   → 오늘 잔액·적립 현황. 직원(admin/teacher/franchisee/hq_staff)은 unlimited(미리보기).
 *  POST  → 플레이 시간 차감(1분 단위). 시작할 때 1번, 이후 60초마다 클라이언트가 호출.
 *          잔액이 없으면 { ok:false, locked:true }. 같은 학생이 50초 안에 또 부르면(멀티탭/연타) 중복 차감하지 않는다.
 * 장부 쓰기는 서비스 롤(서버)만 — 학생이 시간을 만들 수 없다.
 */
async function whoami() {
  const authed = await getServerSupabase();
  const {
    data: { user },
  } = await authed.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  const { data: profile } = await authed.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { user, staff: isStaffRole(profile?.role as string) } as const;
}

export async function GET() {
  const me = await whoami();
  if ("error" in me) return me.error;

  if (me.staff) return NextResponse.json({ ok: true, unlimited: true, balance: 0, earnedToday: 0, usedToday: 0, homeworkDone: false, academyChecked: false });

  const day = kstToday();
  const db = getServiceSupabase();
  const [bal, settings, rows] = await Promise.all([
    getBalance(me.user.id, day),
    getPerkSettings(),
    db.from("game_perk_ledger").select("reason, minutes").eq("student_id", me.user.id).eq("day", day).gt("minutes", 0),
  ]);
  const reasons = new Set((rows.data ?? []).map((r) => r.reason as string));
  return NextResponse.json({
    ok: true,
    unlimited: false,
    balance: bal.balance,
    earnedToday: bal.earnedToday,
    usedToday: bal.usedToday,
    homeworkDone: reasons.has("homework_done"),
    academyChecked: reasons.has("academy_checked"),
    homeworkMinutes: settings.homework_minutes,
    academyMinutes: settings.academy_minutes,
  });
}

export async function POST() {
  const me = await whoami();
  if ("error" in me) return me.error;
  if (me.staff) return NextResponse.json({ ok: true, unlimited: true });

  const day = kstToday();
  const bal = await getBalance(me.user.id, day);
  if (bal.balance <= 0) return NextResponse.json({ ok: false, locked: true, balance: 0 });

  // 50초 안에 이미 차감했다면(멀티탭·연타) 이번에는 차감하지 않는다
  const db = getServiceSupabase();
  const { data: last } = await db.from("game_perk_ledger").select("created_at").eq("student_id", me.user.id).eq("reason", "play_used").order("created_at", { ascending: false }).limit(1);
  const lastAt = last && last[0] ? Date.parse(last[0].created_at as string) : 0;
  if (Date.now() - lastAt < 50_000) return NextResponse.json({ ok: true, deducted: false, balance: bal.balance });

  const g = await grantMinutes({ studentId: me.user.id, minutes: -1, reason: "play_used", day });
  if ("error" in g) return NextResponse.json({ error: g.error }, { status: 500 });
  return NextResponse.json({ ok: true, deducted: true, balance: bal.balance - 1 });
}
