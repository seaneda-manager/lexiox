'use client';

import { useMemo, useState, FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';

type Props = { presetEmail?: string };

function LoginForm({ presetEmail }: Props) {
  const [email, setEmail] = useState<string>(() => presetEmail ?? '');
  const [password, setPassword] = useState<string>('');
  const [remember, setRemember] = useState<boolean>(() => Boolean(presetEmail));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await new Promise((r) => setTimeout(r, 400)); // TODO: 실제 로그인 연결
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.length >= 4 && !busy,
    [email, password, busy]
  );

  return (
    <div className="mx-auto max-w-sm rounded-xl border bg-white p-6">
      <h1 className="mb-4 text-xl font-semibold">Sign in</h1>
      <form onSubmit={onSubmit} aria-busy={busy}>
        <div className="mb-3">
          <label htmlFor="email" className="mb-1 block text-sm text-neutral-700">Email</label>
          <input id="email" type="email" autoComplete="email"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={email} onChange={(e) => setEmail(e.currentTarget.value)}
            required inputMode="email" />
        </div>

        <div className="mb-3">
          <label htmlFor="password" className="mb-1 block text-sm text-neutral-700">Password</label>
          <input id="password" type="password" autoComplete="current-password"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={password} onChange={(e) => setPassword(e.currentTarget.value)}
            required minLength={4} />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input id="remember" type="checkbox" className="h-4 w-4"
            checked={remember} onChange={(e) => setRemember(e.currentTarget.checked)} />
          <label htmlFor="remember" className="select-none text-sm text-neutral-700">Remember me</label>
        </div>

        {error && (
          <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button type="submit"
          className="w-full rounded-lg border px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
          disabled={!canSubmit}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export function LoginContent() {
  const sp = useSearchParams();
  const presetEmail = sp.get('email') ?? undefined;
  const formKey = useMemo(() => `login-${presetEmail ?? ''}`, [presetEmail]);
  return <LoginForm key={formKey} presetEmail={presetEmail} />;
}
