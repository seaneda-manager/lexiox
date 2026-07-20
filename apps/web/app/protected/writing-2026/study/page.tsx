import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Writing2026StudyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Study Mode</h1>
        <p className="text-sm text-gray-600 mt-1">
          2026 TOEFL iBT Writing의 3가지 새로운 Task 유형을 학습합니다. 각 Task별로 기초부터 차근차근 학습할 수 있습니다.
        </p>
      </div>

      <div className="rounded-lg border bg-neutral-50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Writing 2026 학습 모드</h2>
        <p className="text-sm text-gray-700">
          다음 섹션에서 각 Task 유형을 공부하고, 예시 답안을 검토한 뒤, 직접 연습할 수 있습니다.
        </p>

        <div className="space-y-3 mt-4">
          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">📝 Task 1: Integrated Writing</h3>
            <p className="text-xs text-gray-600 mb-2">
              읽기 자료와 강의를 요약하여 작성하는 통합형 Writing입니다.
            </p>
            <p className="text-xs text-gray-500">시간 제한: 20분 | 단어 수: 150-225 words</p>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">✍️ Task 2: Academic Discussion</h3>
            <p className="text-xs text-gray-600 mb-2">
              학술적 토론에 참여하는 형식의 Writing입니다.
            </p>
            <p className="text-xs text-gray-500">시간 제한: 10분 | 단어 수: 100-150 words</p>
          </div>

          <div className="rounded-lg border bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">💬 Task 3: Opinion Essay</h3>
            <p className="text-xs text-gray-600 mb-2">
              자신의 의견을 주장하고 근거를 제시하는 에세이입니다.
            </p>
            <p className="text-xs text-gray-500">시간 제한: 30분 | 단어 수: 300-400 words</p>
          </div>
        </div>

        <div className="pt-4 space-y-2">
          <p className="text-xs text-gray-600 font-semibold mb-3">🎯 다음 단계:</p>
          <Link
            href="/writing-2026/test"
            className="inline-block rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 transition"
          >
            Test Mode로 이동 →
          </Link>
        </div>
      </div>

      <div className="pt-4 flex justify-center">
        <Link
          href="/writing-2026"
          className="text-sm text-neutral-600 hover:underline"
        >
          ← Hub로 돌아가기
        </Link>
      </div>
    </div>
  );
}
