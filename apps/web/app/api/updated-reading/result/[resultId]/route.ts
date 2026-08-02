// apps/web/app/api/updated-reading/result/[resultId]/route.ts
import { NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server";
import type { RReadingTest2026 } from "@/models/reading";

/**
 * 답안을 {questionId: 선택값} 맵으로 정규화한다.
 * 다중선택은 배열로 저장될 수 있어 문자열로 합쳐 비교 가능하게 만든다.
 */
function normalizeAnswers(raw: unknown): Record<string, string> {
  if (!raw) return {};

  const flatten = (v: unknown): string =>
    Array.isArray(v) ? v.map(String).sort().join(",") : String(v ?? "");

  if (Array.isArray(raw)) {
    const map: Record<string, string> = {};
    for (const entry of raw as any[]) {
      const id = entry?.questionId ?? entry?.question_id;
      if (!id) continue;
      map[id] = flatten(entry?.chosenChoiceId ?? entry?.answer ?? entry?.value);
    }
    return map;
  }

  if (typeof raw === "object") {
    const map: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      map[k] = flatten(v);
    }
    return map;
  }

  return {};
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId } = await params;
    console.log("[API] GET /api/updated-reading/result/", resultId);
    const supabase = getServiceRoleClient();

    // 1. 결과 데이터 조회 (id 또는 assignment_id로 조회)
    let resultData;
    let resultError;

    // 먼저 id로 조회 시도 (숫자)
    const idNum = parseInt(resultId, 10);
    console.log("[API] Trying numeric id:", idNum, "or string:", resultId);
    let { data: byId, error: byIdError } = await supabase
      .from("reading_results_2026")
      .select("*")
      .eq("id", !isNaN(idNum) ? idNum : resultId)
      .single();

    console.log("[API] Query result:", { byId, byIdError });

    if (!byIdError && byId) {
      resultData = byId;
      resultError = null;
    } else {
      console.log("[API] Trying assignment_id:", resultId);
      // id 조회 실패 시 assignment_id로 조회
      const { data: byAssignmentId, error: byAssignmentError } = await supabase
        .from("reading_results_2026")
        .select("*")
        .eq("assignment_id", resultId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      console.log("[API] Assignment query result:", { byAssignmentId, byAssignmentError });
      resultData = byAssignmentId;
      resultError = byAssignmentError;
    }

    if (resultError || !resultData) {
      console.error("[API] Result not found:", { resultError, resultData });
      return NextResponse.json(
        { ok: false, error: "Result not found" },
        { status: 404 }
      );
    }

    // 2. 테스트 정보 조회
    const { data: testData, error: testError } = await supabase
      .from("reading_tests_2026")
      .select("*")
      .eq("id", resultData.test_id)
      .single();

    if (testError || !testData) {
      return NextResponse.json(
        { ok: false, error: "Test not found" },
        { status: 404 }
      );
    }

    // 3. 테스트 데이터 파싱 — 컬럼명은 payload다 (data가 아니다)
    const testJson = testData.payload as RReadingTest2026;
    if (!testJson?.modules?.length) {
      return NextResponse.json(
        { ok: false, error: "Test payload is empty or malformed" },
        { status: 500 }
      );
    }
    const allItems = [
      ...(testJson.modules[0]?.items ?? []),
      ...(testJson.modules[1]?.items ?? []),
    ];

    // 4. 사용자 답변 파싱
    // 저장 경로가 세 가지다:
    // - test 제출은 [{questionId, chosenChoiceId}] 배열
    // - study 제출은 {questionId: answer} 맵
    // - Complete Words는 {cw__itemId__blankId: answer} 형태
    // 모두 맵으로 정규화하되, Complete Words 키도 변환한다.
    let userAnswers = normalizeAnswers(resultData.answers);

    // Complete Words 키를 변환: cw__itemId__blankId → blankId
    const cwAnswers: Record<string, string> = {};
    for (const [key, val] of Object.entries(userAnswers)) {
      if (key.startsWith("cw__")) {
        const parts = key.split("__");
        if (parts.length === 3) {
          cwAnswers[parts[2]] = val; // blankId를 키로 사용
        }
      } else {
        cwAnswers[key] = val;
      }
    }
    userAnswers = cwAnswers;

    // 5. 모든 question_id 수집
    const questionIds = new Set<string>();
    for (const item of allItems) {
      if (item.taskKind === "complete_words") {
        const cw = item as any;
        for (const blank of cw.blanks ?? []) {
          questionIds.add(blank.id);
        }
      } else {
        const qs = (item as any).questions;
        for (const q of qs) {
          questionIds.add(q.id);
        }
      }
    }

    // 6. 설명 데이터 조회
    const { data: explanations } = await supabase
      .from("reading_question_explanations")
      .select("*")
      .in("question_id", Array.from(questionIds));

    const explanationMap = new Map(
      (explanations ?? []).map((e: any) => [e.question_id, e])
    );

    // 7. 문제별 결과 구성
    const questions = [];

    for (const item of allItems) {
      if (item.taskKind === "complete_words") {
        const cw = item as any;
        // 여러 필드명 시도
        const paragraph = cw.paragraphHtml || cw.paragraph || cw.content || cw.text || cw.body || "";
        const allBlanks = cw.blanks ?? [];

        for (const blank of allBlanks) {
          const isCorrect = userAnswers[blank.id] === blank.correctToken;
          const explanation = explanationMap.get(blank.id);

          // 해당 blank의 문장만 추출
          let sentence = blank.stem || "";

          if (!sentence && paragraph) {
            // stem이 없으면 paragraph에서 문장 추출
            // 정답이 포함된 문장을 찾기
            const correctToken = blank.correctToken;
            const sentences = paragraph.split(/[.!?]+/).map((s: string) => s.trim()).filter((s: string) => s);
            const foundSentence = sentences.find((s: string) => s.toLowerCase().includes(correctToken.toLowerCase()));
            sentence = foundSentence || paragraph.substring(0, 200);
          }

          questions.push({
            id: blank.id,
            number: questions.length + 1,
            stem: sentence,
            paragraph: paragraph, // 전체 지문
            blanks: allBlanks.map((b: any, idx: number) => ({
              id: b.id,
              index: idx + 1,
              correctToken: b.correctToken,
            })),
            type: "complete_words",
            itemType: `단어 채우기`,
            userAnswer: userAnswers[blank.id] ?? null,
            correctAnswer: blank.correctToken,
            isCorrect,
            explanation: explanation ?? null,
          });
        }
      } else {
        const qs = item.taskKind === "daily_life"
          ? (item as any).questions
          : (item as any).questions;

        for (const q of qs) {
          const correctChoice = q.choices.find(
            (c: any) => c.isCorrect === true || c.is_correct === true
          );
          const isCorrect = userAnswers[q.id] === correctChoice?.id;
          const explanation = explanationMap.get(q.id);
          questions.push({
            id: q.id,
            number: questions.length + 1,
            stem: q.stem,
            type: item.taskKind,
            itemType:
              item.taskKind === "daily_life"
                ? `일상 읽기 (${(item as any).contextType})`
                : "학술 지문",
            userAnswer: userAnswers[q.id] ?? null,
            correctAnswer: correctChoice?.text ?? "Unknown",
            isCorrect,
            explanation: explanation ?? null,
          });
        }
      }
    }

    // 6. Stage별 점수 계산
    // Module 2가 없는 시험(적응형 풀만 있는 경우 등)도 있으므로 빈 배열로 방어한다.
    const stage1Items = testJson.modules[0]?.items ?? [];
    const stage2Items = testJson.modules[1]?.items ?? [];

    let stage1Correct = 0,
      stage1Total = 0;
    let stage2Correct = 0,
      stage2Total = 0;

    for (const item of stage1Items) {
      if (item.taskKind === "complete_words") {
        const cw = item as any;
        for (const blank of cw.blanks ?? []) {
          stage1Total++;
          if (userAnswers[blank.id] === blank.correctToken) stage1Correct++;
        }
      } else {
        const qs = (item as any).questions;
        for (const q of qs) {
          stage1Total++;
          const correctChoice = q.choices.find(
            (c: any) => c.isCorrect === true || c.is_correct === true
          );
          if (userAnswers[q.id] === correctChoice?.id) stage1Correct++;
        }
      }
    }

    for (const item of stage2Items) {
      if (item.taskKind === "complete_words") {
        const cw = item as any;
        for (const blank of cw.blanks ?? []) {
          stage2Total++;
          if (userAnswers[blank.id] === blank.correctToken) stage2Correct++;
        }
      } else {
        const qs = (item as any).questions;
        for (const q of qs) {
          stage2Total++;
          const correctChoice = q.choices.find(
            (c: any) => c.isCorrect === true || c.is_correct === true
          );
          if (userAnswers[q.id] === correctChoice?.id) stage2Correct++;
        }
      }
    }

    return NextResponse.json({
      testId: resultData.test_id,
      // 페이로드 meta가 비어 있을 수 있으니 테이블의 label로 폴백한다.
      testLabel: testJson.meta?.label ?? testData.label ?? "Reading Test",
      stage1: {
        correct: stage1Correct,
        total: stage1Total,
        score: stage1Total > 0 ? Math.round((stage1Correct / stage1Total) * 100) : 0,
      },
      stage2: {
        correct: stage2Correct,
        total: stage2Total,
        score: stage2Total > 0 ? Math.round((stage2Correct / stage2Total) * 100) : 0,
      },
      questions,
    });
  } catch (err: any) {
    console.error("[updated-reading/result/[resultId]] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const { resultId: assignmentId } = await params;
    const supabase = getServiceRoleClient();
    const body = await req.json();

    const { testId, answers, stage1Correct, stage1Total, stage2Correct, stage2Total } = body;

    if (!testId || !answers) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 현재 사용자 ID 가져오기
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "User not authenticated" },
        { status: 401 }
      );
    }

    // reading_results_2026 테이블에 insert (assignment_id, user_id 사용)
    const totalQuestions = (stage1Total ?? 0) + (stage2Total ?? 0);
    const { data, error } = await supabase
      .from("reading_results_2026")
      .insert({
        user_id: userId,
        assignment_id: assignmentId,
        test_id: testId,
        answers: answers,
        total_questions: totalQuestions,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting result:", error);
      return NextResponse.json(
        { ok: false, error: error.message ?? "Failed to save result" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      resultId: assignmentId,
    });
  } catch (err: any) {
    console.error("[updated-reading/result POST] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
