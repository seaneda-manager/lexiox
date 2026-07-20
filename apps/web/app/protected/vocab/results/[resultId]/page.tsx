// apps/web/app/(protected)/vocab/results/[resultId]/page.tsx
import { notFound } from "next/navigation";
import { getServerSupabase } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ resultId: string }>;
};

type RawAnswers = {
  answers?: {
    questionId: string;
    answer: string;
    translationKo?: string;
  }[];
  questions?: {
    id: string;
    type: string;
  }[];
};

export const dynamic = "force-dynamic";

export default async function VocabExamResultDetailPage({ params }: PageProps) {
  const { resultId } = await params;

  const supabase = await getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto space-y-6 pb-8 max-w-3xl">
        <p className="text-sm text-gray-500">로그인이 필요합니다.</p>
      </main>
    );
  }

  const { data: result, error } = await supabase
    .from("vocab_exam_results")
    .select("*")
    .eq("id", resultId)
    .maybeSingle();

  if (error) {
    console.error("Failed to load vocab_exam_result:", error);
    return (
      <main className="mx-auto space-y-6 pb-8 max-w-3xl">
        <p className="text-sm text-red-600">결과를 불러오는 중 오류가 발생했습니다.</p>
      </main>
    );
  }

  if (!result) {
    notFound();
  }

  // user_id 체크 (기본 방어: 자기 것만 볼 수 있게)
  if (result.user_id && result.user_id !== user.id) {
    return (
      <main className="mx-auto space-y-6 pb-8 max-w-3xl">
        <p className="text-sm text-gray-500">이 결과에 접근할 권한이 없습니다.</p>
      </main>
    );
  }

  const createdAt = new Date(result.created_at);
  const raw = (result.raw_answers ?? null) as RawAnswers | null;

  const answers = raw?.answers ?? [];
  const questionsMeta = raw?.questions ?? [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      {/* 상단 요약 영역 */}
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">단어 시험 결과 상세</h1>
        <p className="text-xs text-gray-500">{createdAt.toLocaleString("ko-KR")} 에 응시한 시험입니다.</p>
      </header>

      {/* 점수 요약 카드 */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p>
              정확도 <span className="text-lg font-bold">{result.rate_auto}%</span>
            </p>
            <p className="mt-1 text-xs">
              정답 {result.correct_auto} / 총 {result.total_questions} 문항
            </p>
          </div>

          <div className="text-xs text-emerald-900">
            <p>
              모드: <span className="font-semibold">{result.mode ?? "core"}</span>
            </p>
            <p>
              코스(GradeBand): <span className="font-semibold">{result.grade_band ?? "-"}</span>
            </p>
          </div>
        </div>
      </section>

      {/* 개별 문항 / 응답 로그 */}
      <section className="rounded-2xl border border-gray-200 bg-white px-4 py-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-800">문항별 응답 기록</h2>

        {answers.length === 0 ? (
          <p className="text-sm text-gray-500">저장된 응답 기록이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {answers.map((a, idx) => {
              const meta = questionsMeta.find((q) => q.id === a.questionId);
              const qTypeLabel =
                meta?.type === "WORD_TO_MEANING"
                  ? "단어 → 뜻"
                  : meta?.type === "MEANING_TO_WORD"
                  ? "뜻 → 단어"
                  : meta?.type === "SENTENCE_FILL"
                  ? "문장 빈칸 채우기"
                  : meta?.type ?? "기타";

              return (
                <div
                  key={a.questionId + idx}
                  className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      Q{idx + 1}. {qTypeLabel}
                    </span>
                    <span className="text-[10px] text-gray-400">ID: {a.questionId}</span>
                  </div>

                  <div className="mt-1">
                    <p className="text-[11px] text-gray-600">
                      내가 쓴 답: <span className="font-semibold">{a.answer}</span>
                    </p>
                    {a.translationKo && (
                      <p className="mt-1 text-[11px] text-gray-500">한국어 해석: {a.translationKo}</p>
                    )}
                  </div>

                  {/* 나중에: 정답/오답 여부, 정답 값까지 같이 저장하면 여기에서 색으로 표시 가능 */}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-[10px] text-gray-400">
          ※ 현재는 학생이 작성한 응답 로그 위주로 보여줍니다. 나중에 정답/오답 정보, 틀린 단어만 모아서
          리뷰하는 화면으로 확장할 수 있어요.
        </p>
      </section>
    </main>
  );
}
