export const dynamic = "force-dynamic";

// 과거 Updated TOEFL 시험 일괄 삭제.
// 배정된 시험은 기본적으로 건너뛰고, unassign=true 일 때만 해당 시험의 배정을 먼저 취소한 뒤 삭제한다.
// (FK가 cascade일 수 있어서, 삭제 전에 배정을 직접 정리해 다른 섹션 배정이 같이 날아가지 않게 한다.)
import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getAssignedTestIds, type AssignableSection } from "@/lib/supabase/assignment-guard";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { SECTION_TABLE, isToeflSection } from "@/lib/admin/toeflReview";

export const runtime = "nodejs";

const FK_COLUMN: Record<AssignableSection, string> = {
  reading: "reading_test_id",
  listening: "listening_test_id",
  speaking: "speaking_test_id",
  writing: "writing_test_id",
};
const ALL_FK = Object.values(FK_COLUMN);

/** 배정 행이 이 시험만 가리키면 행 삭제, 다른 섹션 시험도 있으면 해당 컬럼/섹션만 제거 */
async function unassign(section: AssignableSection, ids: string[]) {
  const service = getServiceSupabase();
  const col = FK_COLUMN[section];
  const { data, error } = await service
    .from("test_assignments")
    .select(`id,sections,${ALL_FK.join(",")}`)
    .in(col, ids);
  if (error) throw error;

  let removed = 0;
  for (const row of (data ?? []) as any[]) {
    const othersLeft = ALL_FK.some((c) => c !== col && row[c]);
    if (!othersLeft) {
      const { error: e } = await service.from("test_assignments").delete().eq("id", row.id);
      if (e) throw e;
    } else {
      const sections = (row.sections ?? []).filter((x: string) => x !== section);
      const { error: e } = await service.from("test_assignments").update({ [col]: null, sections }).eq("id", row.id);
      if (e) throw e;
    }
    removed++;
  }
  return removed;
}

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { section, ids, unassign: doUnassign } = (await req.json()) as {
      section: unknown;
      ids: unknown;
      unassign?: boolean;
    };
    if (!isToeflSection(section) || !Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== "string")) {
      return NextResponse.json({ ok: false, error: "section/ids가 올바르지 않습니다." }, { status: 400 });
    }

    const assigned = await getAssignedTestIds(section);
    const skipped = doUnassign ? [] : (ids as string[]).filter((i) => assigned.has(i));
    const target = (ids as string[]).filter((i) => !skipped.includes(i));

    let unassignedCount = 0;
    if (doUnassign) {
      const toUnassign = target.filter((i) => assigned.has(i));
      if (toUnassign.length > 0) unassignedCount = await unassign(section, toUnassign);
    }

    if (target.length > 0) {
      const { error } = await getServiceSupabase().from(SECTION_TABLE[section]).delete().in("id", target);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, deleted: target, skippedAssigned: skipped, unassignedCount });
  } catch (e: any) {
    console.error("TOEFL DELETE ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
