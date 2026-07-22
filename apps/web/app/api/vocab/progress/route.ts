import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function todayISO_KST(): string {
  const k = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = k.getUTCFullYear();
  const m = String(k.getUTCMonth() + 1).padStart(2, "0");
  const d = String(k.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function createAuthedServerClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url || !anon) {
    throw new Error("Supabase env missing");
  }

  return createServerClient(url, anon, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name, options) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
  });
}

/**
 * Logic A: 오늘의 학습 데이터 조회
 * - 오늘 완료한 Day 개수 체크
 * - 최대 2개 제한
 * - 다음 학습할 Day 반환
 */
async function getTodayProgress(
  supabase: any,
  studentId: string,
  bookId: string
) {
  const todayISO = todayISO_KST();

  // 오늘 완료한 Day 개수
  const { data: todayCompletions, error: countError } = await supabase
    .from("student_progress")
    .select("progress_id")
    .eq("member_id", studentId)
    .eq("book_id", bookId)
    .gte("completed_at", todayISO + "T00:00:00Z")
    .lte("completed_at", todayISO + "T23:59:59Z");

  if (countError) throw countError;

  const todayCount = (todayCompletions ?? []).length;

  // 2개 이상 완료했으면 차단
  if (todayCount >= 2) {
    return {
      ok: true,
      blocked: true,
      message: "오늘의 학습 제한량(2일분)을 모두 완료했습니다. 내일 다음 진도가 오픈됩니다!",
    };
  }

  // 마지막 완료한 day_number 찾기
  const { data: lastCompleted, error: lastError } = await supabase
    .from("student_progress")
    .select("chapter_id, chapters(day_number)")
    .eq("member_id", studentId)
    .eq("book_id", bookId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) throw lastError;

  const lastDayNumber = lastCompleted
    ? (lastCompleted.chapters?.day_number ?? 0)
    : 0;
  const nextDayNumber = lastDayNumber + 1;

  // 다음 Day 챕터 정보 조회
  const { data: nextChapter, error: chapError } = await supabase
    .from("chapters")
    .select("chapter_id, day_number, book_id")
    .eq("book_id", bookId)
    .eq("day_number", nextDayNumber)
    .maybeSingle();

  if (chapError) throw chapError;

  if (!nextChapter) {
    return {
      ok: true,
      blocked: true,
      message: "모든 학습을 완료했습니다!",
    };
  }

  return {
    ok: true,
    blocked: false,
    todayCount,
    nextChapter: {
      chapterId: nextChapter.chapter_id,
      dayNumber: nextChapter.day_number,
      bookId: nextChapter.book_id,
    },
  };
}

/**
 * Logic B: 과거 완료 내역 조회 (복습용)
 */
async function getReviewChapters(
  supabase: any,
  studentId: string,
  bookId: string
) {
  const { data: completedChapters, error } = await supabase
    .from("student_progress")
    .select("DISTINCT chapter_id, chapters(day_number, chapter_id, book_id)")
    .eq("member_id", studentId)
    .eq("book_id", bookId)
    .order("chapters(day_number)", { ascending: true });

  if (error) throw error;

  const chapters = (completedChapters ?? [])
    .map((row: any) => ({
      chapterId: row.chapters?.chapter_id,
      dayNumber: row.chapters?.day_number,
      bookId: row.chapters?.book_id,
    }))
    .filter((ch: any) => ch.chapterId && ch.dayNumber);

  return {
    ok: true,
    chapters,
  };
}

/**
 * POST: 학습 완료 기록
 */
async function postCompleteChapter(
  supabase: any,
  studentId: string,
  bookId: string,
  chapterId: string
) {
  // 현재 시각에 기록
  const { data, error } = await supabase
    .from("student_progress")
    .insert([
      {
        member_id: studentId,
        book_id: bookId,
        chapter_id: chapterId,
        completed_at: new Date().toISOString(),
      },
    ])
    .select();

  if (error) throw error;

  return {
    ok: true,
    progressId: data?.[0]?.progress_id,
  };
}

/**
 * GET /api/vocab/progress?action=today&studentId=...&bookId=...
 * GET /api/vocab/progress?action=review&studentId=...&bookId=...
 *
 * POST /api/vocab/progress (body: { studentId, bookId, chapterId, action: 'complete' })
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const studentId = searchParams.get("studentId");
    const bookId = searchParams.get("bookId");

    if (!action || !studentId || !bookId) {
      return NextResponse.json(
        { ok: false, error: "Missing query parameters" },
        { status: 400 }
      );
    }

    const supabase = await createAuthedServerClient();

    if (action === "today") {
      const result = await getTodayProgress(supabase, studentId, bookId);
      return NextResponse.json(result);
    } else if (action === "review") {
      const result = await getReviewChapters(supabase, studentId, bookId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("[/api/vocab/progress] GET error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, bookId, chapterId, action } = body;

    if (!action || !studentId || !bookId || !chapterId) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = await createAuthedServerClient();

    if (action === "complete") {
      const result = await postCompleteChapter(
        supabase,
        studentId,
        bookId,
        chapterId
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { ok: false, error: "Unknown action" },
      { status: 400 }
    );
  } catch (e: any) {
    console.error("[/api/vocab/progress] POST error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
