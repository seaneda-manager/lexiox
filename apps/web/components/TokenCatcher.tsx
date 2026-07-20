// apps/web/app/components/TokenCatcher.tsx
'use client';

import { useEffect } from 'react';

export default function TokenCatcher() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loc = window.location;
    const path = loc.pathname;
    // ?대? 泥섎━ ?섏씠吏硫??⑥뒪
    if (path === '/auth/reset-finish' || path === '/auth/callback') return;

    const search = loc.search ?? '';
    const hash = loc.hash ?? '';
    const qs = new URLSearchParams(search);

    // ???ㅼ쭅 "鍮꾨?踰덊샇 ?ъ꽕??recovery)"留?罹먯튂
    const hasHashRecovery =
      hash.includes('type=recovery') &&
      (hash.includes('access_token=') || hash.includes('refresh_token='));

    const hasQsRecovery = qs.get('type') === 'recovery' && !!qs.get('token_hash');

    if (hasHashRecovery || hasQsRecovery) {
      const target = new URL('/auth/reset-finish', loc.origin);
      if (hasHashRecovery) target.hash = hash;              // ?댁떆 ?꾨떖
      if (hasQsRecovery) target.search = qs.toString();     // 荑쇰━ ?꾨떖
      window.location.replace(target.toString());
    }
  }, []);

  return null;
}





