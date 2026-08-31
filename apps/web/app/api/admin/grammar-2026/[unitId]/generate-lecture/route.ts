export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";
import { getServerSupabase } from "@/lib/supabase/server";
import { getServiceSupabase } from "@/lib/supabase/service";
import { generateSpeech } from "@/lib/elevenlabs/generate-speech";
import { randomUUID } from "crypto";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "placeholder" });
const MODEL = "claude-sonnet-5";

// LLM이 만들어내는 강의 세그먼트
type LectureSegment =
  | { type: "text"; narration: string; content: { text: string } }
  | {
      type: "board";
      narration: string;
      content: {
        title?: string;
        lines: Array<{
          text: string;
          emphasis?: Array<{ from: number; to: number; kind: "highlight" | "circle" | "underline" }>;
        }>;
      };
    }
  | {
      type: "blank";
      narration: string;
      content: { prompt: string; answer: string; hint_ko?: string };
    };

function buildPrompt(unit: any, segments: any[], drills: any[], stylistic: any[]): string {
  const existing = segments
    .map((s) => `- [${s.type}] ${JSON.stringify(s.content)}`)
    .join("\n");
  const drillText = drills
    .slice(0, 6)
    .map(
      (d) =>
        `- (${d.type}) 문장: ${d.sentence} / 정답: ${d.answer} / 오답보기: ${JSON.stringify(d.distractors)}`
    )
    .join("\n");

  return `당신은 한국 학원의 베테랑 영어 문법 강사입니다. 아래 문법 유닛으로 **짧은 수업 강의**의 대본과 화면 연출을 만드세요.

## 유닛
- 제목(한): ${unit.label_ko}
- 제목(영): ${unit.label_en}
- 설명: ${unit.description ?? "(없음)"}
- 레벨: ${unit.level}

## 기존 설명 세그먼트 (참고, 재구성 가능)
${existing || "(없음)"}

## 기존 드릴 (예문/포인트 소스)
${drillText || "(없음)"}

## 만들 것: 세그먼트 6~10개의 시퀀스
흐름: ①제목/개요 → ②문법 핵심 설명(공식·규칙) → ③예문 1~3개 walkthrough → ④대표 드릴 1~2개를 실제로 풀며 설명 → ⑤한 줄 요약.

세그먼트 타입:
- "text": 짧은 도입/전환/요약 문단. content = { "text": "화면에 띄울 짧은 문장(한국어)" }
- "board": 칠판 판서. content = { "title"?: "소제목", "lines": [{ "text": "한 줄(영어 예문/공식/한국어 라벨 등)", "emphasis"?: [{ "from": 문자시작index, "to": 문자끝index, "kind": "highlight"|"circle"|"underline" }] }] }
  - 영어 예문·공식은 board의 lines로. 강조할 부분(핵심 단어/어미/연결어)에 emphasis 마크를 정확한 문자 인덱스로.
- "blank": 학생이 직접 채우는 빈칸(이해 확인). content = { "prompt": "___ 가 들어간 한국어 또는 영어 문장", "answer": "정답", "hint_ko"?: "힌트" }

## narration (필수, 모든 세그먼트)
- 그 세그먼트를 설명하는 **강사의 말**. 한국어로 자연스럽게.
- **영어 예문·표현은 narration 안에서도 그대로 영어로 읽어줍니다.** 예: "이 문장을 보죠. \"Although it was raining, we went out.\" 여기서 although는 양보를 나타내는데..."
- 1~4문장. 너무 길지 않게.

## 출력: 이 JSON만 (다른 텍스트/코드블록 없이)
{
  "segments": [
    { "type": "text", "narration": "...", "content": { "text": "..." } },
    { "type": "board", "narration": "...", "content": { "title": "...", "lines": [{ "text": "If it rains, I will stay home.", "emphasis": [{ "from": 0, "to": 2, "kind": "circle" }] }] } },
    { "type": "blank", "narration": "...", "content": { "prompt": "주어가 3인칭 단수이면 동사에 ___를 붙인다.", "answer": "-s", "hint_ko": "동사 어미" } }
  ]
}`;
}

function extractJson(raw: string): any {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("LLM 응답에서 JSON을 찾을 수 없습니다.");
  return JSON.parse(raw.slice(s, e + 1));
}

function sanitizeSegments(parsed: any): LectureSegment[] {
  const arr = Array.isArray(parsed?.segments) ? parsed.segments : [];
  const out: LectureSegment[] = [];
  for (const seg of arr) {
    const narration = String(seg?.narration ?? "").trim();
    if (seg?.type === "text" && seg?.content?.text) {
      out.push({ type: "text", narration, content: { text: String(seg.content.text) } });
    } else if (seg?.type === "board" && Array.isArray(seg?.content?.lines)) {
      const lines = seg.content.lines
        .filter((l: any) => l && typeof l.text === "string")
        .map((l: any) => ({
          text: String(l.text),
          emphasis: Array.isArray(l.emphasis)
            ? l.emphasis
                .filter(
                  (m: any) =>
                    Number.isFinite(m?.from) &&
                    Number.isFinite(m?.to) &&
                    m.to > m.from &&
                    ["highlight", "circle", "underline"].includes(m?.kind)
                )
                .map((m: any) => ({ from: m.from | 0, to: m.to | 0, kind: m.kind }))
            : undefined,
        }));
      if (lines.length > 0) {
        out.push({
          type: "board",
          narration,
          content: { title: seg.content.title ? String(seg.content.title) : undefined, lines },
        });
      }
    } else if (seg?.type === "blank" && seg?.content?.prompt && seg?.content?.answer) {
      out.push({
        type: "blank",
        narration,
        content: {
          prompt: String(seg.content.prompt),
          answer: String(seg.content.answer),
          hint_ko: seg.content.hint_ko ? String(seg.content.hint_ko) : undefined,
        },
      });
    }
  }
  return out;
}

export async function POST(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const { unitId } = await params;

    const authed = await getServerSupabase();
    const { data: { user } } = await authed.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    // 요청 바디에서 목소리 지정 가능 (없으면 env LESSON_VOICE_ID, 그것도 없으면 스톡)
    let bodyVoiceId: string | undefined;
    try {
      const body = await req.json();
      if (body?.voiceId && typeof body.voiceId === "string") bodyVoiceId = body.voiceId.trim();
    } catch {
      /* 바디 없음 */
    }

    const db = getServiceSupabase();

    const [unitRes, segRes, drillRes, styRes] = await Promise.all([
      db.from("grammar_2026_units").select("*").eq("id", unitId).single(),
      db.from("grammar_2026_explanation_segments").select("*").eq("unit_id", unitId).order("order_index"),
      db.from("grammar_2026_drills").select("*").eq("unit_id", unitId).order("order_index"),
      db.from("grammar_2026_stylistic_items").select("*").eq("unit_id", unitId).order("order_index"),
    ]);

    if (unitRes.error || !unitRes.data) {
      return NextResponse.json({ ok: false, error: "유닛을 찾을 수 없습니다." }, { status: 404 });
    }

    // 1) LLM: 강의 세그먼트 시퀀스
    const prompt = buildPrompt(unitRes.data, segRes.data ?? [], drillRes.data ?? [], styRes.data ?? []);
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });
    void logAnthropicUsage(`admin/grammar-2026/generate-lecture`, MODEL, message.usage);

    // claude-sonnet-5는 thinking 블록을 먼저 반환할 수 있으므로 text 블록을 명시적으로 찾는다.
    const textBlock = (message.content as any[]).find((b) => b?.type === "text");
    const raw = (textBlock?.text as string) ?? "";
    const segments = sanitizeSegments(extractJson(raw));
    if (segments.length === 0) {
      return NextResponse.json({ ok: false, error: "유효한 강의 세그먼트가 생성되지 않았습니다." }, { status: 502 });
    }

    // 2) 각 세그먼트 내레이션 → TTS
    //    한글 설명 + 영문 예문을 한 목소리로 (eleven_multilingual_v2). 스톡 목소리 사용.
    const voiceId = bodyVoiceId || process.env.LESSON_VOICE_ID || undefined;
    let audioCount = 0;
    const failures: number[] = [];
    const rows = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      let audio_url: string | null = null;
      const narration = seg.narration.trim();
      if (narration) {
        try {
          const { url } = await generateSpeech(narration, {
            voiceId,
            modelId: "eleven_multilingual_v2",
          });
          audio_url = url;
          audioCount++;
        } catch (e) {
          console.error(`generate-lecture TTS 실패 (seg ${i}):`, e);
          failures.push(i);
        }
        // ElevenLabs 레이트리밋 방지 (기존 generateSpeechBatch 관례)
        await new Promise((r) => setTimeout(r, 3000));
      }
      rows.push({
        id: randomUUID(),
        unit_id: unitId,
        order_index: i,
        type: seg.type,
        content: seg.content,
        narration,
        audio_url,
      });
    }

    // 3) 세그먼트 교체 (delete + insert, 기존 segments PUT 라우트와 동일 방식)
    const del = await db.from("grammar_2026_explanation_segments").delete().eq("unit_id", unitId);
    if (del.error) throw new Error(del.error.message);
    const ins = await db.from("grammar_2026_explanation_segments").insert(rows);
    if (ins.error) throw new Error(ins.error.message);

    return NextResponse.json({
      ok: true,
      segmentCount: rows.length,
      audioCount,
      failures,
      voiceId: voiceId ?? "(스톡 기본)",
      segments: rows.map((r) => ({
        id: r.id,
        unit_id: r.unit_id,
        order_index: r.order_index,
        type: r.type,
        content: r.content,
        narration: r.narration,
        audio_url: r.audio_url,
      })),
    });
  } catch (e: any) {
    console.error("GENERATE-LECTURE ERROR", e);
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
