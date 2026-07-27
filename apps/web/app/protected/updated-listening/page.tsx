// apps/web/app/(protected)/updated-listening/page.tsx
import Link from 'next/link';
import SectionGuide from '@/app/components/SectionGuide';

export const dynamic = 'force-dynamic';

export default function Listening2026Home() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <h1 className="text-xl font-semibold">Listening 2026</h1>

      <SectionGuide
        storageKey="guide-seen-updated-listening"
        color="indigo"
        icon="🎧"
        title="리스닝"
        tagline="Study Mode로 유형별 감각을 익히고, Test Mode로 실전 어댑티브 테스트를 경험합니다."
        outcomes={[
          '짧은 응답(Short Response)·대화·공지·강의 등 4가지 유형을 구분하고 전략적으로 접근할 수 있다',
          '음원을 한 번만 듣고 핵심 정보를 포착하는 능력을 기른다',
          '2단계 어댑티브 구조(Stage 1 → Stage 2)에 익숙해져 실전 감각을 높인다',
        ]}
        steps={[
          { icon: '📚', title: 'Study Mode', desc: '일시정지·되감기·다시 듣기가 되고 TEXT 버튼으로 스크립트를 볼 수 있습니다. 재생 위치에 맞춰 문장이 표시됩니다.' },
          { icon: '📋', title: 'Assignments', desc: '선생님이 배정한 시험입니다. 마감일이 있고, 제출하면 선생님에게 결과가 전달됩니다.' },
          { icon: '🎯', title: 'Test Mode', desc: '음원은 한 번만 재생되고 컨트롤이 없습니다. 되돌아갈 수 없으며 문항마다 시간이 제한됩니다.' },
          { icon: '🔍', title: 'Review', desc: '지금까지 응시한 기록과 Module별 점수를 확인합니다.' },
        ]}
        nextAction={{ label: 'Study Mode 시작', href: '/updated-listening/study' }}
      />

      {/* 네 모드의 차이가 카드에서 바로 읽히도록 제약 조건을 함께 적는다 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/updated-listening/study"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">📚 Study Mode</div>
          <div className="mt-1 text-xs text-neutral-500">
            일시정지·되감기·다시 듣기가 되고, 스크립트를 켜면 재생 위치의 문장이 표시됩니다.
          </div>
          <div className="mt-2 text-[11px] font-medium text-emerald-700">컨트롤 있음 · 스크립트 · 시간 제한 없음</div>
        </Link>

        <Link
          href="/listening/assignments"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">📋 Assignments</div>
          <div className="mt-1 text-xs text-neutral-500">
            선생님이 배정한 시험입니다. 제출하면 선생님에게 결과가 전달됩니다.
          </div>
          <div className="mt-2 text-[11px] font-medium text-amber-700">마감일 있음 · 성적 반영</div>
        </Link>

        <Link
          href="/updated-listening/test"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">🎯 Test Mode</div>
          <div className="mt-1 text-xs text-neutral-500">
            음원은 한 번만 재생됩니다. Module 1 결과로 Module 2 난이도가 갈립니다.
          </div>
          <div className="mt-2 text-[11px] font-medium text-rose-700">1회 재생 · 되돌아가기 불가</div>
        </Link>

        <Link
          href="/updated-listening/review"
          className="block rounded-lg border bg-white px-4 py-6 text-left shadow-sm transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/50"
        >
          <div className="text-sm font-semibold">🔍 Review</div>
          <div className="mt-1 text-xs text-neutral-500">
            지금까지 응시한 기록과 Module별 점수를 확인합니다.
          </div>
          <div className="mt-2 text-[11px] font-medium text-sky-700">기록 · Module별 점수</div>
        </Link>
      </div>

      {/* 고득점 10계명 */}
      <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-violet-700 uppercase">🏆 Listening 고득점 10계명</p>
        <ol className="text-xs text-violet-900 space-y-1 list-inside list-decimal">
          <li><strong>Module 1 정답률 최소 60%를 넘어 Harder Module 2를 오픈하라.</strong> 첫 30문항 집중력이 최종 점수 상한선을 결정합니다.</li>
          <li><strong>Choose a Response 유형은 화자의 숨은 뉘앙스를 조준하라.</strong> 어조, 반어법, 공감, 완곡한 거절 등 맥락적 의도를 파악하세요.</li>
          <li><strong>지문이 짧아진 만큼 Note-taking의 양을 절반으로 압축하라.</strong> 핵심 명사와 동사(Signal Words)만 최소한으로 메모하세요.</li>
          <li><strong>인과관계 역전 트랩(Causality Inversion)을 소거하라.</strong> "A가 B의 원인"이 "B가 A의 원인"으로 왜곡되는 함정을 체크하세요.</li>
          <li><strong>귀에 웅장하게 꽂힌 키워드일수록 어휘 일치 트랩을 의심하라.</strong> 강조 용어는 본문 단어가 아니라 로직으로 검증하세요.</li>
          <li><strong>범위 초과 오류(Scope Error) 유도 단어를 검출하라.</strong> All, Every, Never, Only 같은 절대적 한정사는 과장의 신호입니다.</li>
          <li><strong>Signal Words(But, However, Therefore) 직후는 머릿속에 장기 홀딩하라.</strong> 시그널 직후 정보는 최소 1분 이상 뇌 버퍼에 유지하세요.</li>
          <li><strong>Announcement 유형은 진짜 목적과 대상(Target Audience)에 집중하라.</strong> 지엽적 일정보다 공지의 핵심 목적과 수혜자를 파악하세요.</li>
          <li><strong>본문 단어가 동의어(Paraphrasing)로 치환된 선택지가 정답이다.</strong> 다른 어휘나 세련된 구문으로 의미를 똑같이 전달한 것을 찾으세요.</li>
          <li><strong>뒤로 가기는 없다, 한 문제에 Lock이 걸리면 미련 없이 전진하라.</strong> Forward-Only 아키텍처에서 과거 문제 반추는 뇌 낭비입니다.</li>
        </ol>
      </div>
    </div>
  );
}
