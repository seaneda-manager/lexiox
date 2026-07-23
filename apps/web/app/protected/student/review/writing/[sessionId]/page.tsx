import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { ArrowLeft, PenLine } from "lucide-react";
import type { WWritingTest2026, WWritingItem } from "@/models/writing";
import WritingReviewBody from "./WritingReviewBody";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ sessionId: string }> };

export default async function WritingReviewDetailPage({ params }: PageProps) {
  const { sessionId } = await params;
  const supabase = await getServerSupabase();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: session, error } = await supabase
    .from("writing_2026_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !session) notFound();

  const { data: testRow } = await supabase
    .from("writing_tests")
    .select("id, label, payload")
    .eq("id", session.test_id)
    .maybeSingle();

  const test = testRow?.payload as WWritingTest2026 | null;

  // Revision인 경우 parent session 조회
  let parentSession = null;
  const parentSessionId = (session as any)?.parent_session_id;
  if (parentSessionId) {
    const { data: parent } = await supabase
      .from("writing_2026_sessions")
      .select("raw_answers, created_at")
      .eq("id", parentSessionId)
      .eq("user_id", user.id)
      .maybeSingle();
    parentSession = parent;
  }

  const sessionMeta = (session as any)?.meta || {};
  const isRevision = !!parentSessionId;

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-3">
        <Link
          href="/student/review"
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-teal-400 hover:text-teal-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          리뷰 목록으로
        </Link>

        <div className="rounded-xl border border-teal-100 bg-white p-4 shadow-sm">
          <div className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-700">
            <PenLine className="h-3 w-3" />
            Writing · {isRevision ? "Revision" : "Review"}
          </div>
          <h1 className="mt-1 text-lg font-bold text-gray-900">
            {testRow?.label ?? "Writing Test"}
            {isRevision && <span className="text-sm font-normal text-amber-600"> (재작성)</span>}
          </h1>
          <p className="mt-0.5 font-mono text-[10px] text-gray-400">Session ID: {session.id}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {(session as any).created_at ? new Date((session as any).created_at).toLocaleString("ko-KR") : "-"}
          </p>
        </div>
      </header>

      <WritingReviewBody
        sessionId={session.id}
        rawAnswers={(session as any).raw_answers as Record<string, string>}
        test={test}
        initialFeedback={sessionMeta.ai_feedback ?? null}
        parentAnswers={parentSession?.raw_answers as Record<string, string> | undefined}
        isRevision={isRevision}
      />
    </main>
  );
}
