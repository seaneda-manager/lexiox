export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

/**
 * GET /api/vocab/stats
 * 학생 본인의 단어 학습 통계 (대시보드용).
 *  - courses: 활성 교재별 배정 Day 수 / 완료 Day 수 / 시도 수 / 약한 단어 수
 *  - attempts: 최근 시도(stage, wrong_word_ids, attempted_at) 최대 2000건
 *  - words: 자주 틀린 단어의 id -> text
 * 브라우저 클라이언트는 RLS 때문에 비어 보일 수 있어 서버에서 service role 로 조회한다.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: studentRow } = await admin
      .from("academy_students")
      .select("id")
      .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id},profile_id.eq.${user.id}`)
      .maybeSingle();
    const studentId = studentRow?.id as string | undefined;
    if (!studentId) return NextResponse.json({ ok: true, studentId: null, courses: [], attempts: [], words: {} });

    const [{ data: plans }, { data: assigns }, { data: attempts }] = await Promise.all([
      admin.from("student_vocab_plans").select("track_id").eq("student_id", studentId).eq("is_active", true),
      admin.from("student_vocab_assignments").select("track_id, set_id, completed_at").eq("student_id", studentId),
      admin
        .from("vocab_learning_attempts")
        .select("set_id, wrong_word_ids, stage, attempted_at")
        .eq("student_id", studentId)
        .order("attempted_at", { ascending: false })
        .limit(2000),
    ]);

    const trackIds = Array.from(
      new Set([
        ...((plans as any[]) ?? []).map((p) => String(p.track_id)),
        ...((assigns as any[]) ?? []).map((a) => String(a.track_id)),
      ]),
    ).filter(Boolean);

    const titleById = new Map<string, string>();
    if (trackIds.length > 0) {
      const { data: tracks } = await admin.from("vocab_tracks").select("id, title").in("id", trackIds);
      for (const t of (tracks as any[]) ?? []) titleById.set(String(t.id), String(t.title ?? ""));
    }

    const trackBySet = new Map<string, string>();
    for (const a of (assigns as any[]) ?? []) trackBySet.set(String(a.set_id), String(a.track_id));

    const courses = trackIds.map((trackId) => {
      const mine = ((assigns as any[]) ?? []).filter((a) => String(a.track_id) === trackId);
      const weak = new Set<string>();
      let attemptCount = 0;
      for (const at of (attempts as any[]) ?? []) {
        if (trackBySet.get(String(at.set_id)) !== trackId) continue;
        attemptCount++;
        for (const w of Array.isArray(at.wrong_word_ids) ? at.wrong_word_ids : []) weak.add(String(w));
      }
      return {
        courseId: trackId,
        courseName: titleById.get(trackId) || "단어장",
        totalDays: mine.length,
        completedDays: mine.filter((a) => a.completed_at != null).length,
        totalAttempts: attemptCount,
        weakWordIds: [...weak],
      };
    });

    // 자주 틀린 단어 상위 20의 텍스트
    const freq = new Map<string, number>();
    for (const at of (attempts as any[]) ?? []) {
      for (const w of Array.isArray(at.wrong_word_ids) ? at.wrong_word_ids : []) {
        freq.set(String(w), (freq.get(String(w)) ?? 0) + 1);
      }
    }
    const topIds = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([id]) => id);
    const words: Record<string, string> = {};
    if (topIds.length > 0) {
      const { data: rows } = await admin.from("words").select("id, text").in("id", topIds);
      for (const w of (rows as any[]) ?? []) words[String(w.id)] = String(w.text ?? "");
    }

    return NextResponse.json({ ok: true, studentId, courses, attempts: attempts ?? [], words });
  } catch (e: any) {
    console.error("[/api/vocab/stats] error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
