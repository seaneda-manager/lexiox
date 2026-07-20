// apps/web/app/(protected)/voca/admin/page.tsx

export const dynamic = 'force-dynamic';

export default function VocaAdminPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      {/* 헤더 */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">VOCA – Admin Console</h1>
        <p className="text-sm text-gray-600">
          단어, Reinforcing Passage, Output Task, 테스트 세트를 관리하는 관리자
          페이지입니다.
          <br />
          초기에는 간단한 폼/리스트부터 시작하고, 나중에는 JSON Import/Export,
          대량 업로드, 난이도/태그 관리까지 확장할 예정입니다.
        </p>
      </header>

      {/* 섹션 카드 3개 – Words / Passages / Output */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Words</h2>
          <p className="mt-1 text-xs text-gray-600">
            기본 단어 사전 관리, CSV/JSON 업로드, 품사/난이도/태그 설정 기능이 이
            블록에 붙을 예정입니다.
          </p>
        </div>

        <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Reinforcing Passages</h2>
          <p className="mt-1 text-xs text-gray-600">
            학습한 단어를 실제 문맥 속에서 반복 노출하는 짧은 패시지를 관리하는
            영역입니다.
          </p>
        </div>

        <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Output Tasks</h2>
          <p className="mt-1 text-xs text-gray-600">
            Speaking / Writing 과제 템플릿과 필수 단어 리스트를 관리합니다.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border bg-white/80 p-4 shadow-sm">
        <p className="text-xs text-gray-500">
          이후 단계에서 <strong>voca_tests</strong>, <strong>voca_results</strong>{' '}
          테이블과 연결하여,
          <br />
          학원 프로그램의 단어 과제/시험 엔진으로 그대로 재사용할 수 있게
          설계할 예정입니다.
        </p>
      </section>
    </main>
  );
}
