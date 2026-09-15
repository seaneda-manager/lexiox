import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getServerSupabase } from "@/lib/supabase/server";
import StudentPlanCalendar from "../_components/StudentPlanCalendar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StudentPlanPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const supabase = await getServerSupabase();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", studentId)
    .maybeSingle();

  if (error || !profile) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link
        href={`/teacher/students/${studentId}`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" /> 학생 상세로
      </Link>
      <div>
        <h1 className="text-xl font-bold text-gray-900">{profile.full_name ?? "이름 미등록"}의 계획표</h1>
        <p className="text-sm text-gray-500">학생이 직접 짠 계획입니다 — 읽기 전용</p>
      </div>
      <StudentPlanCalendar studentId={studentId} />
    </main>
  );
}
