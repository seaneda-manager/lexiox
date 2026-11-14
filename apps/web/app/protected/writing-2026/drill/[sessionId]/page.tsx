// app/protected/writing-2026/drill/[sessionId]/page.tsx
// Writing Drill — 리뷰에서 고친 문장의 문형·문법으로 연습: 청크 배열 → 한글을 영어로 작문
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadReviewSession } from "@/lib/writing/reviewSession";
import DrillClient from "./_client/DrillClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sessionId: string }> };

export default async function WritingDrillPage({ params }: Props) {
  const { sessionId } = await params;
  const loaded = await loadReviewSession(sessionId);
  if (loaded.ok === false) {
    if (loaded.status === 404) return notFound();
    return <main className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-slate-600">{loaded.error}</main>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <Link href={`/writing-2026/review/${sessionId}`} className="text-xs text-slate-500 hover:text-slate-800">
          ← 리뷰로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Writing Drill</h1>
        <p className="text-sm text-slate-500">
          내 답안에서 고친 문형과 자주 틀린 문법으로 연습합니다. 먼저 청크를 배열하고, 이어서 직접 영작하세요.
        </p>
      </header>
      <DrillClient sessionId={sessionId} />
    </main>
  );
}
