'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/** 로그인한 사용자의 페이지 이동을 user_activity_log에 기록한다. (실패해도 UI에 영향 없음) */
export default function ActivityTracker() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || last.current === pathname) return;
    last.current = pathname;
    fetch('/api/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'page_view', path: pathname }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
