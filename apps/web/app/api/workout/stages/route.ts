export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { resolveAcademyStudentId } from "@/lib/workout/perk";

/**
 * GET /api/workout/stages
 * 로그인한 학생에게 배정된 단어 과정(track)과 Day(=게임 스테이지) 목록.
 * 읽기 전용. 스키마 변경 없음.
 *
 * Response: { tracks: [{ id, title, stages: [{ setId, day, status }] }] }
 *   status: COMPLETED | STARTED | ASSIGNED | LATER (아직 배정 전)
 */
export async function GET() {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getServiceRoleClient();

    // 단어 숙제 표의 student_id 는 academy_students.id (로그인 계정 ID와 다르다)
    const academyId = await resolveAcademyStudentId(user.id);
    if (!academyId) return NextResponse.json({ tracks: [] });

    // 학생의 활성 플랜 → 과정 목록
    const { data: plans } = await admin
      .from("student_vocab_plans")
      .select("track_id, cursor_day_index, is_enabled")
      .eq("student_id", academyId)
      .eq("is_enabled", true);

    const trackIds = Array.from(new Set((plans ?? []).map((p) => p.track_id as string)));
    if (trackIds.length === 0) return NextResponse.json({ tracks: [] });

    const [{ data: tracks }, { data: sets }, { data: assigns }] = await Promise.all([
      admin.from("vocab_tracks").select("id, title").in("id", trackIds),
      admin.from("vocab_sets").select("id, track_id, order_index").in("track_id", trackIds).not("order_index", "is", null).order("order_index", { ascending: true }),
      admin.from("student_vocab_assignments").select("set_id, status, completed_at").eq("student_id", academyId).in("track_id", trackIds),
    ]);

    const statusBySet = new Map<string, string>();
    // 완료 여부는 completed_at 이 권위 신호(깜지까지 끝낸 뒤 찍힘). status 컬럼은 보조.
    for (const a of assigns ?? []) statusBySet.set(a.set_id as string, a.completed_at ? "COMPLETED" : ((a.status as string) || "ASSIGNED"));

    const result = (tracks ?? []).map((t) => ({
      id: t.id as string,
      title: (t.title as string) ?? "단어 과정",
      stages: (sets ?? [])
        .filter((s) => s.track_id === t.id)
        .map((s) => ({
          setId: s.id as string,
          day: s.order_index as number,
          status: statusBySet.get(s.id as string) ?? "LATER",
        })),
    }));

    return NextResponse.json({ tracks: result });
  } catch (e) {
    console.error("[workout/stages]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
