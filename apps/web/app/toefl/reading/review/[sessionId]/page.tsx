export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  redirect(`/reading/review/${encodeURIComponent(sessionId)}?profileId=toefl_review`);
}