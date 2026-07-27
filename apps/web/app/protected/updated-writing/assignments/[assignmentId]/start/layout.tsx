import { ReactNode } from 'react';

// Fullscreen test: hide sidebar, remove main padding
// Topbar already rendered by protected layout, just override content area
export default function WritingTestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 min-h-0">
      <main className="min-h-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
