// 예전 Writing 리뷰 경로. 응시 화면이 아직 이 주소로 보내므로 새 리뷰 페이지로 넘긴다.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WritingReviewRedirect({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  redirect(`/writing-2026/review/${sessionId}`);
}
