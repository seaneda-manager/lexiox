// app/protected/student/writing/review/[sessionId]/page.tsx
// Writing Review - Error Analysis, Patterns, Exemplar Answers

import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sessionId: string }> };

export default async function WritingReviewPage({ params }: Props) {
  const { sessionId } = await params;
  const supabase = await getServerSupabase();

  const { data: session, error } = await supabase
    .from("writing_2026_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !session) {
    return notFound();
  }

  // TODO: Fetch analysis data from /api/writing-2026/analyze
  // For now, show placeholder structure

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Writing Review</h1>
        <p className="text-slate-600">Error Analysis & Pattern Recognition</p>
      </header>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Section 1: Build a Sentence */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">1. Choose a Response</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500">Word Count</p>
              <p className="text-2xl font-bold text-slate-900">--</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Error Patterns</p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-slate-600">Grammar: --</p>
                <p className="text-xs text-slate-600">Vocabulary: --</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Email Writing */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">2. Email Writing</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500">Word Count</p>
              <p className="text-2xl font-bold text-slate-900">--</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Error Patterns</p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-slate-600">Grammar: --</p>
                <p className="text-xs text-slate-600">Structure: --</p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Academic Discussion */}
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-bold text-slate-900">3. Academic Discussion</h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold text-slate-500">Word Count</p>
              <p className="text-2xl font-bold text-slate-900">--</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">Error Patterns</p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-slate-600">Clarity: --</p>
                <p className="text-xs text-slate-600">Vocabulary: --</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Pattern Breakdown */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-bold text-slate-900">Error Pattern Analysis</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-600">Most Common Errors</p>
            <p className="text-xs text-slate-500">Loading analysis...</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-600">Strengths</p>
            <p className="text-xs text-slate-500">Loading analysis...</p>
          </div>
        </div>
      </section>

      {/* Drill Button */}
      <div className="flex justify-center">
        <a
          href={`/writing/drill/${sessionId}`}
          className="rounded-xl bg-teal-600 px-8 py-3 text-sm font-bold text-white hover:bg-teal-700"
        >
          Start Drill Based on Errors
        </a>
      </div>
    </main>
  );
}
