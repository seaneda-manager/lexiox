import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// 중복 해설 화면 정리: 기준 화면은 /student/review/listening/[resultId]
export default function ListeningReviewRedirect({ params }: { params: { resultId: string } }) {
  redirect(`/student/review/listening/${encodeURIComponent(params.resultId)}`);
}
