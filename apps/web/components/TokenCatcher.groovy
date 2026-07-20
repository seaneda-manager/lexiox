// apps/web/app/components/TokenCatcher.tsx
'use client';

import { useEffect } from 'react';

export default function TokenCatcher() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loc = window.location;
    const path = loc.pathname;
    // 이미 처리 페이지면 패스
    if (path === '/auth/reset-finish' || path === '/auth/callback') return;

    const search = loc.search ?? '';
    const hash = loc.hash ?? '';
    const qs = new URLSearchParams(search);

    // 1) 해시 토큰(#access_token … & type=recovery)
    const hasHashRecovery =
      hash.includes('type=recovery') &&
      (hash.includes('access_token=') || hash.includes('refresh_token='));

    // 2) 쿼리 토큰(?token_hash=…&type=recovery)
    const hasQsRecovery = qs.get('type') === 'recovery' && !!qs.get('token_hash');

    // 3) 코드 교환(?code=…)
    const hasCode = !!qs.get('code');

    if (hasHashRecovery || hasQsRecovery || hasCode) {
      const target = new URL('/auth/reset-finish', loc.origin);
      // 전달 형태 유지해서 넘겨주기
      if (hasHashRecovery) target.hash = hash;
      if (hasQsRecovery || hasCode) target.search = qs.toString();
      window.location.replace(target.toString());
    }
  }, []);

  return null;
}
