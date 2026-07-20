// apps/web/app/student/layout.tsx
import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer(); // ??await

  const { data: { user }, error: uerr } = await supabase.auth.getUser();
  if (uerr) redirect('/auth/login');
  if (!user) redirect('/auth/login');

  // ?꾨줈?꾩뿉??role ?곗꽑, ?놁쑝硫?user_metadata.role ?ъ슜
  const { data: prof } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle<{ role: 'student' | 'teacher' | 'admin' }>();

  const role = (prof?.role ?? (user.user_metadata?.role as string | undefined)) || 'student';

  // ?숈깮 ?꾩슜 ?덉씠?꾩썐: 援먯궗/愿由ъ옄???ㅻⅨ ??쒕낫?쒕줈 蹂대깂
  if (role === 'teacher' || role === 'admin') {
    redirect('/teacher/dashboard'); // ?꾩슂?섎㈃ admin? '/admin'?쇰줈 遺꾧린
  }

  return <>{children}</>;
}




