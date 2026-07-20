'use client';

import { useRouter } from 'next/navigation';

export default function HomeSelector() {
  const router = useRouter();

  const goStudy = () => router.push('/reading/study');
  const goTest = () => router.push('/reading/test');
  const goLogin = () => router.push('/auth/login');

  return (
    <div className="mx-auto max-w-lg p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Klai Reading</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={goStudy} className="rounded-xl border px-4 py-3">
          Study
        </button>
        <button onClick={goTest} className="rounded-xl border px-4 py-3">
          Test
        </button>
        <button onClick={goLogin} className="rounded-xl border px-4 py-3">
          Login
        </button>
      </div>

      <p className="text-sm text-gray-500">
        ?곷떒 硫붾돱媛 以鍮꾨릺湲??꾧퉴吏 ?꾩떆 ???좏깮 ?붾㈃?낅땲??
      </p>
    </div>
  );
}





