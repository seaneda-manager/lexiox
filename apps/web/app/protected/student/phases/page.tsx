import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PhasesRedirectPage() {
  // 학생 첫 방문 시 현재 phase로 리다이렉트
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // TODO: 학생의 현재 phase 조회 및 리다이렉트
  // 임시: 대시보드로 돌아가기
  redirect("/student/home");
}
