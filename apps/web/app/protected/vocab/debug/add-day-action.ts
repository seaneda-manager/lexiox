"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function addDay1Action() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      {
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
      }
    );

    // 현재 사용자
    const { data: authUser } = await supabase.auth.getUser();
    if (!authUser?.user?.id) {
      return { ok: false, error: "NOT_LOGGED_IN" };
    }

    // 학생 정보
    const { data: studentData } = await supabase
      .from("academy_students")
      .select("id")
      .eq("auth_user_id", authUser.user.id)
      .maybeSingle();

    if (!studentData?.id) {
      return { ok: false, error: "STUDENT_NOT_FOUND" };
    }

    // Day 1 추가
    const { data, error } = await supabase
      .from("student_vocab_assignments")
      .insert({
        set_id: "dadd95ed-b2f2-4e97-9886-5c38061544ae", // Hackers Voca set_id
        student_id: studentData.id,
        day_index: 1,
        available_at: "2026-07-14",
        assigned_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data, message: "Day 1 추가 완료!" };
  } catch (e: any) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}
