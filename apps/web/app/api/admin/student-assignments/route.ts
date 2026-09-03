export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getStudentAssignmentCalendar, resolveStudentIds } from "@/lib/assignments/studentAssignmentCalendar";

// GET /api/admin/student-assignments?authId=&academyId=&from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: Request) {
  try {
    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await authed.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["admin", "teacher"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sp = new URL(req.url).searchParams;
    const from = sp.get("from");
    const to = sp.get("to");
    if (!from || !to || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: "from/to (YYYY-MM-DD) 필요" }, { status: 400 });
    }

    let authId = sp.get("authId");
    let academyId = sp.get("academyId");
    if (!authId && !academyId) {
      return NextResponse.json({ error: "authId 또는 academyId 필요" }, { status: 400 });
    }
    // 하나만 넘어오면 나머지 해석
    if (authId && !academyId) {
      academyId = (await resolveStudentIds(authId)).academyId;
    } else if (academyId && !authId) {
      const r = await resolveStudentIds(academyId);
      authId = r.authId;
      academyId = r.academyId ?? academyId;
    }

    const items = await getStudentAssignmentCalendar({
      authUserId: authId,
      academyStudentId: academyId,
      fromIso: from,
      toIso: to,
    });

    return NextResponse.json({ ok: true, items }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("STUDENT-ASSIGNMENTS ERROR", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
