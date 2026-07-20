'use client'
import { useEffect, useRef } from 'react'

type Props = { src: string; disabled?: boolean; onConsumed?: () => void; onEnded?: () => void }
export default function OneShotAudio({ src, disabled, onConsumed, onEnded }: Props) {
  const ref = useRef<HTMLAudioElement|null>(null)
  const play = async () => {
    if (disabled || !src) return
    try {
      await onConsumed?.() // ?쒕쾭 consume 留덊궧(?좏깮)
      await ref.current?.play()
    } catch {}
  }
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const h = () => onEnded?.()
    el.addEventListener('ended', h)
    return () => el.removeEventListener('ended', h)
  }, [onEnded])
  return (
    <div className="flex items-center gap-3">
      <button onClick={play} disabled={disabled || !src} className="rounded-2xl px-4 py-2 border shadow-sm disabled:opacity-50">
        {disabled ? '?ъ깮 ?꾨즺' : '?ъ깮 ?쒖옉'}
      </button>
      <audio ref={ref} src={src} preload="auto" />
    </div>
  )
}





