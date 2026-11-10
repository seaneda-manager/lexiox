export const dynamic = "force-dynamic";
export const maxDuration = 120;

// 외부(Gemini 등)에서 만든 결과 CSV를 올린다.
// POST { text }  → 각 줄: id,pron,pos   (pos 는 뜻 순서대로 "동사|명사")
// 발음은 한글만, 품사는 뜻 개수와 같고 허용 목록 안이어야 저장한다. 통과 못 한 줄은 이유와 함께 돌려준다.

import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { getServiceSupabase } from "@/lib/supabase/service";
import { flattenMeanings } from "@/lib/vocab/learning/meaningMatch";
import { isValidPos, isValidPron, parseCsv } from "@/lib/vocab/learning/enrichValidate";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  try {
    await requireTeacherOrAdmin();
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    return NextResponse.json({ ok: false, error: msg }, { status: msg.startsWith("403") ? 403 : 401 });
  }

  const body = await req.json().catch(() => ({}));
  const raw = String(body?.text ?? "")
    .replace(/```[a-z]*\n?/gi, "") // 코드펜스 제거
    .trim();
  if (!raw) return NextResponse.json({ ok: false, error: "내용이 비어 있어요" }, { status: 400 });

  const rows = parseCsv(raw).filter((r) => UUID_RE.test((r[0] ?? "").trim())); // 헤더·잡담 줄은 자동으로 걸러짐
  if (rows.length === 0) return NextResponse.json({ ok: false, error: "올릴 수 있는 줄이 없어요 (id,pron,pos 형식)" }, { status: 400 });
  if (rows.length > 2000) return NextResponse.json({ ok: false, error: "한 번에 2000줄까지만 올릴 수 있어요" }, { status: 400 });

  const db = getServiceSupabase();
  const ids = rows.map((r) => r[0].trim());
  const meaningsById = new Map<string, number>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await db.from("words").select("id,meanings_ko").in("id", ids.slice(i, i + 200));
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    for (const w of (data ?? []) as any[]) meaningsById.set(w.id, flattenMeanings(w.meanings_ko).length);
  }

  let saved = 0;
  const problems: string[] = [];
  const now = new Date().toISOString();

  for (const r of rows) {
    const id = r[0].trim();
    const pron = (r[1] ?? "").trim();
    const pos = (r[2] ?? "").split("|").map((p) => p.trim()).filter(Boolean);
    const count = meaningsById.get(id);
    if (count === undefined) {
      problems.push(`${id}: 없는 단어 id`);
      continue;
    }
    const pronOk = isValidPron(pron);
    const posOk = isValidPos(pos, count);
    if (!pronOk && !posOk) {
      problems.push(`${id}: 발음/품사 모두 형식 오류 (발음 "${pron}", 품사 ${pos.join("|") || "없음"})`);
      continue;
    }
    const patch: Record<string, any> = { enriched_at: now };
    if (pronOk) patch.pronunciation_ko = pron;
    else problems.push(`${id}: 발음 형식 오류 "${pron}" (품사만 저장)`);
    if (posOk) {
      patch.meaning_pos = pos;
      patch.pos = Array.from(new Set(pos)).join("/");
    } else problems.push(`${id}: 품사 개수/이름 오류 ${pos.join("|") || "없음"} (뜻 ${count}개) (발음만 저장)`);

    const { error } = await db.from("words").update(patch).eq("id", id);
    if (error) problems.push(`${id}: 저장 실패 ${error.message}`);
    else saved++;
  }

  const { count: remaining } = await db.from("words").select("id", { count: "exact", head: true }).is("enriched_at", null);
  return NextResponse.json({ ok: true, received: rows.length, saved, remaining: remaining ?? 0, problems: problems.slice(0, 50), problemCount: problems.length });
}
