export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabase/server";
import { countWords, GRAMMAR_TRACKS } from "@/models/grammar/quiz";

const EDITABLE = ["stem", "item_type", "answer", "distractors", "element_code", "track", "vocab_level", "explanation", "status"] as const;

// PATCH /api/admin/grammar-quiz/items/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const patch: Record<string, any> = { updated_at: new Date().toISOString() };
    for (const k of EDITABLE) {
      if (k in body) patch[k] = body[k];
    }
    if (patch.track && !GRAMMAR_TRACKS.includes(patch.track)) delete patch.track;
    if ("vocab_level" in patch) {
      const vl = Math.round(Number(patch.vocab_level));
      patch.vocab_level = Number.isFinite(vl) ? Math.min(5, Math.max(1, vl)) : 3;
    }
    if (typeof patch.stem === "string") patch.word_count = countWords(patch.stem.replace(/___/g, "x"));
    if (patch.answer && patch.item_type === "judgment") patch.answer = String(patch.answer).toLowerCase();

    const db = getServiceRoleClient();
    const { error } = await db.from("grammar_quiz_items").update(patch).eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}

// DELETE /api/admin/grammar-quiz/items/[id] — 완전 삭제 (archive는 PATCH status)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = getServiceRoleClient();
    const { error } = await db.from("grammar_quiz_items").delete().eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
