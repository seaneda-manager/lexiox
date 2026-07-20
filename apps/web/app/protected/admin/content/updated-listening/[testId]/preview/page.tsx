// apps/web/app/(protected)/admin/content/updated-listening/[testId]/preview/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSupabase } from "@/lib/supabase/server";
import type { LListeningTest2026 } from "@/models/listening";
import { Eye } from "lucide-react";
import ListeningLinearPlayer from "@/components/listening/ListeningLinearPlayer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ testId: string }>;
};

export default async function Listening2026PreviewPage({ params }: PageProps) {
  const { testId } = await params;

  const supabase = await getServerSupabase();

  const { data, error } = await supabase
    .from("listening_tests_2026")
    .select("id,label,payload,exam_era,updated_at")
    .eq("id", testId)
    .maybeSingle();

  if (error || !data) {
    console.error("Listening2026PreviewPage load error", error);
    notFound();
  }

  const rawPayload = data.payload as LListeningTest2026 | null;
  if (!rawPayload || !Array.isArray(rawPayload.tracks)) notFound();

  const test: LListeningTest2026 = {
    ...rawPayload,
    meta: {
      ...(rawPayload.meta ?? {}),
      id: data.id,
      label: data.label,
      examEra: (rawPayload.meta?.examEra ?? "ibt_2026") as LListeningTest2026["meta"]["examEra"],
    },
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-amber-50 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-amber-800">
          <Eye className="h-3.5 w-3.5" />
          <span className="font-semibold">Admin 미리보기</span>
          <span className="text-amber-600">— 실제 학생 화면과 동일하게 렌더링됩니다. 결과는 저장되지 않습니다.</span>
        </div>
        <Link
          href="/admin/content/updated-listening"
          className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[11px] font-medium text-amber-700 hover:border-amber-400"
        >
          목록으로 돌아가기
        </Link>
      </header>

      <div className="flex-1 overflow-auto">
        <ListeningLinearPlayer test={test} />
      </div>
    </div>
  );
}
