import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";
import { ArrowLeft, Mic, Star } from "lucide-react";
import ScriptAndFeedback from "./ScriptAndFeedback";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ resultId: string }> };

export default async function SpeakingReviewDetailPage({ params }: PageProps) {
  const { resultId } = await params;
  const supabase = await getServerSupabase();

  const { data: result, error } = await supabase
    .from("speaking_results_2026")
    .select(
      "id,test_id,task_id,mode,prompt,script,audio_url,approx_words,approx_sentences,created_at,meta," +
        "grading_status,ai_delivery_score,ai_language_score,ai_topic_score,ai_total_score," +
        "final_delivery_score,final_language_score,final_topic_score,final_total_score,final_feedback"
    )
    .eq("id", resultId)
    .maybeSingle();

  if (error) console.error("SpeakingReviewDetailPage error", error);
  if (!result) notFound();

  const { data: testRow } = await supabase
    .from("speaking_tests")
    .select("id,label")
    .eq("id", result.test_id)
    .maybeSingle();

  // 선생님이 최종 채점했으면 그 점수, 아니면 AI 채점 점수, 둘 다 없으면 채점 전.
  const isFinal = result.grading_status === "teacher_graded";
  const delivery = result.final_delivery_score ?? result.ai_delivery_score;
  const language = result.final_language_score ?? result.ai_language_score;
  const topic = result.final_topic_score ?? result.ai_topic_score;
  const totalScore = result.final_total_score ?? result.ai_total_score;

  const scores = [
    { label: "Delivery", value: delivery },
    { label: "Language", value: language },
    { label: "Topic", value: topic },
  ].filter((s) => s.value != null);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      {/* 헤더 */}
      <header className="space-y-3">
        <Link
          href="/student/review"
          className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-orange-400 hover:text-orange-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          리뷰 목록으로
        </Link>

        <div className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm">
          <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
            <Mic className="h-3 w-3" />
            Speaking · Review
          </div>
          <h1 className="mt-1 text-lg font-bold text-gray-900">
            {testRow?.label ?? "Speaking Test"}
          </h1>
          <p className="mt-0.5 font-mono text-[10px] text-gray-400">Result ID: {result.id}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            {result.created_at ? new Date(result.created_at).toLocaleString("ko-KR") : "-"}
          </p>
        </div>
      </header>

      {/* 점수 */}
      {scores.length > 0 ? (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <Star className="h-4 w-4 text-orange-400" />
            점수
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isFinal ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {isFinal ? "선생님 최종 채점" : "AI 채점 (임시)"}
            </span>
            {totalScore != null && (
              <span className="ml-auto text-lg font-black text-orange-600">{totalScore}/30</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {scores.map((s) => (
              <div key={s.label} className="rounded-lg border border-orange-100 bg-orange-50 p-3 text-center">
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className="text-xl font-bold text-orange-700">{s.value}/4</div>
              </div>
            ))}
          </div>
          {isFinal && result.final_feedback && (
            <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">{result.final_feedback}</p>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed bg-gray-50 p-4 text-center text-xs text-gray-500">
          아직 채점 전입니다.
        </section>
      )}

      {/* 내 녹음 다시 듣기 */}
      {result.audio_url && (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold text-gray-600">내 답변 (녹음)</div>
          <audio controls src={result.audio_url} className="w-full h-10" />
        </section>
      )}

      {/* 프롬프트 */}
      {result.prompt && (
        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-xs font-semibold text-gray-600">문제</div>
          <p className="text-sm leading-relaxed text-gray-800">{result.prompt}</p>
        </section>
      )}

      {/* 내 답변 스크립트 + AI 첨삭 */}
      <ScriptAndFeedback
        resultId={result.id}
        initialScript={result.script ?? null}
        initialPrompt={result.prompt ?? null}
        approxWords={result.approx_words ?? null}
        approxSentences={result.approx_sentences ?? null}
        initialFeedback={(result.meta as { ai_feedback?: string } | null)?.ai_feedback ?? null}
      />
    </main>
  );
}
