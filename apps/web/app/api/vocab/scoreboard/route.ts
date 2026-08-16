export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { resolvePeriodRange, type ScoreboardPeriod } from "@/lib/vocab/scoreboard/period";
import type { ScoreboardEntry, ScoreboardRanking, ScoreboardResponse } from "@/models/vocab/scoreboard.types";

const TOP_N = 10;
const RETAKE_WEIGHT = 1 / 3;
const VALID_PERIODS: ScoreboardPeriod[] = ["daily", "weekly", "monthly", "6month", "yearly"];

type SessionRow = {
  student_id: string;
  track_id: string;
  day_number: number;
  started_at: string;
  correct_count: number | null;
  total_points: number | null;
};

/**
 * GET /api/vocab/scoreboard?period=daily|weekly|monthly|6month|yearly
 * 학교 전체 랭킹: 최다 정답 단어 / 최고 점수 (기간 필터)
 * 같은 (student, track, day) 재응시는 최초 1회만 만점, 이후는 1/3 가중치로 집계
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const periodParam = req.nextUrl.searchParams.get("period") ?? "weekly";
    const period = (VALID_PERIODS as string[]).includes(periodParam)
      ? (periodParam as ScoreboardPeriod)
      : "weekly";

    const { start, end } = resolvePeriodRange(period);

    const service = getServiceRoleClient();
    const { data: rows, error } = await service
      .from("vocab_test_sessions")
      .select("student_id, track_id, day_number, started_at, correct_count, total_points")
      .eq("status", "graded")
      .gte("submitted_at", start.toISOString())
      .lt("submitted_at", end.toISOString())
      .limit(10000);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // (student, track, day) 그룹핑 → 최초 응시 = 만점, 재응시 = 1/3 가중치
    const groups = new Map<string, SessionRow[]>();
    for (const row of (rows ?? []) as SessionRow[]) {
      const key = `${row.student_id}|${row.track_id}|${row.day_number}`;
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }

    const wordsTotals = new Map<string, number>();
    const pointsTotals = new Map<string, number>();

    for (const list of groups.values()) {
      list.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime());
      list.forEach((row, idx) => {
        const weight = idx === 0 ? 1 : RETAKE_WEIGHT;
        const studentId = row.student_id;
        wordsTotals.set(
          studentId,
          (wordsTotals.get(studentId) ?? 0) + (row.correct_count ?? 0) * weight
        );
        pointsTotals.set(
          studentId,
          (pointsTotals.get(studentId) ?? 0) + (row.total_points ?? 0) * weight
        );
      });
    }

    const studentIds = Array.from(
      new Set([...wordsTotals.keys(), ...pointsTotals.keys()])
    );

    const nameById = await resolveNames(service, studentIds);

    const words = buildRanking(wordsTotals, nameById, user.id);
    const points = buildRanking(pointsTotals, nameById, user.id);

    return NextResponse.json({
      period,
      range: { start: start.toISOString(), end: end.toISOString() },
      words,
      points,
    } as ScoreboardResponse);
  } catch (error) {
    console.error("Scoreboard error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildRanking(
  totals: Map<string, number>,
  nameById: Map<string, string>,
  myUserId: string
): ScoreboardRanking {
  const ranked = Array.from(totals.entries())
    .map(([student_id, value]) => ({
      student_id,
      value: Math.round(value),
      name: nameById.get(student_id) ?? "학생",
    }))
    .sort((a, b) => b.value - a.value);

  const myIndex = ranked.findIndex((r) => r.student_id === myUserId);

  const top: ScoreboardEntry[] = ranked.slice(0, TOP_N).map((r, i) => ({
    rank: i + 1,
    student_id: r.student_id,
    name: r.name,
    value: r.value,
    is_me: r.student_id === myUserId,
  }));

  return {
    top,
    me:
      myIndex >= 0
        ? { rank: myIndex + 1, value: ranked[myIndex].value }
        : { rank: null, value: 0 },
  };
}

async function resolveNames(
  service: ReturnType<typeof getServiceRoleClient>,
  studentIds: string[]
): Promise<Map<string, string>> {
  const nameById = new Map<string, string>();
  if (studentIds.length === 0) return nameById;

  const orFilter = studentIds
    .map((id) => `auth_user_id.eq.${id},user_id.eq.${id},profile_id.eq.${id}`)
    .join(",");

  const { data: academyStudents } = await service
    .from("academy_students")
    .select("display_name, full_name, auth_user_id, user_id, profile_id")
    .or(orFilter);

  for (const s of academyStudents ?? []) {
    const name = (s.display_name as string) || (s.full_name as string) || "학생";
    for (const key of [s.auth_user_id, s.user_id, s.profile_id]) {
      if (key && studentIds.includes(key as string)) {
        nameById.set(key as string, name);
      }
    }
  }

  const missing = studentIds.filter((id) => !nameById.has(id));
  if (missing.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id, full_name, name")
      .in("id", missing);

    for (const p of profiles ?? []) {
      const name = (p.full_name as string) || (p.name as string) || "학생";
      nameById.set(p.id as string, name);
    }
  }

  return nameById;
}
