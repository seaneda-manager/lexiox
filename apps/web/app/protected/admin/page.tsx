import Link from 'next/link';

type CardProps = {
  title: string;
  description: string;
  links: { label: string; href: string; primary?: boolean }[];
  color?: string;
};

function DashCard({ title, description, links, color = 'border-neutral-200' }: CardProps) {
  return (
    <section className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${color}`}>
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-neutral-500">{description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={[
              'rounded-xl px-3 py-1.5 text-xs font-medium transition',
              l.primary
                ? 'bg-neutral-900 text-white hover:bg-neutral-700'
                : 'border border-neutral-200 text-neutral-700 hover:bg-neutral-50',
            ].join(' ')}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function SoonCard({ title, description }: { title: string; description: string }) {
  return (
    <section className="flex flex-col rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-5">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-neutral-400">{title}</h2>
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-neutral-400">
          Soon
        </span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">{description}</p>
    </section>
  );
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{label}</span>
      <div className="h-px flex-1 bg-neutral-100" />
    </div>
  );
}

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-2 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Admin</h1>
          <p className="mt-1 text-sm text-neutral-500">LexioX 콘텐츠 · 학생 · 시스템 관리</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-semibold hover:bg-neutral-50"
          >
            📊 대시보드
          </Link>
        </div>
      </div>

      {/* TOEFL */}
      <GroupLabel label="Updated-TOEFL" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashCard
          title="Reading"
          description="2026형 TOEFL Reading 지문·문제 세트를 생성하고 수정합니다."
          links={[
            { label: '새 세트', href: '/admin/content/new?kind=reading', primary: true },
            { label: '목록', href: '/admin/content/list?kind=reading' },
            { label: '에디터', href: '/admin/content/updated-reading' },
          ]}
        />
        <DashCard
          title="Listening"
          description="TOEFL 2026 Listening 오디오·스크립트·문제 세트를 관리합니다."
          links={[
            { label: '새 시험', href: '/admin/content/updated-listening/new', primary: true },
            { label: '목록', href: '/admin/content/updated-listening' },
            { label: '콘텐츠 관리', href: '/admin/content' },
          ]}
          color="border-blue-100"
        />
        <DashCard
          title="Grammar"
          description="LEXiOX-Gram 챕터별 설명·드릴·Stylistic 문제를 편집합니다."
          links={[
            { label: '에디터 열기', href: '/admin/content/grammar-2026', primary: true },
          ]}
          color="border-indigo-100"
        />
        <DashCard
          title="Speaking"
          description="Listening & Repeat, Interview 형 Speaking 과제 관리."
          links={[
            { label: '새 시험', href: '/admin/content/updated-speaking/new', primary: true },
            { label: '목록', href: '/admin/content/updated-speaking' },
          ]}
          color="border-orange-100"
        />
        <DashCard
          title="Writing"
          description="Writing 과제 템플릿·채점 기준·샘플 답안 관리."
          links={[
            { label: '새 시험', href: '/admin/content/updated-writing/new', primary: true },
            { label: '목록', href: '/admin/content/updated-writing' },
          ]}
          color="border-teal-100"
        />
      </div>

      {/* 내신 */}
      <GroupLabel label="내신" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashCard
          title="고등 드릴 관리"
          description="고등내신 드릴 세션·지문 연결·단계 설정을 관리합니다."
          links={[
            { label: '드릴 관리', href: '/admin/naesin', primary: true },
          ]}
          color="border-emerald-100"
        />
        <DashCard
          title="고등 지문"
          description="Hi-Naesin 지문을 등록·편집·공개합니다."
          links={[
            { label: '지문 목록', href: '/admin/hi-naesin/passages', primary: true },
            { label: '새 지문', href: '/admin/hi-naesin/passages/new' },
          ]}
          color="border-emerald-100"
        />
        <DashCard
          title="중학 단원·드릴"
          description="중학내신 단원을 등록하고 드릴을 미리봅니다."
          links={[
            { label: '단원 목록', href: '/admin/middle-naesin/units', primary: true },
            { label: '새 단원', href: '/admin/middle-naesin/units/new' },
          ]}
          color="border-emerald-100"
        />
      </div>

      {/* Jr. Learning */}
      <GroupLabel label="Jr. Learning" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashCard
          title="콘텐츠 관리"
          description="Reading 지문, Grammar 단원, Listening 음성, Speaking&Writing 과제를 생성합니다."
          links={[
            { label: '콘텐츠 관리', href: '/admin/jr/content', primary: true },
          ]}
          color="border-purple-100"
        />
        <DashCard
          title="과제 할당"
          description="학생에게 Reading/Grammar/Listening/Speaking&Writing 과제를 할당합니다."
          links={[
            { label: '과제 할당', href: '/admin/jr/assignments', primary: true },
          ]}
          color="border-purple-100"
        />
        <DashCard
          title="학습 대시보드"
          description="Jr. 모듈의 학생 진도·제출물·피드백을 관리합니다."
          links={[
            { label: '대시보드', href: '/admin/jr/dashboard', primary: true },
          ]}
          color="border-purple-100"
        />
      </div>

      {/* 어휘 */}
      <GroupLabel label="어휘" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashCard
          title="단어책"
          description="단어 세트·목록을 관리하고 CSV로 가져옵니다."
          links={[
            { label: '단어책 목록', href: '/admin/vocab/sets', primary: true },
            { label: '단어 목록', href: '/admin/vocab/words' },
            { label: 'CSV 업로드', href: '/admin/vocab/import' },
          ]}
        />
        <DashCard
          title="트랙 배포"
          description="학생에게 어휘 트랙을 배포하고 진행 현황을 확인합니다."
          links={[
            { label: '트랙 배포', href: '/admin/vocab/Tracks', primary: true },
            { label: '진행 현황', href: '/admin/vocab/progress' },
          ]}
        />
        <DashCard
          title="학습 대시보드"
          description="학생들의 학습 진도·약점·목표를 한눈에 확인합니다."
          links={[
            { label: '대시보드', href: '/admin/vocab/dashboard', primary: true },
            { label: '과제 배정', href: '/admin/vocab/assign' },
          ]}
          color="border-emerald-200"
        />
      </div>

      {/* 운영 */}
      <GroupLabel label="운영" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DashCard
          title="학생 관리"
          description="학생 추가·권한 설정·활동 리포트를 확인합니다."
          links={[
            { label: '학생 목록', href: '/admin/students', primary: true },
            { label: '활동 리포트', href: '/teacher/reports/students' },
          ]}
        />
        <DashCard
          title="결과 확인"
          description="학생별 풀이 이력과 문항별 정오답을 확인합니다."
          links={[
            { label: '결과 보기', href: '/admin/results', primary: true },
          ]}
        />
        <DashCard
          title="시스템"
          description="사용자 권한·랜딩 페이지·설정을 관리합니다."
          links={[
            { label: '사용자/권한', href: '/admin/users', primary: true },
            { label: '설정', href: '/admin/settings' },
          ]}
        />
      </div>
    </div>
  );
}
