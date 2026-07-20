"use server";

import { getSupabaseServer } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function uploadAvatar(formData: FormData) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { error: "No file provided" };
  if (file.size > 2 * 1024 * 1024) return { error: "파일 크기는 2MB 이하여야 합니다" };
  if (!file.type.startsWith("image/")) return { error: "이미지 파일만 업로드 가능합니다" };

  const ext = file.name.split(".").pop();
  const path = `avatars/${user.id}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("profiles")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) return { error: uploadError.message };

  const { data: { publicUrl } } = supabase.storage.from("profiles").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath("/profile");
  return { url: publicUrl };
}

export async function removeAvatar() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}

export async function selectPresetAvatar(presetUrl: string) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: presetUrl })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { success: true };
}
