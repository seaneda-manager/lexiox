// apps/web/app/auth/forgot-password/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErr('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const origin =
        process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

      // Send reset link email; clicking it will go to /auth/update-password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/update-password`,
      });
      if (error) throw error;

      setMsg('Password reset email sent. Please check your inbox.');
      setEmail('');
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Reset Password</h1>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="w-full rounded-md border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md border px-3 py-2 disabled:opacity-50"
          aria-busy={loading}
          title={loading ? 'Sending…' : 'Send reset link'}
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>

        {msg && (
          <p className="text-sm text-green-600" role="status" aria-live="polite">
            {msg}
          </p>
        )}
        {err && (
          <p className="text-sm text-red-600" role="alert" aria-live="assertive">
            {err}
          </p>
        )}
      </form>
    </main>
  );
}
