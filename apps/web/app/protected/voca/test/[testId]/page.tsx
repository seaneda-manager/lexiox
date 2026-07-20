// apps/web/app/(protected)/voca/test/[testId]/page.tsx

type Props = {
  params: Promise<{ testId: string }>;
};

export const dynamic = "force-dynamic";

export default async function VocaTestPage({ params }: Props) {
  const { testId } = await params;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      {/* 헤더 */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">VOCA – Test / Assignment</h1>
        <p className="text-sm text-gray-600">
          이 페이지는 선생님이 지정한 단어 시험 또는 과제를 수행하는 공간입니다.
          <br />
          URL의{" "}
          <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">testId</code> 값에 따라
          서로 다른 세트가 표시됩니다.
        </p>
      </header>

      {/* TODO: 나중에 Supabase에서 test payload 불러와서 VOCA Test Runner 연결 */}
      <section className="rounded-2xl border bg-white/80 p-4 shadow-sm">
        <p className="text-sm text-gray-700">
          현재는 <span className="font-mono text-xs">{testId}</span> 기준으로 라우팅만 연결된
          상태입니다.
          <br />
          다음 단계에서 <strong>voca_tests</strong> 테이블과 연동하고,{" "}
          <strong>VocaTestRunner</strong> 컴포넌트를 붙여 실제 시험 기능을 구현할 예정입니다.
        </p>
      </section>
    </main>
  );
}
