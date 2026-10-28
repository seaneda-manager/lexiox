import Link from "next/link";
import { notFound } from "next/navigation";
import { getServiceRoleClient } from "@/lib/supabase/server";
import type { GrammarLesson } from "@/models/middle-naesin/grammar-lesson";
import { loadCtx } from "@/lib/grammar-engine/ctx";
import { SECTIONS, normalizeLesson, sectionCount } from "@/lib/grammar-engine/sections";
import { reviewPrompt, sectionPrompt } from "@/lib/grammar-engine/section-prompts";
import { LEVEL_SPEC } from "@/lib/grammar-engine/lesson-ai";
import LessonPreview from "@/components/grammar-engine/LessonPreview";
import LessonActions from "./LessonActions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ conceptKey: string; level: string }> };

const SEV: Record<string, string> = {
  high: "border-rose-300 bg-rose-50 text-rose-800",
  med: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-neutral-200 bg-neutral-50 text-neutral-700",
};

export default async function GrammarCellPage({ params }: Props) {
  const { conceptKey, level: levelStr } = await params;
  const level = Number(levelStr);
  if (!Number.isInteger(level) || level < 1 || level > 5) notFound();

  const db = getServiceRoleClient();
  const { data: concept } = await db.from("grammar_concepts").select("id, key, title_ko, title_en, tier, difficulty_rank").eq("key", conceptKey).maybeSingle();
  if (!concept) notFound();

  const [{ data: lessonRow }, { data: unitRows }, { data: siblings }] = await Promise.all([
    db.from("grammar_lessons").select("*").eq("concept_id", concept.id).eq("level", level).maybeSingle(),
    db.from("grammar_unit_concepts").select("unit:grammar_book_units(chapter_no, unit_no, title, page)").eq("concept_id", concept.id).order("sort_order"),
    db.from("grammar_lessons").select("level, status").eq("concept_id", concept.id),
  ]);

  const units = ((unitRows ?? []) as any[]).map((r) => r.unit).filter(Boolean);
  const loaded = await loadCtx(db, conceptKey, level);
  const normalized = normalizeLesson(lessonRow?.lesson);
  const lesson = lessonRow ? (normalized as unknown as GrammarLesson) : null;
  const sections = SECTIONS.map((sec) => ({
    key: sec.key,
    label: sec.label,
    count: sectionCount(normalized, sec.key),
    prompt: loaded ? sectionPrompt(sec.key, loaded.ctx, level, lessonRow?.lesson) : "",
  }));
  const isFinal = lessonRow?.status === "final";
  const review = (lessonRow?.ai_review ?? null) as { issues: { target: string; severity: string; note: string }[]; reviewedAt: string } | null;
  const statusByLevel = new Map((siblings ?? []).map((s: any) => [s.level as number, s.status as string]));

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6">
      <header className="space-y-1">
        <Link href="/admin/grammar-engine" className="text-sm text-neutral-500 hover:text-neutral-800">← 문법 엔진 목차</Link>
        <div className="text-xs text-neutral-500">
          #{concept.difficulty_rank} · tier {concept.tier} · {LEVEL_SPEC[level].label}
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">
          {concept.title_ko} <span className="text-sm font-normal text-neutral-500">{concept.title_en}</span>
        </h1>
        {units.length > 0 && (
          <div className="text-xs text-neutral-500">
            교재: {units.map((u: any) => `${u.chapter_no}-${u.unit_no} ${u.title}${u.page ? ` (p.${u.page})` : ""}`).join(" · ")}
          </div>
        )}
        <nav className="flex gap-1.5 pt-1">
          {[1, 2, 3, 4, 5].map((lv) => {
            const st = statusByLevel.get(lv);
            return (
              <Link
                key={lv}
                href={`/admin/grammar-engine/${concept.key}/${lv}`}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${lv === level ? "border-violet-500 bg-violet-50 text-violet-700" : "hover:bg-neutral-50"}`}
              >
                L{lv} {st === "final" ? "✓" : st === "draft" ? "…" : ""}
              </Link>
            );
          })}
        </nav>
      </header>

      <section className="rounded-2xl border bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${
              !lessonRow ? "border-rose-300 bg-rose-50 text-rose-700" : isFinal ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-amber-300 bg-amber-50 text-amber-700"
            }`}
          >
            {!lessonRow ? "아직 없음" : isFinal ? "확정됨 · 학생에게 보임" : "초안 · 학생에게 보이지 않음"}
          </span>
          {lessonRow && <span className="text-xs text-neutral-400">출처 {lessonRow.source}</span>}
        </div>
        <LessonActions
          conceptKey={concept.key}
          level={level}
          exists={!!lessonRow}
          isFinal={isFinal}
          lessonJson={JSON.stringify(lessonRow?.lesson ?? {}, null, 2)}
          sections={sections}
          reviewPrompt={loaded ? reviewPrompt(loaded.ctx, level, lessonRow?.lesson) : ""}
          key={lessonRow?.updated_at ?? "new"}
        />
      </section>

      {review && (
        <section className="space-y-2 rounded-2xl border bg-white p-5">
          <div className="text-sm font-bold text-neutral-700">
            AI 검수 결과 <span className="text-xs font-normal text-neutral-400">{new Date(review.reviewedAt).toLocaleString("ko-KR")}</span>
          </div>
          {review.issues.length === 0 ? (
            <div className="text-sm text-emerald-700">지적 사항 없음</div>
          ) : (
            <ul className="space-y-1.5">
              {review.issues.map((it, i) => (
                <li key={i} className={`rounded-lg border px-3 py-2 text-sm ${SEV[it.severity] ?? SEV.med}`}>
                  <b className="mr-2 text-xs uppercase">{it.severity}</b>
                  <span className="mr-2 text-xs opacity-70">{it.target}</span>
                  {it.note}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {lesson && <LessonPreview lesson={lesson} />}
    </main>
  );
}
