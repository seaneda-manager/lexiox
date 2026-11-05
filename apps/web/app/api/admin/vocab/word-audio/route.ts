export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

import { NextRequest, NextResponse } from "next/server";
import { getUserAndProfile } from "@/lib/getUserAndProfile";
import { getServiceRoleClient } from "@/lib/supabase/server";
import {
  WORD_AUDIO_BUCKET,
  WORD_AUDIO_FOLDER,
  wordAudioPath,
  wordAudioSlug,
} from "@/lib/vocab/audio/wordAudio";

// 단어 발음 mp3 일괄 생성 (ElevenLabs). 이미 있는 단어는 건너뛴다.
//  GET  → { total, done, remaining }
//  POST { limit?: number(1~40, 기본 20) } → 아직 없는 단어를 limit개 만들고 { generated, failed, remaining }
const VOICE_ID = process.env.VOCAB_VOICE_ID || "6fZce9LFNG3iEITDfqZZ";
const MODEL_ID = "eleven_multilingual_v2";

async function requireAdmin() {
  const { user, profile } = await getUserAndProfile();
  if (!user || profile?.role !== "admin") return null;
  return user;
}

type WordRow = { text: string | null };

async function loadAllWords(supabase: ReturnType<typeof getServiceRoleClient>): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("words")
      .select("text")
      .order("text", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    const rows = (data ?? []) as WordRow[];
    for (const r of rows) {
      const t = (r.text ?? "").trim();
      const slug = wordAudioSlug(t);
      if (!t || !slug || seen.has(slug)) continue;
      seen.add(slug);
      out.push(t);
    }
    if (rows.length < 1000) break;
  }
  return out;
}

async function loadExistingSlugs(supabase: ReturnType<typeof getServiceRoleClient>): Promise<Set<string>> {
  const have = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage
      .from(WORD_AUDIO_BUCKET)
      .list(WORD_AUDIO_FOLDER, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    for (const f of data ?? []) have.add(f.name.replace(/\.mp3$/, ""));
    if ((data?.length ?? 0) < 1000) break;
  }
  return have;
}

async function synth(text: string): Promise<Buffer> {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY not set");
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: { stability: 0.6, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const supabase = getServiceRoleClient();
    const [words, have] = await Promise.all([loadAllWords(supabase), loadExistingSlugs(supabase)]);
    const done = words.filter((w) => have.has(wordAudioSlug(w))).length;
    return NextResponse.json({ ok: true, total: words.length, done, remaining: words.length - done });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { limit?: unknown };
  const limit = Math.max(1, Math.min(40, typeof body.limit === "number" ? Math.floor(body.limit) : 20));

  try {
    const supabase = getServiceRoleClient();
    const [words, have] = await Promise.all([loadAllWords(supabase), loadExistingSlugs(supabase)]);
    const todo = words.filter((w) => !have.has(wordAudioSlug(w)));
    const batch = todo.slice(0, limit);

    let generated = 0;
    const failed: { word: string; error: string }[] = [];
    // 동시 3개씩 (ElevenLabs 동시 요청 한도 대비)
    for (let i = 0; i < batch.length; i += 3) {
      await Promise.all(
        batch.slice(i, i + 3).map(async (w) => {
          try {
            const audio = await synth(w);
            const { error } = await supabase.storage
              .from(WORD_AUDIO_BUCKET)
              .upload(wordAudioPath(w), audio, { contentType: "audio/mpeg", upsert: true });
            if (error) throw error;
            generated++;
          } catch (e) {
            failed.push({ word: w, error: e instanceof Error ? e.message : String(e) });
          }
        })
      );
    }
    return NextResponse.json({ ok: true, generated, failed, remaining: todo.length - generated });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
