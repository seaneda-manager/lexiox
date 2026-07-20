import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ testId: string }> }
) {
  try {
    const { testId } = await params;
    const supabase = await getServerSupabase();

    const { data, error } = await supabase
      .from("reading_tests_2026")
      .select("payload")
      .eq("id", testId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "Test not found" },
        { status: 404 }
      );
    }

    const testPayload = data.payload as any;
    let allItems = testPayload.modules?.flatMap((m: any) => m.items || []) || [];

    // stage2Pool이 있으면 hard/easy items도 포함 (stage prefix 추가)
    if (testPayload.stage2Pool) {
      const addItemsWithStagePrefix = (items: any[], stage: string) => {
        return (items || []).map((item: any) => ({
          ...item,
          questions: (item.questions || []).map((q: any) => ({
            ...q,
            id: `${stage}_${q.id}`,
          })),
        }));
      };
      allItems = [
        ...allItems,
        ...addItemsWithStagePrefix(testPayload.stage2Pool.hard?.items, "hard"),
        ...addItemsWithStagePrefix(testPayload.stage2Pool.easy?.items, "easy"),
      ];
    }

    // 모든 questions 추출 (중복 제거)
    const questions: Array<{
      id: string;
      stem: string;
      choices: Array<{ id: string; text: string; isCorrect?: boolean }>;
      passage?: string;
      contentHtml?: string;
      contextType?: string;
    }> = [];
    const seenQuestionIds = new Set<string>();

    for (const item of allItems) {
      if (item.taskKind === "complete_words") {
        continue;
      } else {
        const qs = item.questions || [];
        for (const q of qs) {
          // 이미 본 question_id는 스킵
          if (seenQuestionIds.has(q.id)) {
            continue;
          }
          seenQuestionIds.add(q.id);
          questions.push({
            id: q.id,
            stem: q.stem,
            choices: q.choices,
            passage: item.passageHtml || item.contentHtml,
            contextType: item.contextType,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      questions,
    });
  } catch (err: any) {
    console.error("[test/questions] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
