export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { countWords, unitLevelToTrack } from "@/models/grammar/quiz";
import { matchElementCode } from "@/lib/grammar/quizElements";

// POST /api/admin/grammar-quiz/import-drills
// 기존 grammar_2026_drills(fill/judgment) → grammar_quiz_items 로 임포트.
// origin_drill_id 유니크 인덱스로 재실행 시 중복은 건너뜀.
export async function POST() {
  try {
    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getServiceRoleClient();

    const [{ data: drills, error: dErr }, { data: units }, { data: existing }] = await Promise.all([
      db.from("grammar_2026_drills").select("id, unit_id, type, sentence, answer, distractors, grammar_labels"),
      db.from("grammar_2026_units").select("id, level"),
      db.from("grammar_quiz_items").select("origin_drill_id").not("origin_drill_id", "is", null),
    ]);
    if (dErr) throw new Error(dErr.message);

    const levelByUnit = new Map((units ?? []).map((u: any) => [u.id, u.level]));
    const done = new Set((existing ?? []).map((r: any) => r.origin_drill_id));

    const rows: any[] = [];
    const unmatchedElement: string[] = [];
    let skipped = 0;

    for (const d of drills ?? []) {
      if (done.has(d.id)) { skipped++; continue; }
      const item_type = d.type === "judgment" ? "judgment" : d.type === "fill" ? "fill" : null;
      if (!item_type) { skipped++; continue; }

      let stem = String(d.sentence ?? "").trim();
      const answer = String(d.answer ?? "").trim();
      if (!stem || !answer) { skipped++; continue; }

      if (item_type === "fill" && !stem.includes("___")) {
        const re = new RegExp(`\\b${answer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (re.test(stem)) stem = stem.replace(re, "___");
        else { skipped++; continue; }
      }

      const correctLabel = (d.grammar_labels ?? []).find((l: any) => l?.is_correct)?.label_ko ?? "";
      const element_code = matchElementCode(correctLabel);
      if (correctLabel && !element_code && !unmatchedElement.includes(correctLabel)) {
        unmatchedElement.push(correctLabel);
      }

      rows.push({
        stem,
        item_type,
        answer: item_type === "judgment" ? answer.toLowerCase() : answer,
        distractors: item_type === "judgment" ? [] : (Array.isArray(d.distractors) ? d.distractors : []),
        element_code,
        track: unitLevelToTrack(levelByUnit.get(d.unit_id)),
        word_count: countWords(stem.replace(/___/g, "x")),
        vocab_level: 3,
        source: "import",
        origin_drill_id: d.id,
        created_by: user.id,
      });
    }

    let imported = 0;
    if (rows.length) {
      const { data, error } = await db
        .from("grammar_quiz_items")
        .upsert(rows, { onConflict: "origin_drill_id", ignoreDuplicates: true })
        .select("id");
      if (error) throw new Error(error.message);
      imported = data?.length ?? 0;
    }

    return NextResponse.json({ ok: true, imported, skipped, unmatchedElement });
  } catch (e: any) {
    console.error("GRAMMAR-QUIZ IMPORT ERROR", e);
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
