'use client'
import { useEffect } from 'react'
export default function MixpanelShim() {
  useEffect(() => {
    if (!('mixpanel' in window)) {
      // @ts-ignore
      window.mixpanel = { init(){}, track(){}, identify(){}, people:{ set(){} } }
      console.info('[shim] mixpanel no-op ready')
    }
  }, [])
  return null
}





