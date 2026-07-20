// apps/web/app/(learn)/learn/toefl/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { getSupabaseServer } from '@/lib/supabaseServer'

export default async function DashboardPage() {
  const supabase = getSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/auth/login?next=/learn/toefl/dashboard')

  // ... 인증된 사용자용 UI ...
}
