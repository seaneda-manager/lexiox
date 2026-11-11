import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import { collectPerformance } from "@/lib/performance/collect";
import PerformanceReport from "./PerformanceReport";

/** 선생님/관리자용 리포트 (admin·teacher 라우트가 공유). 학생은 접근 불가. */
export default async function StaffPerformancePage({ studentId, backHref }: { studentId: string; backHref: string }) {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (me as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "teacher") redirect("/auth/forbidden");

  const data = await collectPerformance(studentId);
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-800">← 학생 목록으로</Link>
      </div>
      <PerformanceReport data={data} mode="staff" />
    </div>
  );
}
