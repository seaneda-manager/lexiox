// normalized utf8
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../supabaseClient' // <-- 寃쎈줈 ?占쎌젙: ???占쎄퀎 ?占쎈줈 ?占쎈씪媛??supabaseClient
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'

export function useRequireAuth(redirect = '/auth/login') {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    async function check() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
      setLoading(false)
      if (!data.session) router.replace(redirect)
    }

    check()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, sess: Session | null) => {
        if (!mounted) return
        setSession(sess)
        if (!sess) router.replace(redirect)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [redirect, router])

  return { loading, session, user: session?.user ?? null }
}





