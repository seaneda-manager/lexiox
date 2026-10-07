export const dynamic = "force-dynamic";

// 과거 Updated TOEFL 시험 일괄 삭제. 학생에게 배정된 시험은 건너뛴다
// (test_assignments FK on delete cascade로 학생 배정 기록까지 날아가기 때문).
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getAssignedTestIds } from "@/lib/supabase/assignment-guard";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { SECTION_TABLE, isToeflSection } from "@/lib/admin/toeflReview";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { section, ids } = (await req.json()) as { section: unknown; ids: unknown };
    if (!isToeflSection(section) || !Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== "string")) {
      return NextResponse.json({ ok: false, error: "section/ids가 올바르지 않습니다." }, { status: 400 });
    }

    const assigned = await getAssignedTestIds(section);
    const skipped = (ids as string[]).filter((i) => assigned.has(i));
    const target = (ids as string[]).filter((i) => !assigned.has(i));

    if (target.length > 0) {
      const { error } = await getServiceSupabase().from(SECTION_TABLE[section]).delete().in("id", target);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, deleted: target, skippedAssigned: skipped });
  } catch (e: any) {
    console.error("TOEFL DELETE ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
