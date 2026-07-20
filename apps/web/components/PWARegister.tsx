'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW 등록 실패는 무시 (기능 저하 없음)
      });
    }
  }, []);

  return null;
}
