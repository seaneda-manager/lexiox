"use server";

import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";

export type BuilderTrack = {
  id: string;
  title: string | null;
  total_days: number | null;
  is_active: boolean | null;
};

export type BuilderSet = {
  id: string;
  title: string | null;
  word_count: number;
  track_id: string | null;
  order_index: number | null;
};

async function requireAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "admin") throw new Error("Forbidden");
}

export async function loadTrackBuilderDataAction(): Promise<
  { ok: boolean; error?: string; tracks?: BuilderTrack[]; sets?: BuilderSet[] }
> {
  try {
    await requireAdmin();
    const admin = getServiceRoleClient();
    const [tr, se, co] = await Promise.all([
      admin.from("vocab_tracks").select("id, title, total_days, is_active").order("created_at", { ascending: false }),
      admin.from("vocab_sets").select("id, title, track_id, order_index").order("created_at", { ascending: false }),
      admin.from("vocab_sets_with_counts").select("id, item_count"),
    ]);
    if (tr.error) return { ok: false, error: tr.error.message };
    if (se.error) return { ok: false, error: se.error.message };
    const counts = new Map<string, number>((co.data ?? []).map((r: any) => [String(r.id), Number(r.item_count ?? 0)]));
    return {
      ok: true,
      tracks: (tr.data ?? []) as BuilderTrack[],
      sets: (se.data ?? []).map((s: any) => ({
        id: String(s.id),
        title: s.title ?? null,
        word_count: counts.get(String(s.id)) ?? 0,
        track_id: s.track_id ?? null,
        order_index: s.order_index ?? null,
      })),
    };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

export async function createTrackAction(input: {
  title: string;
  description?: string;
}): Promise<{ ok: boolean; error?: string; trackId?: string }> {
  try {
    await requireAdmin();
    const title = String(input.title ?? "").trim();
    if (!title) return { ok: false, error: "Track 이름을 입력하세요" };
    const admin = getServiceRoleClient();
    const slug = `track-${Date.now().toString(36)}`;
    const { data, error } = await admin
      .from("vocab_tracks")
      .insert({ title, slug, description: String(input.description ?? "").trim() || null, is_active: true })
      .select("id")
      .limit(1);
    if (error || !data?.[0]?.id) return { ok: false, error: error?.message ?? "생성 실패" };
    return { ok: true, trackId: String(data[0].id) };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}

/** setIds 순서대로 Day 1..N 으로 편성한다. 이 Track에 있다가 빠진 세트는 Track에서 분리된다. */
export async function saveTrackDaysAction(input: {
  trackId: string;
  setIds: string[];
}): Promise<{ ok: boolean; error?: string; totalDays?: number }> {
  try {
    await requireAdmin();
    const { trackId } = input;
    const setIds = Array.from(new Set(input.setIds ?? []));
    if (!trackId) return { ok: false, error: "Track을 선택하세요" };
    const admin = getServiceRoleClient();

    // 빠진 세트 분리
    const { data: current, error: cErr } = await admin.from("vocab_sets").select("id").eq("track_id", trackId);
    if (cErr) return { ok: false, error: cErr.message };
    const removed = (current ?? []).map((r: any) => String(r.id)).filter((id) => !setIds.includes(id));
    if (removed.length) {
      const { error } = await admin.from("vocab_sets").update({ track_id: null, order_index: null }).in("id", removed);
      if (error) return { ok: false, error: error.message };
    }

    // Day 순서 부여
    for (let i = 0; i < setIds.length; i++) {
      const { error } = await admin.from("vocab_sets").update({ track_id: trackId, order_index: i + 1 }).eq("id", setIds[i]);
      if (error) return { ok: false, error: `Day ${i + 1} 저장 실패: ${error.message}` };
    }

    const { error: tErr } = await admin.from("vocab_tracks").update({ total_days: setIds.length || null }).eq("id", trackId);
    if (tErr) return { ok: false, error: tErr.message };
    return { ok: true, totalDays: setIds.length };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "failed" };
  }
}
