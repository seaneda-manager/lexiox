'use client'
import { useEffect, useState } from 'react'


export default function StickyTimer({
seconds = 120,
onEnd,
}: {
seconds?: number
onEnd?: () => void
}) {
const [left, setLeft] = useState(seconds)


useEffect(() => {
if (left <= 0) {
onEnd?.()
return
}
const t = window.setInterval(() => setLeft((s) => s - 1), 1000)
return () => window.clearInterval(t)
}, [left, onEnd])


return (
<div className="fixed top-4 right-4 rounded-full border px-3 py-1 shadow-sm bg-white/80 backdrop-blur">
{Math.max(0, left)}s
</div>
)
}




