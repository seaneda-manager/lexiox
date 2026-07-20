'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

const STORAGE_KEY = 'lexiox-install-banner-dismissed';

export default function PWAInstallBanner() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const isIOS = typeof navigator !== 'undefined' &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isInStandaloneMode = typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true);

  useEffect(() => {
    // 이미 설치됐거나 닫은 적 있으면 안 보임
    if (isInStandaloneMode) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Android: beforeinstallprompt 이벤트 캐치
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler as EventListener);

    // iOS: Safari인지 확인 후 표시
    if (isIOS) {
      const isSafari = /safari/i.test(navigator.userAgent) &&
        !/chrome|crios|fxios/i.test(navigator.userAgent);
      if (isSafari) setShow(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler as EventListener);
  }, [isIOS, isInStandaloneMode]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') dismiss();
    }
  };

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-2xl p-4 flex items-start gap-3">
        <Image
          src="/icons/app-icon-source.png"
          alt="LEXiOX"
          width={48}
          height={48}
          className="rounded-xl shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900">앱으로 설치하기</p>
          {isIOS ? (
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              공유(□↑) → <span className="font-semibold">홈 화면에 추가</span>
            </p>
          ) : (
            <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
              홈 화면에 추가하면 앱처럼 바로 실행돼요
            </p>
          )}
          <div className="flex gap-2 mt-2">
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstall}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                설치하기
              </button>
            )}
            <button
              onClick={dismiss}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50"
            >
              나중에
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="text-neutral-300 hover:text-neutral-500 shrink-0 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
