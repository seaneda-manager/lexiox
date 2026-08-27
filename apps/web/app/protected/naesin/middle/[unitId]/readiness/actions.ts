// apps/web/app/protected/naesin/middle/[unitId]/readiness/actions.ts
"use server";

import { getServerSupabase } from "@/lib/supabase/server";
import { allSubElementPairs, type ReadinessElement } from "@/lib/naesinReadiness/subElements";

export type ReadinessRow = {
  id: string;
  element: ReadinessElement;
  sub_element: string;
  perform_status: "not_started" | "in_progress" | "done";
  check_status: "not_started" | "in_progress" | "done";
  test_status: "not_started" | "in_progress" | "done";
  test_score: number | null;
};

/** 이 유닛의 readiness 행을 전부 가져오되, 없는 sub요소는 upsert로 채워서 반환 */
export async function getOrInitReadinessAction(params: { unitId: string }) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "로그인이 필요합니다." };

    const { data: existing, error: selErr } = await supabase
      .from("student_readiness")
      .select("id, element, sub_element, perform_status, check_status, test_status, test_score")
      .eq("student_id", user.id)
      .eq("unit_id", params.unitId);
    if (selErr) throw new Error(selErr.message);

    const existingKeys = new Set((existing ?? []).map((r: any) => `${r.element}::${r.sub_element}`));
    const missing = allSubElementPairs().filter((p) => !existingKeys.has(`${p.element}::${p.subElement}`));

    if (missing.length > 0) {
      const inserts = missing.map((p) => ({
        student_id: user.id,
        unit_id: params.unitId,
        element: p.element,
        sub_element: p.subElement,
      }));
      const ins = await supabase.from("student_readiness").insert(inserts).select(
        "id, element, sub_element, perform_status, check_status, test_status, test_score"
      );
      if (ins.error) throw new Error(ins.error.message);
      return { ok: true, rows: [...(existing ?? []), ...(ins.data ?? [])] as ReadinessRow[] };
    }

    return { ok: true, rows: (existing ?? []) as ReadinessRow[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "readiness 조회 실패" };
  }
}

const NEXT_STATUS: Record<string, "not_started" | "in_progress" | "done"> = {
  not_started: "in_progress",
  in_progress: "done",
  done: "not_started",
};

/** 클릭할 때마다 not_started → in_progress → done → not_started 순환 */
export async function advanceStageAction(params: {
  readinessId: string;
  stage: "perform" | "check" | "test";
}) {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "로그인이 필요합니다." };

    const col = `${params.stage}_status` as "perform_status" | "check_status" | "test_status";

    const { data: row, error: selErr } = await supabase
      .from("student_readiness")
      .select(`id, ${col}`)
      .eq("id", params.readinessId)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);
    if (!row) throw new Error("readiness row not found");

    const current = (row as any)[col] as string;
    const next = NEXT_STATUS[current] ?? "in_progress";

    const upd = await supabase
      .from("student_readiness")
      .update({ [col]: next, updated_at: new Date().toISOString() })
      .eq("id", params.readinessId);
    if (upd.error) throw new Error(upd.error.message);

    return { ok: true, newStatus: next };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "업데이트 실패" };
  }
}
