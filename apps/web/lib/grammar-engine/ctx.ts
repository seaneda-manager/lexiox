import "server-only";
import type { getServiceRoleClient } from "@/lib/supabase/server";
import { validateGrammarLesson, type GrammarLesson } from "@/models/middle-naesin/grammar-lesson";
import type { ConceptCtx } from "@/lib/grammar-engine/lesson-ai";

type Db = ReturnType<typeof getServiceRoleClient>;

export async function loadCtx(db: Db, conceptKey: string, level: number) {
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
