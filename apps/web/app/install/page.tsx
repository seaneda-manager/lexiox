import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'LEXiOX 앱 설치',
  description: 'LEXiOX를 홈 화면에 추가하세요.',
};

const IOS_STEPS = [
  { icon: '1', text: 'Safari로 lexiox.com 접속' },
  { icon: '2', text: '하단 공유 버튼(□↑) 탭' },
  { icon: '3', text: '"홈 화면에 추가" 탭' },
  { icon: '4', text: '오른쪽 위 "추가" 탭' },
];

const ANDROID_STEPS = [
  { icon: '1', text: 'Chrome으로 lexiox.com 접속' },
  { icon: '2', text: '주소창 아래 "앱 설치" 배너 탭' },
  { icon: '3', text: '또는 메뉴(⋮) → "앱 설치" 탭' },
  { icon: '4', text: '"설치" 버튼 탭' },
];

export default function InstallPage() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {/* 헤더 */}
      <div className="flex flex-col items-center pt-16 pb-10 px-6 text-center">
        <Image
          src="/icons/app-icon-source.png"
          alt="LEXiOX"
          width={96}
          height={96}
          className="rounded-3xl shadow-2xl mb-6"
        />
        <h1 className="text-3xl font-black tracking-tight">LEXiOX</h1>
        <p className="text-neutral-400 mt-2 text-sm">홈 화면에 추가하면 앱처럼 바로 실행돼요</p>
      </div>

      <div className="max-w-sm mx-auto px-6 space-y-8 pb-20">

        {/* QR 코드 */}
        <section className="rounded-3xl bg-white p-6 text-center space-y-3">
          <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wide">QR 코드로 접속</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://lexiox.com&bgcolor=ffffff&color=0d1117&margin=10"
            alt="QR Code"
            width={180}
            height={180}
            className="mx-auto rounded-xl"
          />
          <p className="text-neutral-900 text-sm font-bold">lexiox.com</p>
          <p className="text-neutral-400 text-xs">카메라로 QR을 스캔하면 바로 접속돼요</p>
        </section>

        {/* iPhone 안내 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🍎</span>
            <h2 className="text-sm font-bold text-white">iPhone (Safari)</h2>
          </div>
          <div className="rounded-2xl bg-neutral-900 divide-y divide-neutral-800 overflow-hidden">
            {IOS_STEPS.map((step) => (
              <div key={step.icon} className="flex items-center gap-4 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-bold text-white">
                  {step.icon}
                </span>
                <p className="text-sm text-neutral-200">{step.text}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-neutral-500 px-1">⚠️ 반드시 Safari 앱에서 해주세요. Chrome에서는 안 돼요.</p>
        </section>

        {/* Android 안내 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <h2 className="text-sm font-bold text-white">Android (Chrome)</h2>
          </div>
          <div className="rounded-2xl bg-neutral-900 divide-y divide-neutral-800 overflow-hidden">
            {ANDROID_STEPS.map((step) => (
              <div key={step.icon} className="flex items-center gap-4 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-bold text-white">
                  {step.icon}
                </span>
                <p className="text-sm text-neutral-200">{step.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 로그인 버튼 */}
        <Link
          href="/auth/login"
          className="block w-full rounded-2xl bg-emerald-500 py-4 text-center text-sm font-bold text-white hover:bg-emerald-400 transition-colors"
        >
          로그인하러 가기 →
        </Link>

      </div>
    </main>
  );
}
