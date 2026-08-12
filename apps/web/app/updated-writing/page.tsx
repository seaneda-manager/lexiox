import Link from 'next/link';
import SectionGuide from '@/app/components/SectionGuide';
import TipsCarousel from '@/components/TipsCarousel';

export default function WritingHubPage() {

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Writing 2026</h1>

      <SectionGuide
        storageKey="guide-seen-updated-writing"
        color="indigo"
        icon="✍️"
        title="라이팅"
        tagline="Integrated Writing과 Academic Discussion으로 고득점 에세이를 작성합니다."
        outcomes={[
          'Integrated Task에서 읽기·듣기 정보를 효과적으로 통합하여 작성할 수 있다',
          'Academic Discussion에서 학술적 토론에 자연스럽게 참여할 수 있다',
          '25분 내에 목표 단어 수(200-300)를 달성하는 시간 관리 능력을 갖춘다',
        ]}
        steps={[
          { icon: '📚', title: 'Study Mode', desc: '라이팅 기초 전략과 Task별 접근법을 학습합니다.' },
          { icon: '✍️', title: 'Test Mode', desc: '실전과 동일한 환경에서 모의고사를 응시합니다.' },
          { icon: '📊', title: 'Review Mode', desc: 'AI 첨삭으로 피드백을 받고 개선점을 학습합니다.' },
        ]}
        nextAction={{ label: 'Assignments 보기', href: '/updated-writing/assignments' }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Assignments */}
        <Link
          href="/updated-writing/assignments"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-indigo-50 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
        >
          <div className="text-sm font-semibold">📋 Assignments</div>
          <div className="mt-1 text-xs text-gray-500">
            선생님이 배정한 시험을 확인하고 응시합니다.
          </div>
        </Link>

        {/* Review Mode */}
        <Link
          href="/student/review"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-indigo-50 hover:border-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50"
        >
          <div className="text-sm font-semibold">📊 Review</div>
          <div className="mt-1 text-xs text-gray-500">
            지금까지 응시한 기록과 Task별 성적을 확인하고 AI 첨삭으로 필수 확인 Task(논리 검토, 문법 오류, 단어 선택, 다시 작성)를 수행합니다.
          </div>
        </Link>
      </div>

      {/* 고득점 10계명 - 캐러셀 */}
      <TipsCarousel
        title="Writing 고득점 10계명"
        emoji="🏆"
        color="indigo"
        tips={[
          "Task 1은 무조건 만점. 주어·동사·시제 확인 후 제출하세요.",
          "Task 2 조건 3개는 무조건 다 써라. 체크리스트로 하나씩 확인하세요.",
          "이메일 인사말은 공식 형식. 'Dear Professor/Housing Administration'으로 시작, 'Sincerely/Best regards'로 끝내세요.",
          "Task 3 첫 문장은 주제 요약. 교수 주제 + Rachel/Mike 의견 2가지를 먼저 정리하고 나의 입장을 밝혀세요.",
          "참신한 아이디어는 버려라. Rachel이나 Mike 의견에 구체적 예시만 더하세요.",
          "단어 수는 정확히. Task 2: 100~140 단어, Task 3: 120~150 단어로 유지하세요.",
          "본문 단어는 다르게 표현. 같은 단어 반복 대신 동의어나 유사 표현을 사용하세요.",
          "짧은 문장은 연결하세요. Although, Consequently, which means 등으로 문장을 길게 만드세요.",
          "연결어를 아끼지 마라. For instance, On the other hand, Therefore 등을 적재적소에 넣으세요.",
          "마지막 30초는 검토에만 써라. 주어·동사 매칭, 3인칭 -s, 스펠링 오타를 점검하세요.",
        ]}
      />
    </div>
  );
}
