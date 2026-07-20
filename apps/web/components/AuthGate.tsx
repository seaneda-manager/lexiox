'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
// import { createClient } from '@/lib/supabaseClient'; // ?ㅼ젣 寃쎈줈濡?
// const supabase = createClient();

type AuthGateProps = {
  children: ReactNode;
  fallback?: ReactNode; // 濡쒓렇???꾩슂 ??蹂댁뿬以?UI
};

export default function AuthGate({ children, fallback = null }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    // ?덉떆: ?꾩옱 ?몄뀡 媛?몄삤湲?
    (async () => {
      try {
        // const { data } = await supabase.auth.getSession();
        // if (!mounted) return;
        // setSession(data.session ?? null);
        // ?꾩떆: ????뺤씤???붾?
        setSession(null);
      } finally {
        if (mounted) setReady(true);
      }
    })();

    // ?몄뀡 蹂寃?援щ룆 (?뺥깭 ?덉떆)
    // const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
    //   if (mounted) setSession(sess);
    // });

    return () => {
      mounted = false;
      // sub?.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return null; // 濡쒕뵫 ?곹깭 泥섎━(?꾩슂 ???ㅽ뵾??
  if (!session) return <>{fallback}</>;

  return <>{children}</>;
}




