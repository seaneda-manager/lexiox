// apps/web/app/auth/signup-teacher/page.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUpTeacher } from '@/actions/auth';

export default function SignupTeacherPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mx-auto max-w-md space-y-6 px-6 py-10">
      <h1 className="text-2xl font-semibold">Teacher Sign Up</h1>

      {/* Use server action; manage pending state locally */}
      <form
        action={async (formData) => {
          setSubmitting(true);
          try {
            await signUpTeacher(formData); // server action handles redirect if any
          } finally {
            setSubmitting(false);
          }
        }}
        className="space-y-4"
        noValidate
      >
        <div>
          <label htmlFor="email" className="mb-1 block text-sm">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-lg border px-3 py-2"
            placeholder="At least 6 characters"
            autoComplete="new-password"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-60"
          aria-busy={submitting}
          title={submitting ? 'Creating…' : 'Create teacher account'}
        >
          {submitting ? 'Creating…' : 'Create teacher account'}
        </button>
      </form>

      <p className="text-sm">
        Already have an account?{' '}
        <Link className="underline" href={`/auth/login?email=${encodeURIComponent(email)}`}>
          Log in
        </Link>
      </p>
    </div>
  );
}
