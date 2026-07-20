// apps/web/app/(protected)/listening/test/[setId]/ClientRunner.tsx
'use client';

import dynamic from 'next/dynamic';

type RunnerProps = {
  initialSetId: string;
  debug?: boolean;
  autoStart?: boolean;
};

// 제네릭은 "props 타입"을 지정!
// loader는 default export(컴포넌트)를 반환하도록 .then(mod => mod.default)
const ListeningTestRunner = dynamic<RunnerProps>(
  () => import('../ListeningTestRunner').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 text-sm text-gray-600">Loading test runner…</div>
    ),
  }
);

export default function ClientRunner({ setId }: { setId: string }) {
  return <ListeningTestRunner initialSetId={setId} autoStart />;
}
