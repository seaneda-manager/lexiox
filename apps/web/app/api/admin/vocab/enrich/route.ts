export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 단어 품사(뜻별) + 한글 발음 일괄 생성.
// POST { limit?: number, model?: string }  → 아직 enriched_at 이 없는 단어를 limit개(기본 40) 처리하고 남은 개수를 돌려준다.
// 관리 화면에서 remaining 이 0이 될 때까지 반복 호출한다.

import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { getServiceSupabase } from "@/lib/supabase/service";
import { flattenMeanings } from "@/lib/vocab/learning/meaningMatch";

const ALLOWED_MODELS = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6"] as const;
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const POS_SET = new Set(["명사", "동사", "형용사", "부사", "전치사", "접속사", "대명사", "감탄사", "관사", "조동사", "숙어"]);

type Out = { i: number; pron: string; pos: string[] };

function extractJson(text: string): any[] | null {
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    await requireTeacherOrAdmin();
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    return NextResponse.json({ ok: false, error: msg }, { status: msg.startsWith("403") ? 403 : 401 });
  }

  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Math.max(Number(body?.limit) || 40, 1), 60);
  const model = ALLOWED_MODELS.includes(body?.model) ? body.model : DEFAULT_MODEL;
  const db = getServiceSupabase();

  const { data: rows, error } = await db
    .from("words")
    .select("id,text,meanings_ko")
    .is("enriched_at", null)
    .order("id", { ascending: true })
    .limit(limit);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const items = (rows ?? []).map((r: any) => ({
    id: r.id as string,
    text: r.text as string,
    meanings: flattenMeanings(r.meanings_ko),
  }));

  if (items.length === 0) return NextResponse.json({ ok: true, processed: 0, remaining: 0 });

  const list = items
    .map((w, i) => `${i}. ${w.text} => ${w.meanings.map((m, j) => `[${j}]${m}`).join(" ; ") || "(뜻 없음)"}`)
    .join("\n");

  const prompt = `You help Korean students learn English vocabulary (Korean high-school level).
For each entry give:
- "pron": how a Korean person would write the English pronunciation in hangul (e.g. decline -> "디클라인", justification -> "저스티피케이션"). Phrases: write each word separated by a space. Stress is not marked.
- "pos": an array with one Korean part-of-speech label for EACH numbered meaning [j], in the same order. Allowed labels: 명사, 동사, 형용사, 부사, 전치사, 접속사, 대명사, 감탄사, 관사, 조동사, 숙어. Phrases/idioms (multiple words used as a unit) -> 숙어 unless clearly a noun phrase/verb phrase, then use the head's POS. Decide each meaning's POS from the Korean meaning (e.g. "~하다" verb, "~한/적인" adjective).

ENTRIES:
${list}

Reply with ONLY a JSON array, one object per entry, in order: [{"i":0,"pron":"...","pos":["동사","명사"]}, ...]`;

  const client = new Anthropic();
  let parsed: Out[] | null = null;
  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 6000,
      messages: [{ role: "user", content: prompt }],
    });
    const block = msg.content[0];
    parsed = block.type === "text" ? (extractJson(block.text) as Out[] | null) : null;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "AI call failed" }, { status: 502 });
  }
  if (!parsed) return NextResponse.json({ ok: false, error: "AI 응답을 해석하지 못했어요" }, { status: 502 });

  let processed = 0;
  let skipped = 0;
  for (const o of parsed) {
    const w = items[o?.i];
    if (!w) continue;
    const pron = String(o.pron ?? "").trim();
    const pos = Array.isArray(o.pos) ? o.pos.map((p) => String(p).trim()) : [];
    // 검증: 발음은 한글만, 품사는 뜻 개수와 같고 허용 목록 안에 있어야 한다
    const pronOk = /^[가-힣 ]+$/.test(pron);
    const posOk = pos.length === w.meanings.length && pos.every((p) => POS_SET.has(p));
    if (!pronOk && !posOk) {
      // 검증 실패: 무한 재시도를 막기 위해 처리됨으로만 표시 (발음/품사는 비워 둠)
      await db.from("words").update({ enriched_at: new Date().toISOString() }).eq("id", w.id);
      skipped++;
      continue;
    }
    const patch: Record<string, any> = { enriched_at: new Date().toISOString() };
    if (pronOk) patch.pronunciation_ko = pron;
    if (posOk && w.meanings.length > 0) {
      patch.meaning_pos = pos;
      patch.pos = Array.from(new Set(pos)).join("/");
    }
    const { error: upErr } = await db.from("words").update(patch).eq("id", w.id);
    if (upErr) skipped++;
    else processed++;
  }

  // 응답에서 빠졌거나 검증 실패한 단어는 enriched_at 이 비어 있어 다음 호출에서 다시 시도된다.
  // (계속 실패하는 단어가 무한 반복되지 않도록 남은 개수는 호출측에서 진행 없음 감지)
  const { count } = await db.from("words").select("id", { count: "exact", head: true }).is("enriched_at", null);
  return NextResponse.json({ ok: true, processed, skipped, remaining: count ?? 0 });
}
