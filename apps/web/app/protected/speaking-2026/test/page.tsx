import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function Speaking2026TestPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Test Mode</h1>

      <div className="rounded-lg border bg-neutral-50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">실전 TOEFL iBT Speaking</h2>
        <p className="text-sm text-gray-700">
          이 테스트는 실제 TOEFL iBT Speaking 섹션과 동일한 형식으로 진행됩니다.
        </p>
        <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
          <li><strong>Task 1:</strong> Listen and Repeat (7개 문항, 각 8-12초)</li>
          <li><strong>Task 2:</strong> Interview (4개 문항, 각 45초)</li>
          <li><strong>Forward-Only:</strong> 이전 문제로 돌아갈 수 없습니다</li>
          <li><strong>전체 소요 시간:</strong> 약 11-15분</li>
        </ul>

        <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mt-4">
          <p className="text-yellow-800 text-xs font-semibold mb-2">⚠️ 준비 체크리스트</p>
          <ul className="text-yellow-700 text-xs space-y-1 list-disc list-inside">
            <li>조용한 환경을 확보했는가?</li>
            <li>마이크가 정상 작동하는가?</li>
            <li>Study Mode에서 충분히 연습했는가?</li>
          </ul>
        </div>

        <div className="flex gap-3 pt-4">
          <Link
            href="/speaking-2026/test/directions"
            className="flex-1 rounded-lg bg-blue-600 text-white px-4 py-3 text-center font-semibold hover:bg-blue-700 transition"
          >
            시작하기
          </Link>
          <Link
            href="/speaking-2026"
            className="flex-1 rounded-lg border border-gray-300 text-gray-700 px-4 py-3 text-center font-semibold hover:bg-gray-50 transition"
          >
            돌아가기
          </Link>
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-2">
        <p>💡 <strong>팁:</strong> 처음에는 Study Mode에서 각 유형별로 연습한 뒤, 충분히 준비된 후 Test Mode를 시작하는 것을 추천합니다.</p>
      </div>
    </div>
  );
}
