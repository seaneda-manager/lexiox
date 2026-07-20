import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import PerksShopClient from './PerksShopClient';

export const dynamic = 'force-dynamic';

export default async function StudentPerksPage() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: catalog }, { data: gami }, { data: myRedemptions }] = await Promise.all([
    supabase
      .from('perk_catalog')
      .select('id, perk_type, name, description, point_cost, image_url, metadata, stock')
      .eq('is_active', true)
      .order('point_cost'),
    supabase
      .from('student_gamification')
      .select('total_points, level')
      .eq('student_id', user.id)
      .maybeSingle(),
    supabase
      .from('perk_redemptions')
      .select('perk_id, status, requested_at')
      .eq('student_id', user.id)
      .in('status', ['pending', 'approved', 'fulfilled'])
      .order('requested_at', { ascending: false }),
  ]);

  return (
    <PerksShopClient
      catalog={catalog ?? []}
      totalPoints={gami?.total_points ?? 0}
      level={gami?.level ?? 1}
      myRedemptions={myRedemptions ?? []}
    />
  );
}
