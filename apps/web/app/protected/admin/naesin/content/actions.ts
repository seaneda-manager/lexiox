"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanRequired(value: FormDataEntryValue | null, field: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${field} is required`);
  return text;
}

function toBool(value: FormDataEntryValue | null) {
  return String(value ?? "") === "true";
}

function parseTags(value: FormDataEntryValue | null): string[] | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const tags = text
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return tags.length > 0 ? [...new Set(tags)] : null;
}

export async function createNaesinContentAction(formData: FormData): Promise<void> {
  const supabase = await getServerSupabase();

  const payload = {
    track: "naesin",
    section: cleanRequired(formData.get("section"), "section"),
    school_level: cleanRequired(formData.get("school_level"), "school_level"),

    title: cleanRequired(formData.get("title"), "title"),
    source_type: cleanRequired(formData.get("source_type"), "source_type"),
    content_kind: cleanRequired(formData.get("content_kind"), "content_kind"),
    question_origin_type: clean(formData.get("question_origin_type")),

    source_book: clean(formData.get("source_book")),
    publisher: clean(formData.get("publisher")),
    grade: clean(formData.get("grade")),
    semester: clean(formData.get("semester")),
    unit: clean(formData.get("unit")),
    chapter: clean(formData.get("chapter")),

    difficulty: clean(formData.get("difficulty")),
    tags: parseTags(formData.get("tags")),

    is_active: toBool(formData.get("is_active")),
  };

  const { error } = await supabase.from("naesin_contents").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/naesin/content");
  redirect("/admin/naesin/content");
}

export async function toggleNaesinContentActiveAction(
  formData: FormData,
): Promise<void> {
  const supabase = await getServerSupabase();

  const id = cleanRequired(formData.get("id"), "id");
  const isActive = toBool(formData.get("is_active"));

  const { error } = await supabase
    .from("naesin_contents")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/naesin/content");
}
