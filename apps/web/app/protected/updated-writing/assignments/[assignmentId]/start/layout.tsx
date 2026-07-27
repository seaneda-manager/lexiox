import { ReactNode } from 'react';
import TopbarClient from '@/components/dashboard/TopbarClient';

export default function WritingTestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden grid grid-rows-[auto_1fr] bg-neutral-50 text-neutral-900">
      <div>
        <TopbarClient email="" role="student" />
      </div>
      <main className="min-h-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
