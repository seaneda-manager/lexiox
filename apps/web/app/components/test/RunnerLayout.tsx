'use client'
import type { ReactNode } from 'react'


export default function RunnerLayout({
header,
left,
right,
footer,
}: {
header: ReactNode
left?: ReactNode
right?: ReactNode
footer?: ReactNode
}) {
return (
<div className="min-h-screen flex flex-col">
<header className="sticky top-0 z-20 bg-white border-b">{header}</header>
<main className="flex-1 grid grid-cols-2 gap-4 p-4">{left}{right}</main>
<footer className="border-t p-4 flex justify-between">{footer}</footer>
</div>
)
}




