/* 풀: apps/web/components/NavBar.tsx */
import Link from 'next/link';
import { getSession, signOut } from '@/actions/auth';

export const dynamic = 'force-dynamic';

export default async function NavBar() {
  const session = await getSession();

  async function signOutAction() {
    'use server';
    await signOut();
  }

  return (
    <nav className="w-full border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">TOEFL Project</Link>
          <Link href="/reading" className="text-sm">Reading</Link>
          <Link href="/listening" className="text-sm">Listening</Link>
        </div>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <span className="text-sm opacity-80">{session.user?.email}</span>
              <form action={signOutAction}>
                <button type="submit" className="rounded border px-3 py-1 text-sm">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="text-sm">Log in</Link>
              <Link href="/auth/signup" className="text-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}





