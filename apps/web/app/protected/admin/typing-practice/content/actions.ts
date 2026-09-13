"use server";

import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

type ContentRow = {
  id: string;
  title: string;
  source_type: "manual" | "reading_passage" | "listening_transcript";
  body_en: string;
  body_ko: string | null;
  tags: string[];
  difficulty: string | null;
  created_at: string;
};

async function requireAdminUser() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function listContentAction() {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("typing_practice_content")
      .select("id, title, source_type, body_en, body_ko, tags, difficulty, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return { ok: false, error: error.message };
    return { ok: true, items: (data ?? []) as ContentRow[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function createContentAction(input: {
  source_type: "manual" | "reading_passage" | "listening_transcript";
  source_ref?: string | null;
  title: string;
  body_en: string;
  body_ko?: string | null;
  tags?: string[];
  difficulty?: string | null;
}) {
  try {
    const user = await requireAdminUser();
    const admin = getServiceRoleClient();

    const title = input.title.trim();
    const body_en = input.body_en.trim();
    if (!title || !body_en) return { ok: false, error: "제목과 영문 본문은 필수입니다." };

    const { error } = await admin.from("typing_practice_content").insert({
      source_type: input.source_type,
      source_ref: input.source_ref ?? null,
      title,
      body_en,
      body_ko: input.body_ko?.trim() || null,
      tags: input.tags ?? [],
      difficulty: input.difficulty ?? null,
      created_by: user.id,
    } as any);

    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function deleteContentAction(id: string) {
  try {
    await requireAdminUser();
    const admin = getServiceRoleClient();
    const { error } = await admin.from("typing_practice_content").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function listReadingPassagesAction() {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("reading_passages")
      .select("id, title, content")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return { ok: false, error: error.message };
    return { ok: true, items: (data ?? []) as { id: string; title: string; content: string }[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function listListeningTracksAction() {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("listening_tracks")
      .select("id, title, transcript")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) return { ok: false, error: error.message };
    return { ok: true, items: (data ?? []) as { id: string; title: string; transcript: string | null }[] };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function importReadingPassageAction(passageId: string) {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("reading_passages")
      .select("id, title, content")
      .eq("id", passageId)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data?.content) return { ok: false, error: "지문을 찾을 수 없습니다." };

    return createContentAction({
      source_type: "reading_passage",
      source_ref: `reading_passages:${passageId}`,
      title: data.title,
      body_en: data.content,
    });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function importListeningTrackAction(trackId: string) {
  try {
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase
      .from("listening_tracks")
      .select("id, title, transcript")
      .eq("id", trackId)
      .maybeSingle();

    if (error) return { ok: false, error: error.message };
    if (!data?.transcript) return { ok: false, error: "스크립트가 없습니다." };

    return createContentAction({
      source_type: "listening_transcript",
      source_ref: `listening_tracks:${trackId}`,
      title: data.title,
      body_en: data.transcript,
    });
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}
