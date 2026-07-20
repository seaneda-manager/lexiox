'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function AuthBar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription?.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    location.href = '/';
  }

  return (
    <div style={barStyle}>
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <Link href="/" style={logoStyle}>TOEFL</Link>
        <Link href="/teacher/reading">Teacher쨌Reading</Link>
        <Link href="/teacher/listening">Teacher쨌Listening</Link>
        <Link href="/dev/sets">Sets</Link>
      </div>
      <div>
        {email ? (
          <span>
            {email} &nbsp;|&nbsp; <button onClick={logout}>Logout</button>
          </span>
        ) : (
          <span>
            <Link href="/auth/login">Login</Link> &nbsp;|&nbsp; <Link href="/auth/signup">Sign up</Link>
          </span>
        )}
      </div>
    </div>
  );
}

const barStyle: React.CSSProperties = {
  display:'flex', justifyContent:'space-between', alignItems:'center',
  padding:'10px 14px', background:'#fff', borderBottom:'1px solid #e5e7eb',
  position:'sticky', top:0, zIndex:1000
};

const logoStyle: React.CSSProperties = {
  fontWeight:700, textDecoration:'none'
};





