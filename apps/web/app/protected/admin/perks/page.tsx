import { getServerSupabase } from '@/lib/supabase/server';
import AdminPerksClient from './AdminPerksClient';

type Redemption = {
  id:           string;
  status:       string;
  points_spent: number;
  requested_at: string;
  resolved_at:  string | null;
  admin_note:   string | null;
  student_id:   string;
  perk:         { name: string; perk_type: string } | null;
};

export const dynamic = 'force-dynamic';

export default async function AdminPerksPage() {
  const supabase = await getServerSupabase();

  const [{ data: catalog }, { data: rawRedemptions }] = await Promise.all([
    supabase
      .from('perk_catalog')
      .select('*')
      .order('point_cost'),
    supabase
      .from('perk_redemptions')
      .select(`
        id, status, points_spent, requested_at, resolved_at, admin_note,
        student_id,
        perk:perk_catalog(name, perk_type)
      `)
      .order('requested_at', { ascending: false })
      .limit(100),
  ]);

  const redemptions: Redemption[] = (rawRedemptions ?? []).map((r: any) => ({
    ...r,
    perk: Array.isArray(r.perk) && r.perk.length > 0 ? r.perk[0] : null,
  }));

  return <AdminPerksClient catalog={catalog ?? []} redemptions={redemptions} />;
}
