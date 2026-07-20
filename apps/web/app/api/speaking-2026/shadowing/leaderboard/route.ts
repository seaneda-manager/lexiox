// app/api/speaking-2026/shadowing/leaderboard/route.ts
// 쉐도잉 게임 랭킹 — student_point_ledger(rule_id='shadowing_sentence')를 학생별로 합산
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;
const TOP_N = 10;

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !service) return null;
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const service = getServiceSupabase();
    if (!service) {
      return NextResponse.json({ ok: false, error: "Server misconfigured" }, { status: 500 });
    }

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const { data: rows, error } = await service
      .from("student_point_ledger")
      .select("student_id, points, bonus_points")
      .eq("rule_id", "shadowing_sentence")
      .gte("earned_at", since);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const totals = new Map<string, number>();
    for (const row of rows ?? []) {
      const studentId = row.student_id as string;
      const points = (row.points as number) + (row.bonus_points as number);
      totals.set(studentId, (totals.get(studentId) ?? 0) + points);
    }

    const studentIds = Array.from(totals.keys());
    const nameById = new Map<string, string>();

    if (studentIds.length > 0) {
      const { data: profiles } = await service
        .from("profiles")
        .select("id, full_name, name")
        .in("id", studentIds);

      for (const p of profiles ?? []) {
        const name = (p.full_name as string) || (p.name as string) || "학생";
        nameById.set(p.id as string, name);
      }
    }

    const ranked = Array.from(totals.entries())
      .map(([studentId, points]) => ({
        studentId,
        name: nameById.get(studentId) ?? "학생",
        points,
      }))
      .sort((a, b) => b.points - a.points);

    const myIndex = ranked.findIndex((r) => r.studentId === user.id);

    return NextResponse.json({
      ok: true,
      top: ranked.slice(0, TOP_N).map((r, i) => ({ rank: i + 1, name: r.name, points: r.points })),
      me:
        myIndex >= 0
          ? { rank: myIndex + 1, points: ranked[myIndex].points }
          : { rank: null, points: 0 },
    });
  } catch (error) {
    console.error("[speaking-2026.shadowing.leaderboard] error", error);
    return NextResponse.json({ ok: false, error: "Failed to load leaderboard." }, { status: 500 });
  }
}
