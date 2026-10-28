export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { validateGrammarLesson, type GrammarLesson } from "@/models/middle-naesin/grammar-lesson";
import { generateLesson, reviewLesson, type ConceptCtx } from "@/lib/grammar-engine/lesson-ai";

type Db = ReturnType<typeof getServiceRoleClient>;

async function loadCtx(db: Db, conceptKey: string, level: number) {
  const { data: concept } = await db.from("grammar_concepts").select("id, key, title_ko, title_en, tier").eq("key", conceptKey).maybeSingle();
  if (!concept) return null;

  const [unitsRes, linksRes, lessonsRes] = await Promise.all([
    db.from("grammar_unit_concepts").select("unit:grammar_book_units(chapter_no, unit_no, title, page)").eq("concept_id", concept.id).order("sort_order"),
    db.from("grammar_concept_links").select("related:grammar_concepts!grammar_concept_links_related_id_fkey(title_ko)").eq("concept_id", concept.id).eq("relation", "contrast"),
    db.from("grammar_lessons").select("level, status, lesson").eq("concept_id", concept.id).eq("status", "final").neq("level", level),
  ]);

  const units = ((unitsRes.data ?? []) as any[])
    .map((r) => r.unit)
    .filter(Boolean)
    .map((u) => `${u.chapter_no}-${u.unit_no} ${u.title}${u.page ? ` (p.${u.page})` : ""}`);
  const contrast = ((linksRes.data ?? []) as any[]).map((r) => r.related?.title_ko).filter(Boolean);

  // 가장 가까운 레벨의 확정본을 핵심 규칙 참고용으로
  const finals = ((lessonsRes.data ?? []) as any[])
    .map((r) => ({ level: r.level as number, v: validateGrammarLesson(r.lesson) }))
    .filter((x) => x.v.ok)
    .sort((a, b) => Math.abs(a.level - level) - Math.abs(b.level - level));
  const ref = finals[0] ? { level: finals[0].level, lesson: (finals[0].v as { ok: true; lesson: GrammarLesson }).lesson } : null;

  const ctx: ConceptCtx = { titleKo: concept.title_ko, titleEn: concept.title_en, tier: concept.tier, units, contrast, refLesson: ref };
  return { concept, ctx };
}

// 확정 시 lesson 의 drill/문제를 grammar_items 로 복사 (단일 출처는 lesson, items 는 사본)
async function syncItems(db: Db, lessonId: string, conceptId: string, level: number, lesson: GrammarLesson, source: string) {
  const del = await db.from("grammar_items").delete().eq("lesson_id", lessonId);
  if (del.error) throw new Error(del.error.message);
  const base = { concept_id: conceptId, level, lesson_id: lessonId, status: "final", source };
  const rows = [
    ...lesson.drillFill.map((p) => ({ ...base, kind: "fill", payload: p })),
    ...lesson.drillFix.map((p) => ({ ...base, kind: "fix", payload: p })),
    ...lesson.questions.map((p) => ({ ...base, kind: p.kind, payload: p })),
  ];
  if (rows.length === 0) return 0;
  const ins = await db.from("grammar_items").insert(rows);
  if (ins.error) throw new Error(ins.error.message);
  return rows.length;
}

export async function POST(req: Request) {
  try {
    const { user } = await requireTeacherOrAdmin();
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const conceptKey = String(body?.conceptKey ?? "");
    const level = Number(body?.level);
    if (!conceptKey || !Number.isInteger(level) || level < 1 || level > 5) {
      return NextResponse.json({ ok: false, error: "conceptKey / level(1~5) 가 필요합니다." }, { status: 400 });
    }

    const db = getServiceRoleClient();
    const loaded = await loadCtx(db, conceptKey, level);
    if (!loaded) return NextResponse.json({ ok: false, error: "개념을 찾을 수 없습니다." }, { status: 404 });
    const { concept, ctx } = loaded;

    const { data: existing } = await db.from("grammar_lessons").select("*").eq("concept_id", concept.id).eq("level", level).maybeSingle();

    if (action === "generate") {
      // 확정본은 덮어쓰지 않는다. 먼저 초안으로 되돌려야 다시 생성할 수 있다.
      if (existing?.status === "final") {
        return NextResponse.json({ ok: false, error: "확정된 레슨은 다시 생성할 수 없습니다. 먼저 초안으로 되돌리세요." }, { status: 409 });
      }
      const gen = await generateLesson(ctx, level);
      if ("errors" in gen) {
        return NextResponse.json({ ok: false, error: `AI 결과가 형식에 맞지 않습니다: ${gen.errors.slice(0, 6).join(" / ")}` }, { status: 502 });
      }
      const row = { concept_id: concept.id, level, status: "draft", lesson: gen.lesson, source: "ai", ai_review: null, reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() };
      const { error } = await db.from("grammar_lessons").upsert(row, { onConflict: "concept_id,level" });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (!existing) return NextResponse.json({ ok: false, error: "레슨이 아직 없습니다. 먼저 생성하세요." }, { status: 404 });

    if (action === "review") {
      const v = validateGrammarLesson(existing.lesson);
      if (!v.ok) return NextResponse.json({ ok: false, error: "레슨 형식이 올바르지 않습니다." }, { status: 422 });
      const review = await reviewLesson(ctx, level, v.lesson);
      const { error } = await db.from("grammar_lessons").update({ ai_review: review }).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, review });
    }

    if (action === "save") {
      const v = validateGrammarLesson(body?.lesson);
      if ("errors" in v) return NextResponse.json({ ok: false, error: v.errors.slice(0, 8).join(" / ") }, { status: 422 });
      // 수정하면 항상 초안으로 돌아가고 AI 검수는 무효화, items 사본도 내린다.
      await db.from("grammar_items").delete().eq("lesson_id", existing.id);
      const { error } = await db
        .from("grammar_lessons")
        .update({ lesson: { ...v.lesson, status: "draft", finalizedAt: undefined }, status: "draft", ai_review: null, reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "finalize") {
      const v = validateGrammarLesson(existing.lesson);
      if ("errors" in v) return NextResponse.json({ ok: false, error: `확정할 수 없습니다: ${v.errors.slice(0, 5).join(" / ")}` }, { status: 422 });
      const now = new Date().toISOString();
      const lesson = { ...v.lesson, status: "final" as const, finalizedAt: now };
      const { error } = await db
        .from("grammar_lessons")
        .update({ lesson, status: "final", reviewed_by: user.id, reviewed_at: now, updated_at: now })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      const itemCount = await syncItems(db, existing.id, concept.id, level, lesson, existing.source);
      return NextResponse.json({ ok: true, itemCount });
    }

    if (action === "revert") {
      const v = validateGrammarLesson(existing.lesson);
      const lesson = v.ok ? { ...v.lesson, status: "draft" as const, finalizedAt: undefined } : existing.lesson;
      await db.from("grammar_items").delete().eq("lesson_id", existing.id);
      const { error } = await db
        .from("grammar_lessons")
        .update({ lesson, status: "draft", reviewed_by: null, reviewed_at: null, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: `알 수 없는 action: ${action}` }, { status: 400 });
  } catch (e: any) {
    const msg = String(e?.message ?? "Unknown error");
    const status = msg.startsWith("401") ? 401 : msg.startsWith("403") ? 403 : 500;
    console.error("GRAMMAR-ENGINE LESSONS ERROR", e);
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
