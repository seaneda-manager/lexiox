import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// 중복 해설 화면 정리: 기준 화면은 /student/review/speaking/[resultId]
export default function SpeakingResultRedirect({ params }: { params: { id: string } }) {
  redirect(`/student/review/speaking/${encodeURIComponent(params.id)}`);
}
