export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { resolveAcademyStudentId } from "@/lib/vocab/academyStudent";

async function authed() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const academyId = await resolveAcademyStudentId(admin, user.id);
  return academyId ? { admin, academyId } : null;
}

/**
 * GET /api/vocab/remedial/[taskId]
 * 재학습 카드 데이터: 핵심 단어(틀린 단어 + 고난도) + 파생어(뜻이 있으면 같이)
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await ctx.params;
    const a = await authed();
    if (!a) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: task } = await a.admin
      .from("vocab_remedial_tasks")
      .select("id, student_id, track_id, day_index, status, word_ids, extra_terms, reasons")
      .eq("id", taskId)
      .maybeSingle();
    if (!task || task.student_id !== a.academyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: words } = await a.admin
      .from("words")
      .select("id, text, pos, meanings_ko, examples_easy")
      .in("id", task.word_ids ?? []);
    const byId = new Map((words ?? []).map((w: any) => [w.id, w]));
    const core = (task.word_ids as string[])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((w: any) => ({
        id: w.id,
        text: w.text,
        pos: w.pos ?? null,
        meanings_ko: w.meanings_ko ?? [],
        example: (w.examples_easy ?? [])[0] ?? null,
        reason: (task.reasons ?? {})[w.id] ?? "wrong",
      }));

    // 파생어: words 테이블에 같은 철자가 있으면 뜻을 붙여 준다
    const extraTerms: string[] = task.extra_terms ?? [];
    const lowered = new Map<string, string[]>();
    if (extraTerms.length > 0) {
      const { data: known } = await a.admin
        .from("words")
        .select("text, meanings_ko")
        .in("text", Array.from(new Set([...extraTerms, ...extraTerms.map((t) => t.toLowerCase())])));
      for (const k of known ?? []) lowered.set(String(k.text).toLowerCase(), k.meanings_ko ?? []);
    }
    const extra = extraTerms.map((t) => ({ text: t, meanings_ko: lowered.get(t.toLowerCase()) ?? [] }));

    // 처음 열면 진행 중으로 표시
    if (task.status === "open") {
      await a.admin
        .from("vocab_remedial_tasks")
        .update({ status: "in_progress", updated_at: new Date().toISOString() })
        .eq("id", taskId);
    }

    return NextResponse.json(
      {
        ok: true,
        task: { id: task.id, track_id: task.track_id, day_index: task.day_index, status: task.status === "open" ? "in_progress" : task.status },
        words: core,
        extra,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("remedial detail error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/vocab/remedial/[taskId]
 * 재학습 완료 처리. body: { results: [{ word_id, correct }] }
 * 핵심 단어를 모두 한 번씩 확인(철자 점검)했을 때만 완료로 인정한다.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await ctx.params;
    const a = await authed();
    if (!a) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { results?: Array<{ word_id: string; correct: boolean }> };

    const { data: task } = await a.admin
      .from("vocab_remedial_tasks")
      .select("id, student_id, status, word_ids")
      .eq("id", taskId)
      .maybeSingle();
    if (!task || task.student_id !== a.academyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (task.status === "done") return NextResponse.json({ ok: true, already: true });
    if (task.status === "cancelled") return NextResponse.json({ error: "cancelled" }, { status: 409 });

    const checked = new Set((body.results ?? []).map((r) => r.word_id));
    const missing = (task.word_ids as string[]).filter((id) => !checked.has(id));
    if (missing.length > 0) {
      return NextResponse.json({ error: "incomplete", missing: missing.length }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { error } = await a.admin
      .from("vocab_remedial_tasks")
      .update({ status: "done", completed_at: now, updated_at: now })
      .eq("id", taskId)
      .neq("status", "done");
    if (error) return NextResponse.json({ error: "Failed to complete" }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("remedial complete error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
