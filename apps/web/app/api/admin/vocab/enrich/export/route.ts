export const dynamic = "force-dynamic";

// 아직 품사/발음이 없는 단어를 CSV로 내려받는다 (Gemini 등 외부 도구에 넣기 위한 목록).
// GET ?limit=300 → id,text,meanings  (meanings 는 "[0]뜻 ; [1]뜻" 형태)
// 결과를 올리면(enriched_at 설정) 다음 내려받기는 그다음 단어부터 나온다.

import { NextResponse } from "next/server";
import { requireTeacherOrAdmin } from "@/lib/auth/requireTeacherOrAdmin";
import { getServiceSupabase } from "@/lib/supabase/service";
import { flattenMeanings } from "@/lib/vocab/learning/meaningMatch";
import { csvEscape } from "@/lib/vocab/learning/enrichValidate";

export async function GET(req: Request) {
  try {
    await requireTeacherOrAdmin();
  } catch (e: any) {
    const msg = String(e?.message ?? "");
    return NextResponse.json({ ok: false, error: msg }, { status: msg.startsWith("403") ? 403 : 401 });
  }

  const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get("limit")) || 300, 1), 1000);
  const db = getServiceSupabase();
  const { data, error } = await db
    .from("words")
    .select("id,text,meanings_ko")
    .is("enriched_at", null)
    .order("id", { ascending: true })
    .limit(limit);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const lines = ["id,text,meanings"];
  for (const r of (data ?? []) as any[]) {
    const ms = flattenMeanings(r.meanings_ko);
    lines.push([r.id, r.text, ms.map((m, j) => `[${j}]${m}`).join(" ; ")].map((x) => csvEscape(String(x ?? ""))).join(","));
  }

  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="words-to-enrich-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
