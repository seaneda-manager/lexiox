// apps/web/app/(protected)/updated-reading/page.tsx
import Link from 'next/link';
import SectionGuide from '@/app/components/SectionGuide';

export const dynamic = 'force-dynamic';

export default function Reading2026Home() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Reading 2026</h1>

      <SectionGuide
        storageKey="guide-seen-updated-reading"
        color="sky"
        icon="📝"
        title="리딩"
        tagline="Study Mode로 학습 사이클을 쌓고, Test Mode로 실전 감각을 점검합니다."
        outcomes={[
          'TOEFL 지문의 구조(도입·전개·결론)를 빠르게 파악할 수 있다',
          '세부사항·추론·어휘·수사적 목적 문제 유형을 구분하고 전략적으로 접근할 수 있다',
          '실전과 같은 속도(지문당 20분)로 풀며 시간 압박 없이 답을 고를 수 있다',
        ]}
        steps={[
          { icon: '📚', title: 'Study Mode', desc: '시간 제한 없이 지문을 풀고 바로 해설을 확인합니다. 처음에는 여기서 시작하세요.' },
          { icon: '📋', title: 'Assignments', desc: '선생님이 배정한 시험입니다. 마감일이 있고, 제출하면 선생님에게 결과가 전달됩니다.' },
          { icon: '🎯', title: 'Test Mode', desc: '시간 제한이 있는 실전 모의고사입니다. 되돌아갈 수 없고 Module 1 성적에 따라 Module 2 난이도가 갈립니다.' },
          { icon: '🔍', title: 'Review', desc: '지금까지 푼 시험을 다시 열어 문항별 해설과 오답 이유를 확인합니다. 틀린 유형을 모아 보는 곳입니다.' },
        ]}
        nextAction={{ label: 'Assignments 보기', href: '/updated-reading/assignments' }}
      />

      {/* 네 모드의 차이가 카드에서 바로 읽히도록 제약 조건을 함께 적는다 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/updated-reading/study"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">📚 Study Mode</div>
          <div className="mt-1 text-xs text-neutral-500">
            시간 제한 없이 풀고 바로 해설을 봅니다. 되돌아가기와 다시 풀기가 자유롭습니다.
          </div>
          <div className="mt-2 text-[11px] font-medium text-emerald-700">제한 없음 · 성적 미반영</div>
        </Link>

        <Link
          href="/updated-reading/assignments"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">📋 Assignments</div>
          <div className="mt-1 text-xs text-neutral-500">
            선생님이 배정한 시험입니다. 제출하면 선생님에게 결과가 전달됩니다.
          </div>
          <div className="mt-2 text-[11px] font-medium text-amber-700">마감일 있음 · 성적 반영</div>
        </Link>

        <Link
          href="/updated-reading/test"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">🎯 Test Mode</div>
          <div className="mt-1 text-xs text-neutral-500">
            가장 최근 시험으로 실전과 같은 조건에서 응시합니다. Module 1 결과로 Module 2 난이도가 갈립니다.
          </div>
          <div className="mt-2 text-[11px] font-medium text-rose-700">시간 제한 · 되돌아가기 불가</div>
        </Link>

        <Link
          href="/updated-reading/review"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">🔍 Review</div>
          <div className="mt-1 text-xs text-neutral-500">
            지금까지 푼 시험을 다시 열어 문항별 해설과 오답 이유를 확인합니다.
          </div>
          <div className="mt-2 text-[11px] font-medium text-sky-700">해설 · 오답 분석</div>
        </Link>
      </div>

      {/* 고득점 10계명 */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-blue-700 uppercase">🏆 Reading 고득점 10계명</p>
        <ol className="text-xs text-blue-900 space-y-1 list-inside list-decimal">
          <li><strong>Complete the Words는 앞뒤 문맥과 철자 단서를 매핑하라.</strong> 문법(명사/동사/형용사)을 확인하고 문맥으로 정확한 스펠링을 매칭하세요.</li>
          <li><strong>Read in Daily Life는 지엽적 집착을 버리고 빠르게 파싱하라.</strong> "누가, 왜, 무엇을 요구하는가?" 핵심 용건만 슥 훑고 1지문당 2~3개 문제를 광속으로 풀어 시간을 아끼세요.</li>
          <li><strong>Read an Academic Passage는 길이가 200단어로 반토막 났음을 기억하라.</strong> 700단어 압박감을 버리고 한 문장 한 문장의 의미 구조를 정확하게 해석하세요.</li>
          <li><strong>비순차적 문제 출제(Non-sequential Order)에 당황하지 마라.</strong> 문제를 먼저 읽고 키워드가 지문의 어느 포인트를 가리키는지 빠르게 역추적하는 스캐닝 능력을 기르세요.</li>
          <li><strong>지문 단어와 선택지 단어의 소리 일치 함정을 소거하라.</strong> 어휘 겹침 트랩이 아닌지 문장의 전체적인 로직과 의미가 일치하는지 끝까지 서술어를 대조하세요.</li>
          <li><strong>과장된 한정사(All, Only, Every, Never)가 섞인 보기는 거르고 보라.</strong> 극단적인 100% 확정형 단어는 오답 필터링 1순위입니다.</li>
          <li><strong>역접과 인과의 연결어(However, Therefore) 뒷문장은 무조건 정답 단서다.</strong> However, In fact, Therefore, Consequently 뒷문장은 정답 코드로 직결되니 속도를 늦추고 정독하세요.</li>
          <li><strong>Paraphrasing(말 바꾸기)된 선택지가 진짜 정답 노드다.</strong> 단어는 완전히 달라졌지만 뜻이 100% 똑같은 초이스를 찾아내는 숨은그림찾기입니다.</li>
          <li><strong>모르는 전문 용어가 나와도 정의(Definition) 힌트를 활용해 넘어가라.</strong> 어려운 용어 뒤에는 대시(—), 콤마, which is defined as 등으로 쉬운 단어로 뜻을 풀어서 설명해 줍니다.</li>
          <li><strong>적응형 시험이니 Module 1에서 모든 에너지를 쏟아부어라.</strong> Module 1 성적이 나쁘면 뒤에서 만점을 받아도 고득점 진입이 원천 차단되므로 초집중으로 디버깅하세요.</li>
        </ol>
      </div>
    </div>
  );
}
