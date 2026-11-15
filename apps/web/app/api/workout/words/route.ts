export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { resolveAcademyStudentId } from "@/lib/workout/perk";

/**
 * GET /api/workout/words?setId=<vocab_sets.id>
 * 한 세트(Day)의 단어를 "게임용 문제 재료" 모양으로 돌려준다. 읽기 전용. 스키마 변경 없음.
 * 접근: 그 세트가 로그인한 학생에게 배정돼 있거나, 직원(admin/teacher/hq_staff/franchisee)일 때만.
 *
 * Response: { items: [{ id, word, ko, def, pos, pron, synonyms[] }] }
 */
const STAFF = new Set(["admin", "teacher", "hq_staff", "franchisee"]);

export async function GET(req: Request) {
  try {
    const setId = new URL(req.url).searchParams.get("setId");
    if (!setId) return NextResponse.json({ error: "setId is required" }, { status: 400 });

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getServiceRoleClient();

    // 접근 권한: 직원이거나, 이 세트가 이 학생에게 배정돼 있어야 한다
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isStaff = STAFF.has((profile?.role as string) ?? "");
    if (!isStaff) {
      // 단어 숙제 표의 student_id 는 academy_students.id
      const academyId = await resolveAcademyStudentId(user.id);
      if (!academyId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const { data: mine } = await admin.from("student_vocab_assignments").select("id").eq("student_id", academyId).eq("set_id", setId).limit(1);
      if (!mine || mine.length === 0) {
        // 선생님이 게임으로 직접 내준 세트도 열 수 있다
        const { data: given } = await admin.from("game_assignments").select("id").eq("student_id", academyId).eq("set_id", setId).is("cancelled_at", null).limit(1);
        if (!given || given.length === 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const { data: setItems } = await admin.from("vocab_set_items").select("word_id, sort_order").eq("set_id", setId).order("sort_order", { ascending: true });
    const wordIds = (setItems ?? []).map((r) => r.word_id as string);
    if (wordIds.length === 0) return NextResponse.json({ items: [] });

    const { data: words } = await admin
      .from("words")
      .select("id, text, pos, meanings_ko, meanings_en_simple, pronunciation_ko")
      .in("id", wordIds);

    // 동의어(1순위). 그림 동의어 게임과 오답 보기 만들기에 쓴다.
    const { data: synRows } = await admin
      .from("word_synonyms")
      .select("word_id, synonym:words!word_synonyms_synonym_word_id_fkey(text)")
      .in("word_id", wordIds)
      .eq("tier", 1);
    const synBy = new Map<string, string[]>();
    for (const row of synRows ?? []) {
      const text = (row as unknown as { synonym?: { text?: string } }).synonym?.text;
      if (!text) continue;
      const list = synBy.get(row.word_id as string) ?? [];
      list.push(text);
      synBy.set(row.word_id as string, list);
    }

    const byId = new Map((words ?? []).map((w) => [w.id as string, w]));
    const items = wordIds
      .map((id) => byId.get(id))
      .filter((w): w is NonNullable<typeof w> => !!w)
      .map((w) => ({
        id: w.id as string,
        word: w.text as string,
        ko: ((w.meanings_ko as string[] | null) ?? [])[0] ?? "",
        def: ((w.meanings_en_simple as string[] | null) ?? [])[0] ?? "",
        pos: (w.pos as string | null) ?? "",
        pron: (w.pronunciation_ko as string | null) ?? "",
        synonyms: synBy.get(w.id as string) ?? [],
      }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("[workout/words]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
