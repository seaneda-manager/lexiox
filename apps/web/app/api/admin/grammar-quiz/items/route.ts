export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { countWords, GRAMMAR_TRACKS, QUIZ_ITEM_TYPES } from "@/models/grammar/quiz";
import type { GrammarTrack, QuizItemType } from "@/models/grammar/quiz";

function applyFilters(q: any, sp: URLSearchParams) {
  const tracks = sp.getAll("track").filter((t) => GRAMMAR_TRACKS.includes(t as GrammarTrack));
  const types = sp.getAll("type").filter((t) => QUIZ_ITEM_TYPES.includes(t as QuizItemType));
  const elements = sp.getAll("element").filter(Boolean);
  const vocabMax = Number(sp.get("vocab_level_max"));
  const wcMin = Number(sp.get("word_count_min"));
  const wcMax = Number(sp.get("word_count_max"));

  if (tracks.length) q = q.in("track", tracks);
  if (types.length) q = q.in("item_type", types);
  if (elements.length) q = q.in("element_code", elements);
  if (Number.isFinite(vocabMax) && vocabMax > 0) q = q.lte("vocab_level", vocabMax);
  if (Number.isFinite(wcMin) && wcMin > 0) q = q.gte("word_count", wcMin);
  if (Number.isFinite(wcMax) && wcMax > 0) q = q.lte("word_count", wcMax);
  return q;
}

// GET /api/admin/grammar-quiz/items?track=&type=&element=&vocab_level_max=&word_count_min=&word_count_max=&countOnly=1
export async function GET(req: Request) {
  try {
    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sp = new URL(req.url).searchParams;
    const db = getServiceRoleClient();
    const countOnly = sp.get("countOnly") === "1";

    if (countOnly) {
      let q = db.from("grammar_quiz_items").select("id", { count: "exact", head: true }).eq("status", "active");
      q = applyFilters(q, sp);
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, count: count ?? 0 }, { headers: { "Cache-Control": "no-store" } });
    }

    let q = db
      .from("grammar_quiz_items")
      .select("*")
      .eq("status", sp.get("status") === "archived" ? "archived" : "active")
      .order("created_at", { ascending: false })
      .limit(Math.min(500, Number(sp.get("limit")) || 200));
    q = applyFilters(q, sp);
    const { data, error } = await q;
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, items: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

// POST /api/admin/grammar-quiz/items — 단건 또는 배열 저장 (AI 생성 검토본 / 수동)
export async function POST(req: Request) {
  try {
    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const list: any[] = Array.isArray(body) ? body : Array.isArray(body?.items) ? body.items : [body];

    const rows = list
      .map((it) => {
        const item_type = it?.item_type === "judgment" ? "judgment" : "fill";
        const stem = String(it?.stem ?? "").trim();
        const answer = String(it?.answer ?? "").trim();
        const track = GRAMMAR_TRACKS.includes(it?.track) ? it.track : null;
        if (!stem || !answer || !track) return null;
        if (item_type === "fill" && !stem.includes("___")) return null;
        let vl = Number(it?.vocab_level);
        if (!Number.isFinite(vl)) vl = 3;
        vl = Math.min(5, Math.max(1, Math.round(vl)));
        return {
          stem,
          item_type,
          answer: item_type === "judgment" ? answer.toLowerCase() : answer,
          distractors: Array.isArray(it?.distractors) ? it.distractors.map((x: any) => String(x)).filter(Boolean) : [],
          element_code: it?.element_code || null,
          track,
          word_count: countWords(stem.replace(/___/g, "x")),
          vocab_level: vl,
          explanation: it?.explanation ? String(it.explanation) : null,
          source: ["ai", "manual", "import"].includes(it?.source) ? it.source : "manual",
          created_by: user.id,
        };
      })
      .filter(Boolean);

    if (rows.length === 0) return NextResponse.json({ error: "저장할 유효한 문항이 없습니다." }, { status: 400 });

    const db = getServiceRoleClient();
    const { data, error } = await db.from("grammar_quiz_items").insert(rows).select("id");
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, saved: data?.length ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
