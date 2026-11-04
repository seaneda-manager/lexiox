export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { countDueReviewByTrack } from "@/lib/vocab/review/reviewItems";

/**
 * GET /api/vocab/test/review-summary[?track_id=...]
 * 오늘 복습해야 할 단어 수.
 *  - track_id 있으면: { due_count }               (그 교재)
 *  - 없으면:        { due_count, by_track: {...} } (전체 합계 + 교재별)
 * 복습 테이블이 아직 없거나 오류여도 0 으로 응답한다 (화면이 깨지지 않게).
 */
export async function GET(req: NextRequest) {
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
      }
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data: studentRow } = await admin
      .from("academy_students")
      .select("id")
      .or(`user_id.eq.${user.id},auth_user_id.eq.${user.id},profile_id.eq.${user.id}`)
      .maybeSingle();
    const studentId = studentRow?.id;
    if (!studentId) return NextResponse.json({ due_count: 0, by_track: {} });

    const byTrack = await countDueReviewByTrack(admin, { studentId });
    const trackId = req.nextUrl.searchParams.get("track_id");
    if (trackId) return NextResponse.json({ due_count: byTrack[trackId] ?? 0 });

    const total = Object.values(byTrack).reduce((a, b) => a + b, 0);
    return NextResponse.json({ due_count: total, by_track: byTrack });
  } catch (e) {
    console.error("review-summary error:", e);
    return NextResponse.json({ due_count: 0, by_track: {} });
  }
}
