import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import ReadinessClient from "./_client/ReadinessClient";

export const dynamic = "force-dynamic";

export default async function UnitReadinessPage({
  params,
}: {
  params: Promise<{ unitId: string }> | { unitId: string };
}) {
  const { unitId } = await params;

  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: unit } = await supabase
    .from("middle_naesin_units")
    .select("id, publisher, grade, semester, lesson_number, lesson_title")
    .eq("id", unitId)
    .maybeSingle();

  if (!unit) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <header>
        <Link href="/naesin/middle" className="text-xs text-sky-600 hover:underline">
          ← 단원 목록
        </Link>
        <div className="mt-2 text-xs uppercase tracking-wide text-neutral-400">시험대비 진행</div>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">
          {unit.lesson_title || `Lesson ${unit.lesson_number ?? ""}`}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {unit.publisher} · {unit.semester}학기
        </p>
        <p className="mt-3 text-sm text-neutral-500">
          각 항목을 눌러 단계를 진행하세요: <span className="font-medium text-neutral-700">수행 → check → test</span>.
          test까지 끝나면 준비 완료(readiness)로 표시됩니다.
        </p>
      </header>

      <ReadinessClient unitId={unitId} />
    </main>
  );
}
