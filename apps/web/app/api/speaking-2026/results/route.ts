// apps/web/app/api/speaking-2026/results/route.ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type SpeakingResultPayload = {
  testId: string;  // 어떤 스피킹 세트인지
  taskId: string;  // "task1" | "task2" | "task3" 등
  script: string;  // 학생 답변 텍스트

  prompt?: string;
  mode?: string | null; // "study" | "test" | "homework" 등

  approxSentences?: number | null;
  approxWords?: number | null;

  fluencyScore?: number | null;
  contentScore?: number | null;
  languageScore?: number | null;
  pronunciationScore?: number | null;

  meta?: Record<string, unknown>;
};

export async function POST(req: Request) {
  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let payload: SpeakingResultPayload;

  try {
    payload = (await req.json()) as SpeakingResultPayload;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const {
    testId,
    taskId,
    script,
    prompt,
    mode = "study",
    approxSentences = null,
    approxWords = null,
    fluencyScore = null,
    contentScore = null,
    languageScore = null,
    pronunciationScore = null,
    meta = {},
  } = payload;

  if (!testId || !taskId || !script?.trim()) {
    return NextResponse.json(
      { ok: false, error: "testId, taskId, script are required" },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("speaking_results_2026").insert({
    user_id: user?.id ?? null,
    test_id: testId,
    task_id: taskId,
    script: script.trim(),
    prompt,
    mode,
    approx_sentences: approxSentences,
    approx_words: approxWords,
    fluency_score: fluencyScore,
    content_score: contentScore,
    language_score: languageScore,
    pronunciation_score: pronunciationScore,
    meta,
  });

  if (error) {
    console.error("Failed to insert speaking_results_2026", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
