"use server";

import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanRequired(value: FormDataEntryValue | null, field: string) {
  const text = String(value ?? "").trim();
  if (!text) {
    throw new Error(`${field} is required`);
  }
  return text;
}

function toBool(value: FormDataEntryValue | null) {
  return String(value ?? "") === "true";
}

function toInt(value: FormDataEntryValue | null, fallback = 100) {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export async function createUILabelAction(formData: FormData): Promise<void> {
  const supabase = await getServerSupabase();

  const payload = {
    domain: cleanRequired(formData.get("domain"), "domain"),
    key: cleanRequired(formData.get("key"), "key"),
    track: clean(formData.get("track")),
    section: clean(formData.get("section")),
    school_level: clean(formData.get("school_level")),
    audience: clean(formData.get("audience")),

    label_ko: cleanRequired(formData.get("label_ko"), "label_ko"),
    label_en: clean(formData.get("label_en")),

    short_description_ko: clean(formData.get("short_description_ko")),
    long_description_ko: clean(formData.get("long_description_ko")),

    student_message_ko: clean(formData.get("student_message_ko")),
    parent_message_ko: clean(formData.get("parent_message_ko")),
    teacher_message_ko: clean(formData.get("teacher_message_ko")),

    sort_order: toInt(formData.get("sort_order"), 100),
    is_active: toBool(formData.get("is_active")),
  };

  const { error } = await supabase.from("ui_label_catalog").insert(payload);
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/system/labels");
}

export async function updateUILabelAction(formData: FormData): Promise<void> {
  const supabase = await getServerSupabase();

  const id = cleanRequired(formData.get("id"), "id");

  const payload = {
    label_ko: cleanRequired(formData.get("label_ko"), "label_ko"),
    label_en: clean(formData.get("label_en")),

    short_description_ko: clean(formData.get("short_description_ko")),
    long_description_ko: clean(formData.get("long_description_ko")),

    student_message_ko: clean(formData.get("student_message_ko")),
    parent_message_ko: clean(formData.get("parent_message_ko")),
    teacher_message_ko: clean(formData.get("teacher_message_ko")),

    sort_order: toInt(formData.get("sort_order"), 100),
    is_active: toBool(formData.get("is_active")),

    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("ui_label_catalog")
    .update(payload)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/system/labels");
  revalidatePath(`/admin/system/labels/${id}`);
}

export async function toggleUILabelActiveAction(
  formData: FormData,
): Promise<void> {
  const supabase = await getServerSupabase();

  const id = cleanRequired(formData.get("id"), "id");
  const isActive = toBool(formData.get("is_active"));

  const { error } = await supabase
    .from("ui_label_catalog")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/system/labels");
  revalidatePath(`/admin/system/labels/${id}`);
}
