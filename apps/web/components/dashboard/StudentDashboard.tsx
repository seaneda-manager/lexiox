// apps/web/components/dashboard/StudentDashboard.tsx
type StudentReadingResult = {
  id: string;
  test_id: string;
  label: string;
  total_questions: number;
  finished_at: string | null;
};

type Props = {
  name?: string | null;
  readingResults: StudentReadingResult[];
};

export default function StudentDashboard({ name, readingResults }: Props) {
  return (
    <div className="space-y-6">
      {/* 인사 영역 */}
      <section>
        <h1 className="text-2xl font-bold tracking-tight">
          {name ? `${name}님, 안녕하세요 👋` : "안녕하세요 👋"}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          오늘은 Reading 2026 연습 한 번 더 해볼까요?
        </p>
      </section>

      {/* 빠른 액션 */}
      <section className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          className="flex flex-col items-start rounded-xl border px-4 py-3 text-left text-sm shadow-sm hover:bg-gray-50"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Reading 2026
          </span>
          <span className="mt-1 text-sm font-medium">
            새 Reading 2026 모의고사 시작하기
          </span>
          <span className="mt-1 text-xs text-gray-500">
            선생님이 배정해 둔 시험이 있다면 테스트 탭에서 확인할 수 있어요.
          </span>
        </button>

        <button
          type="button"
          className="flex flex-col items-start rounded-xl border px-4 py-3 text-left text-sm shadow-sm hover:bg-gray-50"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Review
          </span>
          <span className="mt-1 text-sm font-medium">
            최근에 푼 시험 다시 리뷰하기
          </span>
          <span className="mt-1 text-xs text-gray-500">
            틀린 문제를 다시 보면 점수가 훨씬 빨리 올라가요.
          </span>
        </button>
      </section>

      {/* Reading 2026 결과 요약 */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">최근 Reading 2026 결과</h2>
          {/* 나중에 /updated-reading/result/history 같은 페이지로 연결 */}
          <a
            href="/updated-reading/result/history"
            className="text-xs text-blue-600 hover:underline"
          >
            전체 보기
          </a>
        </div>

        {readingResults.length === 0 ? (
          <p className="text-xs text-gray-500">
            아직 저장된 Reading 2026 결과가 없습니다. 첫 시험을 한 번 쳐볼까요?
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {readingResults.map((r) => (
              <article
                key={r.id}
                className="flex flex-col rounded-lg border px-3 py-2 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{r.label}</div>
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                    {r.test_id}
                  </code>
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  총 문항: {r.total_questions}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  응시일:{" "}
                  {r.finished_at
                    ? new Date(r.finished_at).toLocaleString()
                    : "-"}
                </div>
                <div className="mt-2 flex justify-end">
                  <a
                    href={`/updated-reading/result/${r.id}`}
                    className="rounded border px-2 py-0.5 text-[11px] font-medium hover:bg-gray-50"
                  >
                    리포트 보기
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
