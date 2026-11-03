import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import VocabExamsClient from "./_client/VocabExamsClient";

export const dynamic = "force-dynamic";

export default async function TeacherVocabExamsPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "teacher"].includes(profile.role)) redirect("/");

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">단어 시험 출제</h1>
        <p className="mt-0.5 text-xs text-neutral-400">
          범위(Day) · 문항 수 · 문제 유형을 정해 시험을 만들고, 학생에게 온라인으로 배정하거나 시험지로 프린트합니다.
        </p>
      </header>
      <VocabExamsClient />
    </main>
  );
}
