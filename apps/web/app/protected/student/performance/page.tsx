import { redirect } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { collectPerformance } from "@/lib/performance/collect";
import PerformanceReport from "@/components/performance/PerformanceReport";

export const dynamic = "force-dynamic";

/** 학생 본인용 리포트: 요약 + 오답 분석 + 선생님 코멘트(읽기 전용) */
export default async function StudentPerformancePage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const data = await collectPerformance(user.id);
  return (
    <div className="min-h-screen bg-slate-50">
      <PerformanceReport data={data} mode="student" />
    </div>
  );
}
