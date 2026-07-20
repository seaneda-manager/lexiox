import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 단일 객체면 배열로 감싸기
    const items = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Empty array" },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();

    // 검증: 모든 항목이 question_id와 test_id를 가져야 함
    const invalid = items.filter((item: any) => !item.question_id || !item.test_id);
    if (invalid.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: `${invalid.length}개 항목이 question_id 또는 test_id가 없습니다`,
        },
        { status: 400 }
      );
    }

    // upsert로 저장 (기존 항목은 업데이트, 새 항목은 생성)
    const { error } = await supabase
      .from("reading_question_explanations")
      .upsert(
        items.map((item: any) => ({
          question_id: item.question_id,
          test_id: item.test_id,
          question_interpretation: item.question_interpretation || null,
          evidence_interpretation: item.evidence_interpretation || null,
          correct_choice_explanation: item.correct_choice_explanation || null,
          incorrect_choices: item.incorrect_choices || null,
          vocabulary_notes: item.vocabulary_notes || null,
        })),
        { onConflict: "question_id" }
      );

    if (error) {
      console.error("[bulk-upload] upsert error:", error);
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: `${items.length}개 설명 업로드 완료`,
      count: items.length,
    });
  } catch (err: any) {
    console.error("[bulk-upload] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
