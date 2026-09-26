export const dynamic = "force-dynamic";

// apps/web/app/api/admin/updated-listening/jrms/review-quality/route.ts
//
// app/api/admin/updated-reading/review-quality/route.ts의 "AI 학생 페르소나가 정답을 모른 채
// 실제로 풀어보는" 패턴을 Listening 중학 세트용으로 이식. 오디오는 퍼블리시 이전 단계라
// 아직 없으므로 transcript 텍스트 + 문항을 그대로 주고 blind로 풀게 한다.

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { logAnthropicUsage } from "@/lib/ai/logAnthropicUsage";

export const runtime = "nodejs";
export const maxDuration = 180;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || "placeholder" });

type Grade = "ms1" | "ms2" | "ms3";
type Level = "low" | "mid" | "high";

const GRADE_LABEL: Record<Grade, string> = { ms1: "중1", ms2: "중2", ms3: "중3" };
const LEVEL_LABEL: Record<Level, string> = { low: "하위권", mid: "표준", high: "상위권" };

function personaDescription(grade: Grade, level: Level): string {
  const gradeText = GRADE_LABEL[grade];
  if (level === "low") return `${gradeText} ${LEVEL_LABEL.low} 학생. 기초 어휘와 짧은 문장은 알아듣지만, 문장이 길어지거나 함축적인 표현이 나오면 자주 놓칩니다. 듣기 속도를 따라가기 벅차합니다.`;
  if (level === "high") return `${gradeText} ${LEVEL_LABEL.high} 학생. 이 학년 어휘·문법을 거의 다 압니다. 세부정보나 추론 문제도 대부분 맞히지만, 아주 미묘한 뉘앙스에서는 가끔 실수합니다.`;
  return `${gradeText} ${LEVEL_LABEL.mid} 수준의 표준적인 학생. 이 학년 교육과정 어휘·문법을 무리 없이 따라가지만, 함축 의미·추론 문제나 긴 문장에서는 가끔 헷갈립니다.`;
}

interface BlindTrack {
  trackId: string;
  number: number;
  label: string;
  prompt: string;
}

function buildBlindTracks(tracks: any[]): BlindTrack[] {
  return tracks.map((tr, i) => {
    const q = tr.questions?.[0];
    const choicesText = (q?.choices ?? [])
      .map((c: any, ci: number) => `${String.fromCharCode(65 + ci)}. ${c.text}`)
      .join("\n");
    const tableText = q?.tableData
      ? `\n표:\n${q.tableData.headers.join(" | ")}\n${q.tableData.rows.map((r: string[]) => r.join(" | ")).join("\n")}`
      : "";
    return {
      trackId: tr.id,
      number: q?.number ?? i + 1,
      label: `${i + 1}번 (${tr.taskKind})`,
      prompt: `스크립트:\n${tr.transcript}\n${tableText}\n\n질문: ${q?.stem}\n${choicesText}`,
    };
  });
}

function buildPersonaPrompt(grade: Grade, level: Level, blindTracks: BlindTrack[]): string {
  const tracksText = blindTracks
    .map((bt) => `=== ${bt.label} (trackId="${bt.trackId}") ===\n${bt.prompt}`)
    .join("\n\n");

  return `당신은 지금 다음 페르소나의 실제 학생 역할을 맡습니다: ${personaDescription(grade, level)}

아래는 중학 영어듣기평가 문항들의 스크립트와 문제입니다(원래는 오디오로 듣지만 지금은 텍스트로 제공됩니다 — 실제 듣기 상황이라 가정하고, 이 학생의 실력으로 자연스럽게 풀어보세요. 정답을 미리 아는 척하지 말고, 이 레벨 학생이라면 헷갈릴 만한 곳에서는 실제로 틀리세요).

동시에 출제자 관점에서 문제 자체에 결함이 없는지도 관찰하세요:
- 정답이 2개 이상 그럴듯한 선택지
- 스크립트에 없는 내용을 묻는 문제
- 부자연스러운 영어 표현
- 이 학년/레벨(${GRADE_LABEL[grade]} ${LEVEL_LABEL[level]})에 비해 지나치게 쉽거나 어려운 문항
- 14번류 표 문항이면, 표와 스크립트 불일치가 실제로 1곳만 있는지(2곳 이상이면 결함)

${tracksText}

각 문항에 대해 답하세요(A/B/C/D). 문제가 있으면 problems에 한국어로 짧게 적으세요(없으면 빈 배열).

반드시 이 JSON 형식으로만 응답하세요(다른 텍스트·코드블록 없이):
{
  "answers": [
    {"trackId": "...", "choice": "A", "problems": ["..."]},
    ...
  ],
  "overallProblems": ["전체적으로 느낀 문제점 (없으면 빈 배열)"]
}`;
}

function scoreTracks(tracks: any[], blindTracks: BlindTrack[], modelAnswers: any[]) {
  return blindTracks.map((bt) => {
    const orig = tracks.find((t) => t.id === bt.trackId);
    const q = orig?.questions?.[0];
    const modelAnswer = modelAnswers.find((a: any) => a.trackId === bt.trackId) ?? {};
    const picked = String(modelAnswer.choice ?? "").trim().toUpperCase();
    const pickedIdx = picked.charCodeAt(0) - 65;
    const choices = q?.choices ?? [];
    const isRight = choices[pickedIdx]?.correct === true;
    const correctIdx = choices.findIndex((c: any) => c.correct);
    return {
      trackId: bt.trackId,
      label: bt.label,
      picked: modelAnswer.choice ?? "(무응답)",
      correctLetter: correctIdx >= 0 ? String.fromCharCode(65 + correctIdx) : "?",
      isRight,
      problems: Array.isArray(modelAnswer.problems) ? modelAnswer.problems : [],
    };
  });
}

export async function POST(req: Request) {
  try {
    const { tracks, grade, level } = (await req.json()) as { tracks: any[]; grade: Grade; level: Level };
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return NextResponse.json({ ok: false, error: "tracks가 필요합니다." }, { status: 400 });
    }
    if (!grade || !GRADE_LABEL[grade]) {
      return NextResponse.json({ ok: false, error: "grade must be ms1 | ms2 | ms3" }, { status: 400 });
    }

    const blindTracks = buildBlindTracks(tracks);

    async function runPersona(personaLevel: Level) {
      const prompt = buildPersonaPrompt(grade, personaLevel, blindTracks);
      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 6000,
        messages: [{ role: "user", content: prompt }],
      });
      void logAnthropicUsage(`admin/updated-listening/jrms/review-quality:${grade}_${personaLevel}`, "claude-sonnet-4-6", message.usage);

      const raw = (message.content[0] as any).text as string;
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error(`${personaLevel} 페르소나 응답에서 JSON을 찾을 수 없습니다.`);
      const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

      return {
        results: scoreTracks(tracks, blindTracks, parsed.answers ?? []),
        overallProblems: Array.isArray(parsed.overallProblems) ? parsed.overallProblems : [],
      };
    }

    const [low, mid, high] = await Promise.all([runPersona("low"), runPersona("mid"), runPersona("high")]);

    const accuracy = (r: { results: { isRight: boolean }[] }) =>
      r.results.length === 0 ? 0 : r.results.filter((x) => x.isRight).length / r.results.length;

    return NextResponse.json({
      ok: true,
      grade,
      level,
      report: { low, mid, high },
      summary: {
        lowAccuracy: accuracy(low),
        midAccuracy: accuracy(mid),
        highAccuracy: accuracy(high),
      },
    });
  } catch (err: any) {
    console.error("LISTENING-JRMS-REVIEW-QUALITY ERROR", err);
    return NextResponse.json({ ok: false, error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}
