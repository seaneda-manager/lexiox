'use client';

import React, { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';

type AuthGateProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export default function AuthGate({ children, fallback = null }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setSession(null);
      } finally {
        if (mounted) setReady(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) return null;
  if (!session) return <>{fallback}</>;

  return <>{children}</>;
}