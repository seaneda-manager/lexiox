// /student/review/speaking/[resultId]/vocab
// 말하기 단어시험: 암기 시간(클릭하면 발음) → 한글 뜻을 보고/듣고 영어 단어·이어동사·숙어를 말하기
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadSpeakingReviewSession } from "@/lib/speaking/reviewSession";
import SpeakingVocabClient from "./_client/SpeakingVocabClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ resultId: string }> };

export default async function SpeakingVocabPage({ params }: Props) {
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
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">말하기 단어시험</h1>
        <p className="text-sm text-gray-500">
          이 주제의 모범답안과 내 답변에 나온 단어·이어동사·숙어입니다. 먼저 외우고, 한글 뜻을 듣고 영어로 말해 보세요.
        </p>
      </header>
      <SpeakingVocabClient resultId={resultId} />
    </main>
  );
}
