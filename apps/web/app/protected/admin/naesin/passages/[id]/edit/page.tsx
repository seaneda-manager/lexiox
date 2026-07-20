
// Drop-in file
// Place at:
// apps/web/app/(protected)/admin/naesin/passages/[id]/edit/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import PassageAuthoringEditor from "@/components/naesin/authoring/PassageAuthoringEditor";
import AutoSuggestPassageGrammarButton from "@/components/naesin/authoring/AutoSuggestPassageGrammarButton";
import type { GrammarUnitLite } from "@/lib/naesin/grammar/ruleScanV1";
import {
  createEmptyPassageAuthoringDocument,
  type PassageAuthoringDocument,
} from "@/components/naesin/authoring/passage_authoring_schema_v1";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

type LooseRecord = Record<string, unknown>;

// TODO: 나중에는 lesson map에서 자동으로 불러오세요.
// 지금은 흐름 테스트용으로 수동 샘플 3개만 연결해둡니다.
const TEMP_LESSON_GRAMMAR_UNITS: GrammarUnitLite[] = [
  { id: "gu_tense_pastperfect_001", authoringMode: "manual_deep" },
  { id: "gu_sva_each_001", authoringMode: "auto_lite" },
  { id: "gu_sva_correlative_001", authoringMode: "manual_deep" },
];

function isRecord(value: unknown): value is LooseRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): LooseRecord | null {
  return isRecord(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function parseJsonLike(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function buildInitialDoc(row: LooseRecord, id: string): PassageAuthoringDocument {
  const base = createEmptyPassageAuthoringDocument(id);

  const payload = asRecord(parseJsonLike(row.payload)) ?? {};
  const payloadCore = asRecord(payload.core) ?? {};
  const payloadMeta = asRecord(payloadCore.meta) ?? {};
  const payloadWorkout = asRecord(payload.workout) ?? {};
  const payloadVariants = Array.isArray(payload.variants) ? payload.variants : [];

  return {
    ...base,
    core: {
      ...base.core,
      ...payloadCore,
      id,
      title: asString(payloadCore.title) ?? asString(row.title) ?? base.core.title,
      track:
        (asString(payloadCore.track) as PassageAuthoringDocument["core"]["track"] | null) ??
        (asString(row.track) as PassageAuthoringDocument["core"]["track"] | null) ??
        base.core.track,
      status:
        (asString(payloadCore.status) as PassageAuthoringDocument["core"]["status"] | null) ??
        (asString(row.status) as PassageAuthoringDocument["core"]["status"] | null) ??
        base.core.status,
      rawPassage:
        asString(payloadCore.rawPassage) ??
        asString(row.raw_passage) ??
        base.core.rawPassage,
      tags:
        asStringArray(payloadCore.tags).length > 0
          ? asStringArray(payloadCore.tags)
          : asStringArray(row.tags),
      meta: {
        ...base.core.meta,
        ...payloadMeta,
        sourceType:
          (asString(payloadMeta.sourceType) as PassageAuthoringDocument["core"]["meta"]["sourceType"] | null) ??
          (asString(row.source_type) as PassageAuthoringDocument["core"]["meta"]["sourceType"] | null) ??
          base.core.meta.sourceType,
        sourceLabel:
          asString(payloadMeta.sourceLabel) ??
          asString(row.source_label) ??
          base.core.meta.sourceLabel,
        schoolLevel:
          (asString(payloadMeta.schoolLevel) as PassageAuthoringDocument["core"]["meta"]["schoolLevel"] | null) ??
          (asString(row.school_level) as PassageAuthoringDocument["core"]["meta"]["schoolLevel"] | null) ??
          base.core.meta.schoolLevel,
        examType:
          (asString(payloadMeta.examType) as PassageAuthoringDocument["core"]["meta"]["examType"] | null) ??
          (asString(row.exam_type) as PassageAuthoringDocument["core"]["meta"]["examType"] | null) ??
          base.core.meta.examType,
        gradeLabel:
          asString(payloadMeta.gradeLabel) ??
          asString(row.grade_label) ??
          base.core.meta.gradeLabel,
        originalQuestionStyle:
          (asString(payloadMeta.originalQuestionStyle) as PassageAuthoringDocument["core"]["meta"]["originalQuestionStyle"] | null) ??
          (asString(row.original_question_style) as PassageAuthoringDocument["core"]["meta"]["originalQuestionStyle"] | null) ??
          base.core.meta.originalQuestionStyle,
      },
    },
    workout: {
      ...base.workout,
      ...payloadWorkout,
    },
    variants: payloadVariants as PassageAuthoringDocument["variants"],
  };
}

export default async function AdminNaesinPassageEditPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("naesin_passages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    notFound();
  }

  const row = data as LooseRecord;
  const initialDoc = buildInitialDoc(row, id);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-3 rounded-3xl border bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
            Admin / Naesin / Passages / Edit
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-neutral-900">
            {initialDoc.core.title || "Untitled Passage"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            저장된 passage를 불러와 다시 편집합니다.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/naesin/passages/${id}/preview`}
            className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700"
          >
            Preview
          </Link>
          <Link
            href="/admin/naesin/passages/new"
            className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700"
          >
            New
          </Link>
          <Link
            href="/admin/naesin/passages"
            className="rounded-2xl border px-4 py-2 text-sm font-medium text-neutral-700"
          >
            목록
          </Link>
        </div>
      </header>

      <section className="rounded-3xl border bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-semibold text-neutral-900">
          문법 자동 추천
        </div>
        <AutoSuggestPassageGrammarButton
          passageId={id}
          lessonGrammarUnits={TEMP_LESSON_GRAMMAR_UNITS}
        />
      </section>

      <PassageAuthoringEditor initialDoc={initialDoc} />
    </main>
  );
}
