/* apps/web/app/auth/signup/page.tsx */
import { redirect } from 'next/navigation';
import { signUp } from '@/actions/auth';
import type { ActionState } from '@/actions/auth';

export const dynamic = 'force-dynamic';

type Role = 'student' | 'teacher' | 'admin';

function normalizeRole(raw: FormDataEntryValue | null): Role {
  const r = String(raw ?? '').toLowerCase();
  return (['student', 'teacher', 'admin'] as Role[]).includes(r as Role)
    ? (r as Role)
    : 'student';
}

export default function SignUpPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  async function signupAction(formData: FormData) {
    'use server';

    // role???덉쟾?섍쾶 蹂댁젙?댁꽌 ?꾨떖
    const role = normalizeRole(formData.get('role'));
    formData.set('role', role);

    const r = await signUp(formData);

    // ????긽 ActionState濡?留ㅽ븨
    const mapped: ActionState = r.ok
      ? { ok: true, error: null }
      : { ok: false, error: r.error ?? 'Unknown error' };

    const email = String(formData.get('email') ?? '');

    if (mapped.ok) {
      // 媛???깃났 ??濡쒓렇???섏씠吏濡? ?대찓???꾨━??+ ?깃났 ?좎뒪?몄슜 荑쇰━
      redirect(`/auth/login?signup=success${email ? `&email=${encodeURIComponent(email)}` : ''}`);
    }

    // ?ㅽ뙣 ???먮윭 硫붿떆吏瑜?荑쇰━濡??꾨떖
    redirect(`/auth/signup?error=${encodeURIComponent(mapped.error ?? 'Unknown error')}${email ? `&email=${encodeURIComponent(email)}` : ''}`);
  }

  // 荑쇰━?먯꽌 湲곕낯媛??ㅻ쪟 ?쎄린
  const q = (k: string) => {
    const v = searchParams?.[k];
    return Array.isArray(v) ? v[0] : v ?? '';
  };
  const presetEmail = q('email');
  const errorMsg = q('error');

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <h1 className="text-2xl font-semibold mb-6">Create Account</h1>

      {errorMsg ? (
        <p className="mb-4 text-sm text-red-600">{errorMsg}</p>
      ) : null}

      <form action={signupAction} className="space-y-5">
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            name="email"
            type="email"
            required
            defaultValue={presetEmail}
            className="mt-1 w-full rounded border px-3 py-2 bg-transparent"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 w-full rounded border px-3 py-2 bg-transparent"
            autoComplete="new-password"
          />
        </div>

        {/* ??븷 ?좏깮 (user_metadata.role 濡???λ맖) */}
        <fieldset>
          <legend className="block text-sm font-medium mb-2">Role</legend>
          <div className="flex items-center gap-5 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="student" defaultChecked />
              <span>Student</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="teacher" />
              <span>Teacher</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="role" value="admin" />
              <span>Admin</span>
            </label>
          </div>
        </fieldset>

        <button type="submit" className="rounded px-4 py-2 border w-full">
          Create Account
        </button>
      </form>
    </main>
  );
}




