import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login?next=/teacher/home');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile as any)?.role;
  if (role === 'student') redirect('/student');

  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
