"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
 * 학습 완료 기록
 */
export async function completeChapterAction(
  studentId: string,
  bookId: string,
  chapterId: string
) {
  try {
    const supabase = await createAuthedServerClient();
    const { data: authUser } = await supabase.auth.getUser();

    if (!authUser?.user?.id) {
      return { ok: false, error: "NOT_LOGGED_IN" };
    }

    // student_progress 테이블에 기록
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

    if (error) {
      console.error("[completeChapterAction] Insert error:", error);
      throw error;
    }

    return {
      ok: true,
      progressId: data?.[0]?.progress_id,
    };
  } catch (e: any) {
    console.error("[completeChapterAction] error:", e);
    return { ok: false, error: e?.message ?? String(e) };
  }
}
