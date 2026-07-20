"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";
import type { PassageAuthoringDocument } from "@/components/naesin/authoring/passage_authoring_schema_v1";

type SaveNaesinPassageResult =
  | {
      ok: true;
      id: string;
      slug: string;
      title: string;
      status: string;
      updatedAt: string;
    }
  | {
      ok: false;
      error: string;
    };

function isUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function makeSlug(input: string) {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return base || `passage-${Date.now()}`;
}

function normalizeDoc(doc: PassageAuthoringDocument) {
  const title = String(doc.core.title ?? "").trim();
  const slug = makeSlug(title || doc.core.meta.sourceLabel || doc.core.id || "passage");
  const variants = Array.isArray(doc.variants) ? doc.variants : [];
  const tags = Array.isArray(doc.core.tags) ? doc.core.tags : [];

  return {
    title,
    slug,
    rawPassage: doc.core.rawPassage ?? "",
    sentenceCount: Array.isArray(doc.core.sentences) ? doc.core.sentences.length : 0,
    paragraphCount: Array.isArray(doc.core.paragraphs) ? doc.core.paragraphs.length : 0,
    variantCount: variants.length,
    tags,
    payload: {
      core: doc.core,
      workout: doc.workout,
      variants,
    },
  };
}

export async function saveNaesinPassageAction(
  doc: PassageAuthoringDocument,
): Promise<SaveNaesinPassageResult> {
  try {
    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const normalized = normalizeDoc(doc);

    if (!normalized.title) {
      return {
        ok: false,
        error: "제목을 먼저 입력하세요.",
      };
    }

    const row = {
      slug: normalized.slug,
      title: normalized.title,
      track: doc.core.track,
      status: doc.core.status,
      source_type: doc.core.meta.sourceType ?? null,
      source_label: doc.core.meta.sourceLabel ?? null,
      school_level: doc.core.meta.schoolLevel ?? null,
      exam_type: doc.core.meta.examType ?? null,
      grade_label: doc.core.meta.gradeLabel ?? null,
      original_question_style: doc.core.meta.originalQuestionStyle ?? null,
      payload: normalized.payload,
      raw_passage: normalized.rawPassage,
      tags: normalized.tags,
      sentence_count: normalized.sentenceCount,
      paragraph_count: normalized.paragraphCount,
      variant_count: normalized.variantCount,
      is_published: doc.core.status === "published",
      updated_by: user?.id ?? null,
    };

    const coreId = doc.core.id;

    if (isUuid(coreId)) {
      const { data, error } = await supabase
        .from("naesin_passages")
        .update(row)
        .eq("id", coreId)
        .select("id, slug, title, status, updated_at")
        .single();

      if (error || !data) {
        return {
          ok: false,
          error: error?.message ?? "저장 중 오류가 발생했습니다.",
        };
      }

      revalidatePath("/admin/naesin/passages");
      revalidatePath(`/admin/naesin/passages/${data.id}`);

      return {
        ok: true,
        id: data.id,
        slug: data.slug,
        title: data.title,
        status: data.status,
        updatedAt: data.updated_at,
      };
    }

    const insertRow = {
      ...row,
      created_by: user?.id ?? null,
    };

    const { data, error } = await supabase
      .from("naesin_passages")
      .insert(insertRow)
      .select("id, slug, title, status, updated_at")
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message ?? "저장 중 오류가 발생했습니다.",
      };
    }

    revalidatePath("/admin/naesin/passages");
    revalidatePath(`/admin/naesin/passages/${data.id}`);

    return {
      ok: true,
      id: data.id,
      slug: data.slug,
      title: data.title,
      status: data.status,
      updatedAt: data.updated_at,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "알 수 없는 저장 오류가 발생했습니다.",
    };
  }
}
