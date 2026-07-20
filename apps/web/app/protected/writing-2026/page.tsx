import Link from 'next/link';
import SectionGuide from '@/app/components/SectionGuide';

export const dynamic = 'force-dynamic';

export default function Writing2026Home() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Writing 2026</h1>

      <SectionGuide
        storageKey="guide-seen-writing-2026"
        color="amber"
        icon="✍️"
        title="라이팅"
        tagline="Study Mode로 3가지 새로운 Writing Task를 학습하고, Test Mode로 실전 감각을 익힙니다."
        outcomes={[
          '2026 TOEFL iBT 형식의 3가지 새로운 Task 유형을 이해하고 연습할 수 있다',
          '시간 제한 내에 자신의 생각을 명확하고 일관성 있게 표현할 수 있다',
          '실전과 동일한 환경에서 글쓰기 능력을 점검할 수 있다',
        ]}
        steps={[
          { icon: '📚', title: 'Study Mode', desc: '각 Task 유형별로 천천히 학습합니다. 문제 유형을 이해하고 예시 답안을 검토할 수 있습니다.' },
          { icon: '🎯', title: 'Test Mode', desc: '시간 제한이 있는 실전 모의고사입니다. Study를 충분히 반복한 뒤 점검용으로 활용하세요.' },
        ]}
        nextAction={{ label: 'Study Mode 시작', href: '/writing-2026/study' }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/writing-2026/study"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">Study Mode</div>
          <div className="mt-1 text-xs text-neutral-500">
            3가지 Writing Task를 유형별로 학습하고 모범 답안을 검토합니다.
          </div>
        </Link>

        <Link
          href="/writing-2026/test"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">Test Mode</div>
          <div className="mt-1 text-xs text-neutral-500">
            시간 제한이 있는 실전 모의고사를 응시합니다.
          </div>
        </Link>
      </div>
    </div>
  );
}
