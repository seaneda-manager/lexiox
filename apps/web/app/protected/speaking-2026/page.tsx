import Link from 'next/link';
import SectionGuide from '@/app/components/SectionGuide';

export const dynamic = 'force-dynamic';

export default function Speaking2026Home() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Speaking 2026</h1>

      <SectionGuide
        storageKey="guide-seen-speaking-2026"
        color="sky"
        icon="🎤"
        title="스피킹"
        tagline="Study Mode로 발음·유창성·구조를 연습하고, Test Mode로 실전 TOEFL iBT을 경험합니다."
        outcomes={[
          'Task 1 (Listen & Repeat) 7문항에서 정확한 발음과 자연스러운 리듬을 구사할 수 있다',
          'Task 2 (Interview) 4문항에서 45초 이내에 명확하고 일관성 있는 답변을 할 수 있다',
          'Forward-Only 형식의 실전 환경에 익숙해져 자신감 있게 응시할 수 있다',
        ]}
        steps={[
          { icon: '📚', title: 'Study Mode', desc: '발음·유창성·구조 드릴과 게임으로 스피킹 기초를 다집니다. 틀려도 괜찮고 몇 번이고 반복할 수 있습니다.' },
          { icon: '🎯', title: 'Test Mode', desc: '실제 TOEFL iBT 형식의 실전 모의고사입니다. Task 1 7개 + Task 2 4개, Forward-Only 정책을 경험합니다.' },
        ]}
        nextAction={{ label: 'Study Mode 시작', href: '/speaking-2026/study' }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/speaking-2026/study"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">Study Mode</div>
          <div className="mt-1 text-xs text-neutral-500">
            드릴과 게임으로 발음, 유창성, 문장 구조를 단계별로 연습합니다.
          </div>
        </Link>

        <Link
          href="/speaking-2026/test"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">Test Mode</div>
          <div className="mt-1 text-xs text-neutral-500">
            실제 TOEFL iBT 형식으로 Task 1, 2를 연속으로 응시합니다.
          </div>
        </Link>
      </div>

      {/* 고득점 10계명 */}
      <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-sky-700 uppercase">🏆 Speaking 고득점 10계명</p>
        <ol className="text-xs text-sky-900 space-y-1 list-inside list-decimal">
          <li><strong>준비 시간 0초, 비프음 즉시 입을 열어라.</strong> 0.5초 내에 첫 단어가 나와야 하며, 완벽함을 기다리면 이미 늦습니다.</li>
          <li><strong>메모가 금지되었으니 청각 버퍼를 가동하라.</strong> 핵심 키워드 3개만 홀딩하며 귀로 들은 소리를 뇌에 그대로 남겨두세요.</li>
          <li><strong>Task 1은 의미 단위(Chunk)로 끊어 들어라.</strong> 주어, 동사/목적어, 수식어 등 의미 덩어리로 나누어 높은 일치도를 받으세요.</li>
          <li><strong>억양과 강세를 원어민과 동기화하라.</strong> 명사/동사는 강하게, 관사/전치사는 흘리듯 리듬감을 타야 합니다.</li>
          <li><strong>Task 2 첫 질문은 1초 만능 서두로 시작하라.</strong> "Regarding the question..., I personally believe that..." 같은 고정 스타터를 준비해두세요.</li>
          <li><strong>침묵은 절대 악이다, 필러를 채워라.</strong> 2초 이상 멈추지 말고 "Well...", "What I mean is..." 같은 필러로 시간을 버세요.</li>
          <li><strong>분당 단어 수(WPM) 120~150을 유지하라.</strong> 너무 느리면 정보 부족, 너무 빠르면 발음이 뭉개집니다.</li>
          <li><strong>쉬운 단어만 쓰지 말고 인과관계 연결어를 써라.</strong> "Consequently", "For instance", "In other words", "On top of that" 등을 징검다리처럼 박으세요.</li>
          <li><strong>Task 2 후반부에는 반드시 구체적 근거/예시를 붙여라.</strong> 주장 후 "가상의 예시"나 "과거의 경험"을 덧붙여 논리의 완결성을 증명하세요.</li>
          <li><strong>45초 타이머 5초 전에 결론 문장으로 매듭지어라.</strong> 시간 배분 실패로 오버플로우되지 않도록 "Therefore, these are the reasons why..." 같은 결론으로 클로즈하세요.</li>
        </ol>
      </div>
    </div>
  );
}
