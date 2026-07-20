// normalized utf8
'use client';

import { useEffect } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // ??吏꾩엯 ???占쏀뙣 ???占쎌쟾??(議곗슜??
  useEffect(() => {
    import('@/lib/sessionClient').then((m) => m.flushPendingSilently?.());
  }, []);

  return <>{children}</>;
}




