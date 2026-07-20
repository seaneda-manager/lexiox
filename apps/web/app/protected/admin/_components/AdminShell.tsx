// apps/web/app/(protected)/admin/_components/AdminShell.tsx
'use client';
import type { ReactNode } from 'react';

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <main className="p-4 max-w-6xl w-full mx-auto">
      {children}
    </main>
  );
}




