export const dynamic = "force-dynamic";

// apps/web/app/api/admin/updated-listening/jrms/publish/route.ts
//
// QA를 통과한 중학 Listening draft 20트랙을 받아서:
// 1) 트랙별 오디오(TTS) 생성 — "M:"/"W:" 라벨을 그대로 읽지 않도록 대사를 화자별로 쪼개서
//    각각 다른 목소리로 합성한 뒤 하나로 이어붙인다 (generateDialogueSpeech)
// 2) 트랙별 노트테이킹용 modelNotes + 리텐션용 recallQuestion을 한 번의 AI 호출로 같이 생성
// 3) listening_tests_2026에 program='jr', grade, level로 저장 (기존 save/route.ts 패턴 확장)

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "crypto";
import { getServiceSupabase } from "@/lib/supabase/service";
import { generateDialogueSpeech, getGenderedVoiceId, type DialogueSegment } from "@/lib/elevenlabs/generate-speech";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";

export const runtime = "nodejs";
export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "placeholder" });

type Grade = "ms1" | "ms2" | "ms3";
type Level = "low" | "mid" | "high";

/** "M: ...\nW: ...\n..." 형태의 transcript를 화자별 대사 세그먼트로 쪼갠다. 라벨 없는
 * 줄(줄바꿈만 됐을 뿐 이어지는 발화)은 직전 세그먼트에 붙인다. */
function parseDialogue(transcript: string): DialogueSegment[] {
  const lines = (transcript ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const segments: DialogueSegment[] = [];
  for (const line of lines) {
    const m = line.match(/^([MW]):\s*(.+)$/);
    if (m) {
      segments.push({ speaker: m[1] as "M" | "W", text: m[2] });
    } else if (segments.length > 0) {
      segments[segments.length - 1].text += " " + line;
    } else {
      segments.push({ speaker: "M", text: line });
    }
  }
  return segments;
}

function buildNotesAndRecallPrompt(tracks: any[]): string {
  const itemsText = tracks
    .map((t) => {
      const q = t.questions[0];
      return `=== ${q.number}번 (trackId="${t.id}") ===\n${t.transcript}`;
    })
    .join("\n\n");

  return `아래는 중학 영어듣기 20개 트랙의 스크립트입니다. 각 트랙마다 2가지를 만들어주세요.

1) modelNotes: 노트테이킹 연습용 모범 노트 2~4개 항목(짧은 구/키워드 위주, 완전한 문장 아님). 예: ["cheese+tomato pizza 제안받음", "아침 많이 먹어서 배부름", "거절함"]
2) recallQuestion: 오디오를 다 들은 직후 재청취 없이 바로 답하는 "즉시 회상" 문제 — 원래 문제(stem)와는 다른 관점(예: 세부사항, 화자 관계, 상황)을 묻는 새 질문 1개 + 선택지 4개(정답 1개). 원래 문제와 똑같이 만들지 마세요.

${itemsText}

반드시 이 JSON 형식으로만 응답하세요(다른 텍스트·코드블록 없이):
{
  "items": [
    {
      "trackId": "...",
      "modelNotes": ["...", "..."],
      "recallQuestion": {"stem": "...(한국어)", "choices": [{"text":"...","correct":true}, ...정확히 4개]}
    }
  ]
}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      tracks: any[];
      grade: Grade;
      level: Level;
      title?: string;
      testId?: string;
    };
    const { tracks, grade, level } = body;

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json({ ok: false, error: "tracks가 필요합니다." }, { status: 400 });
    }
    if (!grade || !level) {
      return NextResponse.json({ ok: false, error: "grade/level이 필요합니다." }, { status: 400 });
    }

    // 1) 노트테이킹/리텐션 필드를 오디오 생성과 병렬로 먼저 요청 (텍스트 호출이라 빠름)
    const notesPromise = (async () => {
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{ role: "user", content: buildNotesAndRecallPrompt(tracks) }],
      });
      void logAnthropicUsage("admin/updated-listening/jrms/publish:notes-recall", "claude-sonnet-4-6", message.usage);
      const raw = (message.content[0] as any).text as string;
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as { items: any[] };
      return parsed.items ?? [];
    })();

    // 2) 오디오 생성 — 트랙마다 대사를 화자(M/W)별로 쪼개서 서로 다른 목소리로 합성 후 이어붙인다.
    //    (트랙끼리도 순차 처리 — 세그먼트 호출까지 합치면 전체 요청 수가 많아 레이트리밋을 넘기 쉬움)
    const audioById = new Map<string, string>();
    const failedTrackIds: string[] = [];
    for (let i = 0; i < tracks.length; i++) {
      const t = tracks[i];
      const segments = parseDialogue(t.transcript);
      if (segments.length === 0) {
        failedTrackIds.push(t.id);
        continue;
      }
      const voiceIdBySpeaker = {
        M: getGenderedVoiceId("M", i),
        W: getGenderedVoiceId("W", i),
      };
      try {
        const { url } = await generateDialogueSpeech(segments, voiceIdBySpeaker, { modelId: "eleven_multilingual_v2" });
        audioById.set(t.id, url);
      } catch (err) {
        console.error(`[jrms/publish] audio generation failed for track ${t.id}:`, err);
        failedTrackIds.push(t.id);
      }
    }

    const notesItems = await notesPromise;
    const notesById = new Map(notesItems.map((it: any) => [it.trackId, it]));

    if (failedTrackIds.length > 0) {
      return NextResponse.json(
        { ok: false, error: `${failedTrackIds.length}개 트랙 오디오 생성 실패`, failedTrackIds },
        { status: 500 }
      );
    }

    const publishedTracks = tracks.map((t) => {
      const notes = notesById.get(t.id) as any;
      const choices = (notes?.recallQuestion?.choices ?? []).map((c: any) => ({
        id: randomUUID(),
        text: c.text ?? "",
        correct: c.correct === true,
      }));
      const audioUrl = audioById.get(t.id) ?? "";
      // choose_response 문항은 Task1QuestionScreen이 question.audioUrl을 읽는다(트랙 하나에
      // 문항 하나뿐인 이 파이프라인에서는 트랙 오디오와 동일한 파일을 가리키면 된다).
      const questions =
        t.taskKind === "choose_response"
          ? t.questions.map((q: any) => ({ ...q, audioUrl }))
          : t.questions;
      return {
        ...t,
        audioUrl,
        questions,
        modelNotes: Array.isArray(notes?.modelNotes) ? notes.modelNotes : [],
        recallQuestion: notes?.recallQuestion
          ? { stem: notes.recallQuestion.stem ?? "", choices }
          : undefined,
      };
    });

    const testId = body.testId || randomUUID();
    const label = body.title || `LexiOX ${grade.toUpperCase()} 듣기 (${level})`;

    const payload = {
      meta: {
        id: testId,
        label,
        examEra: "ibt_2026" as const,
        program: "jr" as const,
        grade,
        level,
      },
      modules: [
        { stage: 1 as const, items: publishedTracks },
        { stage: 2 as const, items: [] },
      ],
    };

    const sb = getServiceSupabase();
    const { data: existing } = await sb.from("listening_tests_2026").select("id").eq("id", testId).maybeSingle();

    const row = {
      id: testId,
      label,
      exam_era: "ibt_2026",
      program: "jr",
      grade,
      level,
      payload,
    };

    const { error } = existing
      ? await sb.from("listening_tests_2026").update(row).eq("id", testId)
      : await sb.from("listening_tests_2026").insert(row);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    // test_assignments.listening_test_id는 (구)listening_tests를 참조하는 FK라서
    // 배정이 되려면 이 테이블에도 같은 id로 행이 있어야 한다 (save/route.ts와 동일 관례).
    const { error: legacyError } = await sb.from("listening_tests").upsert(
      {
        id: testId,
        label,
        exam_era: "ibt_2026",
        content: payload,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (legacyError) console.warn("listening_tests (legacy) upsert failed:", legacyError.message);

    return NextResponse.json({ ok: true, testId, grade, level, trackCount: publishedTracks.length });
  } catch (err: any) {
    console.error("LISTENING-JRMS-PUBLISH ERROR", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
