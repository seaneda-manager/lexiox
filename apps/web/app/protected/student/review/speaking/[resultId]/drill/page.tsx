// /student/review/speaking/[resultId]/drill
// 녹음 중심 Speaking Drill: 듣고 따라 말하기 → 기억해서 다시 말하기 → 단문 말하기 → 같은 문제 다시 답하기
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSpeakingReviewSession } from "@/lib/speaking/reviewSession";
import SpeakingDrillClient from "./_client/SpeakingDrillClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ resultId: string }> };

export default async function SpeakingDrillPage({ params }: Props) {
  const { resultId } = await params;
  const loaded = await loadSpeakingReviewSession(resultId);
  if (loaded.ok === false) {
    if (loaded.status === 404) return notFound();
    return <main className="mx-auto max-w-3xl px-6 py-16 text-center text-sm text-gray-600">{loaded.error}</main>;
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <Link href={`/student/review/speaking/${resultId}`} className="text-xs text-gray-500 hover:text-gray-800">
          ← 리뷰로 돌아가기
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Speaking Drill</h1>
        <p className="text-sm text-gray-500">
          내 답변에서 고친 문형과 자주 틀린 문법을 말로 연습합니다. 모든 문항은 녹음해서 진행해요.
        </p>
      </header>
      <SpeakingDrillClient resultId={resultId} prompt={loaded.ctx.prompt} firstScript={loaded.ctx.script} />
    </main>
  );
}
