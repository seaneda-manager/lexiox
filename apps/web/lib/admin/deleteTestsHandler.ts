/**
 * 시험 삭제 공통 핸들러 (Reading/Listening/Speaking/Writing).
 *
 * 보호 장치 두 가지를 한 곳에서 보장한다.
 *  1) 관리자만 삭제 가능 — /api/admin 경로는 미들웨어가 막아 주지 않으므로 여기서 직접 확인한다.
 *  2) 학생에게 배정된 시험은 삭제 불가 — test_assignments가 시험을 FK(on delete cascade)로 참조하므로
 *     그대로 지우면 학생 배정 기록·응시 결과까지 같이 사라진다.
 */
import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacher";
import { getServiceSupabase } from "@/lib/supabase/service";
import { getAssignedTestIds, type AssignableSection } from "@/lib/supabase/assignment-guard";

type Options = {
  section: AssignableSection;
  /** 작성 테이블 (예: reading_tests_2026) */
  table: string;
  /** 배정 시 동기화되는 미러 테이블이 있으면 함께 정리한다 (Reading: reading_tests). */
  mirrorTable?: string;
};

export async function handleDeleteTests(req: Request, { section, table, mirrorTable }: Options): Promise<Response> {
  try {
    // 1) 관리자 확인
    try {
      const r = await requireTeacherOrAdmin();
      if (!r.isAdmin) return NextResponse.json({ ok: false, error: "관리자만 삭제할 수 있습니다." }, { status: 403 });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      const status = msg.startsWith("401") ? 401 : msg.startsWith("403") ? 403 : 500;
      return NextResponse.json({ ok: false, error: status === 500 ? msg : "권한이 없습니다." }, { status });
    }

    // 2) 입력 정리 (id 하나 또는 ids 배열 모두 허용)
    const body = (await req.json().catch(() => ({}))) as { id?: string; ids?: string[] };
    const ids = (Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : []).filter(
      (x): x is string => typeof x === "string" && x.trim().length > 0
    );
    if (ids.length === 0) return NextResponse.json({ ok: false, error: "삭제할 시험 id가 필요합니다." }, { status: 400 });

    // 3) 배정된 시험은 삭제 불가
    const assigned = await getAssignedTestIds(section);
    const blocked = ids.filter((id) => assigned.has(id));
    if (blocked.length > 0) {
      return NextResponse.json(
        { ok: false, error: "학생에게 배정된 시험은 삭제할 수 없습니다. 배정을 먼저 정리해 주세요." },
        { status: 403 }
      );
    }

    // 4) 삭제
    const sb = getServiceSupabase();
    const { error } = await sb.from(table).delete().in("id", ids);
    if (error) throw error;

    if (mirrorTable) {
      const { error: mirrorErr } = await sb.from(mirrorTable).delete().in("id", ids);
      if (mirrorErr) console.error(`[deleteTests] ${mirrorTable} 정리 실패(무시)`, mirrorErr.message);
    }

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (e: any) {
    console.error(`DELETE ${section} TEST ERROR`, e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
